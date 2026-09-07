#!/usr/bin/env node
'use strict'

// Tier 2 discovery: find opportunity sources the curated list is missing,
// verify each one, and publish or reject it in `opportunity-sources` with
// no human step. Approved sources are picked up by the weekly scraper
// (scrapeOpportunities.js) on its next run like any curated source.
//
// Per query template:
//   1. Grounded search (googleSearch). A response with no grounding
//      metadata is discarded -- the model answered from memory.
//   2. Evidence list from groundingSupports: each supported sentence
//      paired with the chunk indices that back it.
//   3. Structuring call picks candidates by chunk INDEX, never by typing a
//      URL, and code checks the chosen chunk is cited by a sentence that
//      names the program.
//   4. Redirect links resolved to the real destination, deduped against
//      every known source (curated file + Firestore), capped per query.
//   5. Fresh-context verifier loads the real page (Playwright) and judges
//      name match, legitimacy, audience and STEM focus. It also reports
//      the program's official homepage when the fetched page is a news
//      article about it, so the stored source URL is the program itself.
//
// Dry run by default. --execute writes. --offline skips Firestore and
// dedups against scripts/data/opportunity-sources.json only.

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { chromium } = require('playwright')
const {
  GoogleGenAI,
  FunctionCallingConfigMode,
} = require('@google/genai')
const {
  BROWSER_LAUNCH_OPTIONS,
  fetchPage,
} = require('./lib/opportunityPage')
const {
  CandidatesSchema,
  REJECT_REASONS,
  VerdictSchema,
  buildEvidence,
  chunkSupportsName,
  isRetryableReject,
  normalizeUrl,
  resolveFinalUrl,
  uniqueSlug,
} = require('./lib/opportunityDiscovery')

const OPPORTUNITY_SOURCES_COLLECTION = 'opportunity-sources'
const MODEL = 'gemini-3.7-flash'
const DEFAULT_VERTEX_LOCATION = 'global'
const MAX_OUTPUT_TOKENS = 8192
const MAX_VERIFY_TURNS = 4
const DEFAULT_MAX_PER_QUERY = 8
const PAGE_BODY_CHARS = 6000

const REPO_ROOT = path.resolve(__dirname, '..')
const SOURCES_DATA_FILE = path.join(
  __dirname,
  'data',
  'opportunity-sources.json'
)
const QUERIES_DATA_FILE = path.join(
  __dirname,
  'data',
  'opportunity-discovery-queries.json'
)

function parseArgs(argv) {
  const args = {
    execute: false,
    offline: false,
    project: undefined,
    maxPerQuery: DEFAULT_MAX_PER_QUERY,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--execute') {
      args.execute = true
    } else if (arg === '--offline') {
      args.offline = true
    } else if (arg === '--project') {
      args.project = argv[++i]
    } else if (arg === '--max-per-query') {
      args.maxPerQuery = Number(argv[++i])
      if (
        !Number.isInteger(args.maxPerQuery) ||
        args.maxPerQuery < 1
      ) {
        throw new Error(
          '--max-per-query must be a positive integer'
        )
      }
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  if (args.execute && args.offline) {
    throw new Error(
      '--offline cannot write: drop --execute or --offline.'
    )
  }
  return args
}

function loadEnvLocalWithoutDotenv(repoRoot) {
  const envPath = path.join(repoRoot, '.env.local')
  if (!fs.existsSync(envPath)) return
  const contents = fs.readFileSync(envPath, 'utf8')
  for (const rawLine of contents.split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    if (quoted) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}

function applicationDefaultCredential(admin) {
  const adcEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const adcDefaultPath = path.join(
    os.homedir(),
    '.config',
    'gcloud',
    'application_default_credentials.json'
  )
  if (
    (adcEnv && fs.existsSync(adcEnv)) ||
    fs.existsSync(adcDefaultPath)
  ) {
    return admin.credential.applicationDefault()
  }
  return null
}

function staticAccessTokenCredential() {
  const token = process.env.GCLOUD_ACCESS_TOKEN
  if (!token) return null
  console.log(
    'No Application Default Credentials found -- using the static GCLOUD_ACCESS_TOKEN env var.'
  )
  return {
    getAccessToken: async () => ({
      access_token: token,
      expires_in: 3600,
    }),
  }
}

function gcloudCliLoginCredential() {
  try {
    execFileSync('gcloud', ['--version'], { stdio: 'pipe' })
  } catch {
    throw new Error(
      'No Application Default Credentials found, and the gcloud CLI is not on PATH.\n' +
        'Run `gcloud auth application-default login`, set GOOGLE_APPLICATION_CREDENTIALS ' +
        'to a service account key, set GCLOUD_ACCESS_TOKEN to a pre-fetched token, or ' +
        'install the gcloud CLI and run `gcloud auth login`. For a local dry run with no ' +
        'GCP access, pass --offline.'
    )
  }
  console.log(
    'No Application Default Credentials found -- falling back to `gcloud auth print-access-token`.'
  )
  return {
    getAccessToken: async () => {
      const token = execFileSync(
        'gcloud',
        ['auth', 'print-access-token'],
        { stdio: ['ignore', 'pipe', 'pipe'] }
      )
        .toString()
        .trim()
      return { access_token: token, expires_in: 3600 }
    },
  }
}

function resolveCredential(admin) {
  return (
    applicationDefaultCredential(admin) ||
    staticAccessTokenCredential() ||
    gcloudCliLoginCredential()
  )
}

function usingFirestoreEmulator() {
  return Boolean(process.env.FIRESTORE_EMULATOR_HOST)
}

// Production runs bill through Vertex AI on the project's GCP account,
// like the weekly scraper. GEMINI_API_KEY (Gemini Developer API) is only
// honoured for dry runs and emulator runs, so the pipeline can be
// exercised locally without GCP access but never writes to production
// on a personal key.
function createGenAI(args, projectId) {
  if (
    process.env.GEMINI_API_KEY &&
    (!args.execute || usingFirestoreEmulator())
  ) {
    console.log(
      'Using GEMINI_API_KEY (Gemini Developer API); production --execute runs use Vertex AI.'
    )
    return new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    })
  }
  if (!projectId) {
    throw new Error(
      'No project id: pass --project <id> or set NEXT_PUBLIC_FB_PROJECT_ID (e.g. via .env.local).'
    )
  }
  return new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || projectId,
    location:
      process.env.GOOGLE_CLOUD_LOCATION ||
      DEFAULT_VERTEX_LOCATION,
  })
}

function loadQueryTemplates() {
  const templates = JSON.parse(
    fs.readFileSync(QUERIES_DATA_FILE, 'utf8')
  )
  if (!Array.isArray(templates) || templates.length === 0) {
    throw new Error(
      `No queries found in ${QUERIES_DATA_FILE}`
    )
  }
  for (const template of templates) {
    if (!template.category || !template.query) {
      throw new Error(
        `Query template is missing category or query: ${JSON.stringify(
          template
        )}`
      )
    }
  }
  return templates
}

// Reserve all document IDs, but do not globally exclude sources whose
// previous rejection only established a fetch failure or name mismatch.
async function loadKnownSources(db) {
  const known = {
    urls: new Set(),
    labels: [],
    slugs: new Set(),
  }
  const curated = JSON.parse(
    fs.readFileSync(SOURCES_DATA_FILE, 'utf8')
  )
  for (const source of curated) {
    known.urls.add(normalizeUrl(source.url))
    known.labels.push(source.label)
    known.slugs.add(source.slug)
  }
  if (db) {
    const snapshot = await db
      .collection(OPPORTUNITY_SOURCES_COLLECTION)
      .get()
    for (const doc of snapshot.docs) {
      const data = doc.data()
      known.slugs.add(doc.id)
      if (
        isRetryableReject({
          verdict:
            data.status === 'rejected'
              ? 'reject'
              : 'publish',
          rejectReason: data.rejectReason,
        })
      ) {
        continue
      }
      if (data.url) known.urls.add(normalizeUrl(data.url))
      if (
        data.label &&
        !known.labels.includes(data.label)
      ) {
        known.labels.push(data.label)
      }
    }
  }
  return known
}

const FETCH_TOOL = {
  name: 'fetch_page',
  description:
    'Fetch a webpage with a real, JavaScript-rendering browser. Returns its title, compact Markdown, and a list of links (url + visible text). Use it to inspect the candidate page and, if that page is an article about the program rather than the program itself, to follow a link to the official program page.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'Absolute URL to fetch',
      },
    },
    required: ['url'],
  },
}

const SUBMIT_CANDIDATES_TOOL = {
  name: 'submit_candidates',
  description:
    'Submit the new candidate programs supported by the evidence list. Each candidate must cite one source by its chunk index.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      candidates: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: {
              type: 'string',
              description:
                'Official program name exactly as it appears in the evidence text',
            },
            sourceChunkIndex: {
              type: 'integer',
              description:
                'Index (the number after C) of the source chunk attached to an evidence snippet that explicitly names this program',
            },
            evidence: {
              type: 'string',
              description:
                'The evidence snippet, quoted verbatim, that names the program and is backed by sourceChunkIndex',
            },
            category: {
              type: 'string',
              description:
                'Short category label, e.g. "financial", "research", "regional"',
            },
          },
          required: [
            'name',
            'sourceChunkIndex',
            'evidence',
            'category',
          ],
        },
      },
    },
    required: ['candidates'],
  },
}

const SUBMIT_VERDICT_TOOL = {
  name: 'submit_verdict',
  description:
    'Submit your final verdict on this candidate program.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      verdict: {
        type: 'string',
        enum: ['publish', 'reject'],
      },
      // A plain string enum, like the scraper's deadlineStatus: Gemini's
      // schema validation has only accepted string enum members, so
      // "none" stands in for null and is mapped back in code.
      rejectReason: {
        type: 'string',
        enum: [...REJECT_REASONS, 'none'],
        description:
          '"none" when publishing. When rejecting, the single best-fitting reason: not_this_program (page is about a different program), page_inaccessible (could not load, blocked, 404, WAF/captcha), insufficient_content (page loads but says nothing usable), defunct, not_high_school, not_legitimate, not_stem.',
      },
      reasoning: {
        type: 'string',
        description:
          '1-3 sentences: your criterion 0 finding, then the legitimacy and STEM judgement',
      },
      redFlags: {
        type: 'array',
        items: { type: 'string' },
      },
      officialUrl: {
        type: ['string', 'null'],
        description:
          "The program's own official page (homepage or main program page) if you found one that is clearly for this exact program -- either the fetched URL itself, or a link you followed from it. null if you could not confirm one.",
      },
    },
    required: [
      'verdict',
      'rejectReason',
      'reasoning',
      'redFlags',
      'officialUrl',
    ],
  },
}

function buildSearchPrompt(query) {
  return `${query}

List specific, individual programs by their official names, one per
sentence, with the host institution and what the program is. Do not
list aggregator articles, rankings, or "top 10" pages as programs.

You must use your search tool to look up current, real information
before answering -- do not answer from your own memory alone, since
program availability, deadlines, and even whether a program still
exists change every year and your training data may be stale.`
}

function buildStructuringPrompt(
  summary,
  evidence,
  knownLabels
) {
  return `Below is a grounded summary, the evidence snippets it was built
from, and the source chunks each snippet cites. Extract new candidate
programs for a U.S. high school STEM opportunities site.

Rules:
- Each candidate must cite exactly one sourceChunkIndex, and that chunk
  must be attached to an evidence snippet that explicitly names the
  program. Copy that snippet into "evidence" verbatim.
- Never pair a program name with a chunk cited only by snippets about a
  different program, even at the same institution.
- Skip aggregator articles, rankings, news roundups, and anything that
  is a list of programs rather than a program.
- Skip anything in the already-known list below.
- If unsure which chunk backs a name, omit the candidate.

Summary:
${summary}

Evidence snippets:
${evidence.evidenceLines.join('\n')}

Source chunks:
${evidence.chunkLines.join('\n')}

Already known program labels (do not repeat):
${knownLabels.join('; ')}`
}

function buildVerifyPrompt(candidate, today) {
  return `Today's date is ${today}.

Evaluate this candidate program for a U.S. high school STEM
opportunities website:
Name: ${candidate.name}
URL: ${candidate.url}
Category: ${candidate.category}
Evidence it was found from: "${candidate.evidence}"

Criterion 0, before anything else, is mandatory and overrides every
other criterion: does the fetched page content clearly and specifically
describe THIS EXACT program, "${candidate.name}" -- not a different,
even if related, program at the same institution? Check this explicitly
and state your finding in your reasoning. If the page describes a
different program than the name above, you MUST reject with a
name/content mismatch red flag, even if the program you actually found
is itself perfectly legitimate.

If the URL is a news article or press release ABOUT the program rather
than the program's own page, that is acceptable for criterion 0 as long
as it is clearly about this exact program. In that case, look for a
link from the article to the program's own page and fetch it; report
that page as officialUrl. If the fetched URL already is the program's
own page, report it as officialUrl. Report null only if you could not
confirm an official page.

Only after confirming criterion 0, judge (do NOT reject just because
the current application cycle happens to be closed right now; a real
recurring program between cycles is exactly as legitimate as one
accepting applications this week, and the site already re-checks and
re-buckets deadlines automatically once a program is published):
1. Currently operating (not defunct/archived/permanently discontinued)
2. Open to U.S. high school students
3. Legitimate: real institutional backing, no scam/pay-to-play patterns
4. Has real extractable content (name, description, some eligibility
   info findable)
5. STEM-focused: the program's core content is science, technology,
   engineering, mathematics, medicine/health science, or computing.
   General career readiness, leadership, college-prep, writing, or
   other non-STEM programs must be rejected even when legitimate.

Set rejectReason to "none" when publishing. When rejecting, set it to
the single best fit. Use
page_inaccessible when the page could not be loaded or was blocked
(404, WAF, captcha, timeout), insufficient_content when it loaded
but said nothing usable, and not_this_program for a name/content
mismatch. Those candidates can return in a later run. Other rejection
reasons describe the program itself and are final.

The initial candidate page appears below. Use fetch_page for additional
pages as needed, then call submit_verdict. Report an officialUrl only
after a successful fetch of that page during this verification.`
}

async function discoverCandidates(
  genai,
  template,
  known,
  seenUrls,
  maxPerQuery
) {
  console.log(
    `\n[search] (${template.category}) "${template.query}"`
  )
  const searchResponse = await genai.models.generateContent(
    {
      model: MODEL,
      contents: buildSearchPrompt(template.query),
      config: {
        tools: [{ googleSearch: {} }],
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    }
  )
  const evidence = buildEvidence(
    searchResponse.candidates?.[0]?.groundingMetadata
  )
  console.log(
    `  grounded on ${evidence.chunks.length} chunk(s), ${evidence.evidenceLines.length} supported segment(s)`
  )
  if (evidence.chunks.length === 0) {
    console.log(
      '  [gate] no real search occurred -- discarding this query'
    )
    return []
  }

  const structureResponse =
    await genai.models.generateContent({
      model: MODEL,
      contents: buildStructuringPrompt(
        searchResponse.text || '',
        evidence,
        known.labels
      ),
      config: {
        tools: [
          {
            functionDeclarations: [SUBMIT_CANDIDATES_TOOL],
          },
        ],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.ANY,
            allowedFunctionNames: ['submit_candidates'],
          },
        },
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    })
  const call = (structureResponse.functionCalls || [])[0]
  const parsed = CandidatesSchema.safeParse(
    call?.args || {}
  )
  if (!parsed.success) {
    console.log(
      `  [drop] structuring output failed validation: ${JSON.stringify(
        parsed.error.issues.slice(0, 3)
      )}`
    )
    return []
  }
  const proposed = parsed.data.candidates
  console.log(
    `  model proposed ${proposed.length} candidate(s)`
  )

  const kept = []
  for (const proposal of proposed) {
    if (kept.length >= maxPerQuery) {
      console.log(
        `  [cap] ${maxPerQuery} candidates reached for this query`
      )
      break
    }
    const chunk = evidence.chunks[proposal.sourceChunkIndex]
    if (!chunk?.web?.uri) {
      console.log(
        `  [drop] "${proposal.name}": chunk index ${proposal.sourceChunkIndex} does not exist`
      )
      continue
    }
    const supportTexts =
      evidence.supportsByChunk.get(
        proposal.sourceChunkIndex
      ) || []
    if (!chunkSupportsName(supportTexts, proposal.name)) {
      console.log(
        `  [drop] "${proposal.name}": chunk C${proposal.sourceChunkIndex} is not cited by any snippet naming it`
      )
      continue
    }
    const resolved = await resolveFinalUrl(chunk.web.uri)
    if (!resolved.ok) {
      console.log(
        `  [drop] "${
          proposal.name
        }": could not resolve source (${
          resolved.error || `HTTP ${resolved.status}`
        })`
      )
      continue
    }
    const key = normalizeUrl(resolved.url)
    if (known.urls.has(key)) {
      console.log(
        `  [dup] "${proposal.name}" is already a source (${key})`
      )
      continue
    }
    if (seenUrls.has(key)) {
      console.log(
        `  [dup] "${proposal.name}" already found this run (${key})`
      )
      continue
    }
    seenUrls.add(key)
    kept.push({
      name: proposal.name,
      category: proposal.category,
      evidence: proposal.evidence,
      url: resolved.url,
      query: template.query,
      queryCategory: template.category,
    })
  }
  return kept
}

async function verifyCandidate(
  browser,
  genai,
  candidate,
  { fetchPage: fetch = fetchPage } = {}
) {
  const today = new Date().toISOString().slice(0, 10)
  const successfulFetches = []
  async function fetchEvidence(url) {
    let result
    try {
      result = await fetch(browser, url)
    } catch (err) {
      return {
        ok: false,
        error: String(err.message || err),
      }
    }
    if (!result.ok) return result
    const finalUrl = httpsUrlOrNull(result.finalUrl)
    if (!finalUrl) {
      return {
        ok: false,
        error: 'The final page URL must use HTTPS.',
      }
    }
    successfulFetches.push({ requestedUrl: url, finalUrl })
    return {
      ok: true,
      finalUrl,
      title: result.title,
      bodyMarkdown: result.bodyMarkdown?.slice(
        0,
        PAGE_BODY_CHARS
      ),
      links: result.links?.slice(0, 40),
    }
  }
  const initialPage = await fetchEvidence(candidate.url)
  if (!initialPage.ok) {
    return rejectVerdict(
      `The candidate page could not be verified: ${
        initialPage.error || 'The fetch failed.'
      }`,
      candidate.url
    )
  }
  const resolvedUrl = initialPage.finalUrl
  const contents = [
    {
      role: 'user',
      parts: [
        { text: buildVerifyPrompt(candidate, today) },
        {
          text: `Initial candidate page:\n${JSON.stringify(
            initialPage
          )}`,
        },
      ],
    },
  ]

  for (let turn = 0; turn < MAX_VERIFY_TURNS; turn++) {
    const atLimit = turn === MAX_VERIFY_TURNS - 1
    const response = await genai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        tools: [
          {
            functionDeclarations: atLimit
              ? [SUBMIT_VERDICT_TOOL]
              : [FETCH_TOOL, SUBMIT_VERDICT_TOOL],
          },
        ],
        toolConfig: {
          functionCallingConfig: atLimit
            ? {
                mode: FunctionCallingConfigMode.ANY,
                allowedFunctionNames: ['submit_verdict'],
              }
            : { mode: FunctionCallingConfigMode.AUTO },
        },
        maxOutputTokens: MAX_OUTPUT_TOKENS,
      },
    })
    const calls = response.functionCalls || []
    if (calls.length === 0) {
      return rejectVerdict(
        'model returned no tool call',
        resolvedUrl
      )
    }
    contents.push(
      response.candidates?.[0]?.content || {
        role: 'model',
        parts: calls.map((c) => ({ functionCall: c })),
      }
    )

    const submitCall = calls.find(
      (c) => c.name === 'submit_verdict'
    )
    if (submitCall) {
      const args = { ...submitCall.args }
      if (args.rejectReason === 'none')
        args.rejectReason = null
      const parsed = VerdictSchema.safeParse(args)
      if (!parsed.success) {
        return rejectVerdict(
          `verdict failed validation: ${JSON.stringify(
            parsed.error.issues.slice(0, 3)
          )}`,
          resolvedUrl
        )
      }
      const verdict = {
        ...parsed.data,
        resolvedUrl,
        successfulFetches,
      }
      if (!chooseSourceUrl(verdict)) {
        return rejectVerdict(
          'The official page has no successful HTTPS fetch in this verification.',
          resolvedUrl
        )
      }
      return verdict
    }

    const responseParts = []
    for (const call of calls) {
      const result =
        call.name === 'fetch_page'
          ? await fetchEvidence(call.args?.url)
          : {
              ok: false,
              error: 'The tool name is unknown.',
            }
      responseParts.push({
        functionResponse: {
          name: call.name,
          response: {
            result: JSON.stringify(result).slice(0, 20000),
          },
        },
      })
    }
    contents.push({ role: 'user', parts: responseParts })
  }
  return rejectVerdict('max turns exceeded', resolvedUrl)
}

// Internal failures (no tool call, malformed verdict, turn budget) say
// nothing about the program, so they are retryable, never a blacklist.
function rejectVerdict(reasoning, resolvedUrl) {
  return {
    verdict: 'reject',
    rejectReason: 'page_inaccessible',
    reasoning,
    redFlags: ['verification_incomplete'],
    officialUrl: null,
    resolvedUrl,
  }
}

function httpsUrlOrNull(value) {
  try {
    const url = new URL(value)
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password
    )
      return null
    url.hash = ''
    return url.toString()
  } catch {
    return null
  }
}

// A URL becomes a source only when this verifier successfully fetched it.
// A requested URL maps to the final page whose content the model received.
function chooseSourceUrl(verdict) {
  const target =
    verdict.verdict === 'publish' && verdict.officialUrl
      ? verdict.officialUrl
      : verdict.resolvedUrl
  const key = httpsUrlOrNull(target)
  if (!key) return null
  const evidence = verdict.successfulFetches?.find(
    ({ requestedUrl, finalUrl }) =>
      httpsUrlOrNull(requestedUrl) === key ||
      httpsUrlOrNull(finalUrl) === key
  )
  return evidence ? httpsUrlOrNull(evidence.finalUrl) : null
}

function sourceDocument(
  candidate,
  verdict,
  sourceUrl,
  admin
) {
  return {
    url: sourceUrl,
    label: candidate.name,
    category: candidate.category,
    logoUrl: null,
    allowedExternalHosts: [],
    sourceType: 'discovered',
    status:
      verdict.verdict === 'publish' ? 'active' : 'rejected',
    rejectReason: verdict.rejectReason,
    discoveryReasoning: verdict.reasoning,
    discoveryRedFlags: verdict.redFlags,
    discoveredAt: admin
      ? admin.firestore.FieldValue.serverTimestamp()
      : new Date().toISOString(),
    discoveryQuery: candidate.query,
    discoveryQueryCategory: candidate.queryCategory,
    discoveryEvidence: candidate.evidence,
    lastStatus: null,
    lastScrapedAt: null,
    lastError: null,
    consecutiveFailures: 0,
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  loadEnvLocalWithoutDotenv(REPO_ROOT)

  const projectId =
    args.project || process.env.NEXT_PUBLIC_FB_PROJECT_ID

  let admin = null
  let db = null
  if (!args.offline) {
    if (!projectId) {
      throw new Error(
        'No project id: pass --project <id> or set NEXT_PUBLIC_FB_PROJECT_ID (e.g. via .env.local), or pass --offline.'
      )
    }
    admin = require('firebase-admin')
    if (usingFirestoreEmulator()) {
      // The emulator accepts unauthenticated admin traffic; asking for
      // real credentials here would only block local testing.
      console.log(
        `Using the Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}.`
      )
      admin.initializeApp({ projectId })
    } else {
      admin.initializeApp({
        credential: resolveCredential(admin),
        projectId,
      })
    }
    db = admin.firestore()
  } else {
    console.log(
      '--offline: skipping Firestore; dedup uses scripts/data/opportunity-sources.json only.'
    )
  }

  const genai = createGenAI(args, projectId)
  const templates = loadQueryTemplates()
  const known = await loadKnownSources(db)
  console.log(
    `Loaded ${known.urls.size} known source url(s) for dedup; ${templates.length} query template(s); cap ${args.maxPerQuery} per query.`
  )

  const seenUrls = new Set()
  const candidates = []
  for (const template of templates) {
    candidates.push(
      ...(await discoverCandidates(
        genai,
        template,
        known,
        seenUrls,
        args.maxPerQuery
      ))
    )
  }
  console.log(
    `\n${candidates.length} candidate(s) passed attribution checks and dedup.`
  )
  if (candidates.length === 0) {
    console.log('Nothing to verify. Done.')
    return
  }

  const browser = await chromium.launch(
    BROWSER_LAUNCH_OPTIONS
  )
  const decisions = []
  let retryLater = 0
  try {
    for (const candidate of candidates) {
      console.log(
        `\n[verify] "${candidate.name}" -- ${candidate.url}`
      )
      const verdict = await verifyCandidate(
        browser,
        genai,
        candidate
      )
      console.log(
        `  -> ${verdict.verdict}${
          verdict.rejectReason
            ? ` (${verdict.rejectReason})`
            : ''
        }: ${verdict.reasoning}`
      )
      if (verdict.redFlags.length) {
        console.log(
          `     red flags: ${verdict.redFlags.join('; ')}`
        )
      }
      if (isRetryableReject(verdict)) {
        retryLater += 1
        console.log(
          '  [skip] Verification is incomplete or the name does not match. The candidate can return in a later run.'
        )
        continue
      }
      const sourceUrl = chooseSourceUrl(verdict)
      if (!sourceUrl) {
        retryLater += 1
        continue
      }
      const key = normalizeUrl(sourceUrl)
      if (known.urls.has(key)) {
        console.log(
          `  [dup] resolves to an existing source (${key}); nothing to write`
        )
        continue
      }
      known.urls.add(key)
      decisions.push({ candidate, verdict, sourceUrl })
    }
  } finally {
    await browser.close()
  }

  let published = 0
  let rejected = 0
  console.log('\n===== DECISIONS =====')
  for (const {
    candidate,
    verdict,
    sourceUrl,
  } of decisions) {
    const slug = uniqueSlug(
      candidate.name,
      sourceUrl,
      known.slugs
    )
    known.slugs.add(slug)
    const doc = sourceDocument(
      candidate,
      verdict,
      sourceUrl,
      admin
    )
    const action =
      doc.status === 'active' ? 'publish' : 'reject'
    if (action === 'publish') published += 1
    else rejected += 1
    console.log(
      `  ${
        args.execute ? action : `[dry run] would ${action}`
      }: ${slug} -- ${candidate.name} (${sourceUrl})`
    )
    if (args.execute) {
      await db
        .collection(OPPORTUNITY_SOURCES_COLLECTION)
        .doc(slug)
        .create(doc)
    }
  }

  console.log(
    `\n${published} to publish, ${rejected} to reject, ${retryLater} to retry next run, ${
      candidates.length - decisions.length - retryLater
    } resolved to existing sources.`
  )
  if (!args.execute && decisions.length > 0) {
    console.log(
      'Dry run only -- re-run with --execute to write these to Firestore.'
    )
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err)
    process.exitCode = 1
  })
}

module.exports = {
  chooseSourceUrl,
  loadKnownSources,
  parseArgs,
  sourceDocument,
  verifyCandidate,
}
