#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { chromium } = require('playwright')
const cheerio = require('cheerio')
const { extractPageMarkdown } = require('./lib/pageContent')

const {
  GoogleGenAI,
  FunctionCallingConfigMode,
} = require('@google/genai')
const {
  buildCoverFromBuffer,
  defaultBucketName,
  extForContentType,
  uploadCoverWebp,
} = require('./lib/programImages')

const {
  ExtractionSchema,
  FIELD_TAXONOMY,
  PROGRAM_TYPE_TAXONOMY,
  RESIDENTIAL_OPTIONS,
  selectConsultedPages,
  buildPrefetchPrompt,
  buildExtractionSystemPrompt,
  withSeedPage,
} = require('./lib/opportunitySchema')
const MODEL = 'gemini-3.7-flash'
const DEFAULT_VERTEX_LOCATION = 'global'
const MAX_OUTPUT_TOKENS = 8192
const MAX_FETCHES_PER_SOURCE = 5
const CONCURRENCY = 3

const IMAGE_FETCH_TIMEOUT_MS = 12000
const IMAGE_USER_AGENT =
  'Mozilla/5.0 (compatible; SciTeensImageFetcher/1.0; +https://sciteens.org)'

const GEOCODE_FETCH_TIMEOUT_MS = 10000
const GEOCODE_MIN_INTERVAL_MS = 1100
const GEOCODE_USER_AGENT =
  'SciTeensOpportunityScraper/1.0 (+https://sciteens.org)'
const NON_GEOCODABLE_LOCATIONS = new Set([
  'virtual',
  'remote',
  'multiple locations',
  'unsure',
])

const FETCH_TOOL = {
  name: 'fetch_page',
  description:
    'Fetch a linked follow-up webpage with a real, JavaScript-rendering browser. Return its title, og:image URL (if any), compact semantic Markdown, and a list of links (url + visible text). Use this only when the supplied pages lack a needed fact, such as a deadline, program date, eligibility rule, or cost. Prefer a real link from a supplied page over a guessed URL.',
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

const SUBMIT_TOOL = {
  name: 'submit_extraction',
  description:
    "Submit your final structured extraction once you have enough information, or have made a good-faith effort and still can't find a clear answer.",
  parametersJsonSchema: {
    type: 'object',
    properties: {
      name: {
        type: 'string',
        description: 'Official program/competition name',
      },
      about: {
        type: 'string',
        description:
          '2-4 sentence plain-language description of what this program is and who it is for',
      },
      location: {
        type: 'string',
        description:
          'Where the program takes place. Give the most specific real address you can find, e.g. "77 Massachusetts Ave, Cambridge, MA" for an in-person/residential program at a known campus, or a city/state like "Cambridge, MA" if only that is stated. If the program is fully online, use the exact literal string "Virtual". If it explicitly runs at several different sites, use the exact literal string "Multiple Locations". If the page never states a location, use the exact literal string "Unsure". Never return null or an empty string.',
      },
      startDate: {
        type: ['string', 'null'],
        description:
          'First date participants attend the opportunity, ISO 8601 (YYYY-MM-DD). This is not an application, registration, notification, payment, or unrelated-event date. Return null unless an official source explicitly gives a complete date for the selected program cycle.',
      },
      endDate: {
        type: ['string', 'null'],
        description:
          'Last date participants attend the opportunity, ISO 8601 (YYYY-MM-DD). Return null unless an official source explicitly gives a complete date for the selected program cycle. Never pair it with a startDate from a different cycle or calculate it from duration.',
      },
      applicationDeadline: {
        type: ['string', 'null'],
        description:
          'Application deadline, ISO 8601, ONLY if deadlineStatus is "dated". Report the real deadline exactly as stated even if it looks like it has already passed -- do not judge freshness yourself, just report the true value. Otherwise null.',
      },
      applicationOpensDate: {
        type: ['string', 'null'],
        description:
          'Date applications open, ISO 8601, ONLY if deadlineStatus is "upcoming" (the page explicitly states a specific future date when applications will open, with no deadline stated yet). Otherwise null.',
      },
      deadlineStatus: {
        type: 'string',
        enum: ['dated', 'rolling', 'upcoming', 'unclear'],
        description:
          '"dated" if the page unambiguously states a real application deadline -- whether that date is before or after today does not matter, report it as "dated" either way. "rolling" only if the page explicitly states rolling/ongoing admissions with no deadline. "upcoming" only if the page explicitly states a specific future date when applications open (not yet open, no deadline posted yet) -- a vague "check back later" or "applications open in the fall" with no specific date is NOT enough, that stays "unclear". "unclear" if none of the above confidently applies -- including when the only date on the page is not actually an application deadline at all (e.g. a game-reveal or event date), or when you cannot tell what a date refers to.',
      },
      gradeRangeLow: {
        type: ['number', 'null'],
        description:
          'Lowest eligible US grade level (9-12), or null if not grade-restricted/not stated',
      },
      gradeRangeHigh: {
        type: ['number', 'null'],
        description:
          'Highest eligible US grade level (9-12), or null',
      },
      ageRangeLow: {
        type: ['number', 'null'],
        description:
          'Lowest eligible participant age in years, if the page states eligibility by age rather than (or in addition to) grade level, or null if not stated',
      },
      ageRangeHigh: {
        type: ['number', 'null'],
        description:
          'Highest eligible participant age in years, or null',
      },
      fields: {
        type: 'array',
        items: { type: 'string', enum: FIELD_TAXONOMY },
        description:
          'One or more STEM fields this program covers, from the fixed list',
      },
      eligibilityNotes: {
        type: ['string', 'null'],
        description:
          'Any residency or other eligibility restriction worth surfacing (e.g. "New Jersey residents only"), or null if none',
      },
      cost: {
        type: 'string',
        description:
          'Program cost to the student, stated plainly (e.g. "Free", "$500 fee, need-based aid available", "$4,200 tuition"). Use the exact literal string "Not specified" if the page does not state a cost.',
      },
      financialAid: {
        type: 'string',
        description:
          'Whether financial aid, scholarships, or fee waivers are available. If cost is "Free", use the exact literal string "Program is Free". If the page states aid is available, describe it plainly (e.g. "Need-based scholarships available", "Fee waivers for eligible families"). Use the exact literal string "Not specified" if the page never mentions financial aid and the program is not free.',
      },
      stipend: {
        type: 'string',
        description:
          'Whether participants are paid a stipend or wage (common for research internships), stated plainly (e.g. "$500/week stipend", "$3,000 total stipend"). Use the exact literal string "Not specified" if the page does not mention a stipend or payment to participants.',
      },
      programType: {
        type: 'string',
        enum: PROGRAM_TYPE_TAXONOMY,
        description:
          'The single best-fitting category for what kind of opportunity this is, from the fixed list. Use "Other" only if none of the listed categories fit.',
      },
      durationText: {
        type: 'string',
        description:
          'How long the program runs or how much time it takes, stated plainly (e.g. "6 weeks", "1-day workshop", "year-long, 3 hrs/week"). Use the exact literal string "Not specified" if the page does not state a duration or time commitment.',
      },
      residential: {
        type: 'string',
        enum: RESIDENTIAL_OPTIONS,
        description:
          'For in-person programs: "Residential" if participants live on-site/in provided housing, "Commuter" if participants travel daily and are not housed. Use "Not applicable" if the program is fully virtual. Use "Not specified" if the program is in-person but housing is not mentioned.',
      },
      contactEmail: {
        type: ['string', 'null'],
        description:
          'A program or admissions contact email address found on the page, or null if none is stated',
      },
      applicationUrl: {
        type: 'string',
        description:
          'The best direct URL for a student to start an application, or the program homepage if no dedicated apply page was found',
      },
      reasoning: {
        type: 'string',
        description:
          'Brief (1-3 sentence) explanation of deadlineStatus and any non-obvious date choice, especially a null program date or a rejected misleading date. Kept for operator debugging in opportunity-sources, not shown to end users.',
      },
      consultedPages: {
        type: 'array',
        description:
          'Provenance: every page supplied in this request and every fetch_page URL, each paired with a short role label describing the facts used from that page. Include the seed URL. We persist this as the seed set on the next run, so do not list any other pages.',
        items: {
          type: 'object',
          properties: {
            url: {
              type: 'string',
              description:
                'Absolute URL of a pre-fetched or fetched page.',
            },
            role: {
              type: 'string',
              description:
                'Short label for what this page held (e.g. "main", "deadline", "eligibility", "cost", "dates").',
            },
          },
          required: ['url', 'role'],
        },
      },
    },
    required: [
      'name',
      'about',
      'location',
      'startDate',
      'endDate',
      'applicationDeadline',
      'applicationOpensDate',
      'deadlineStatus',
      'gradeRangeLow',
      'gradeRangeHigh',
      'ageRangeLow',
      'ageRangeHigh',
      'fields',
      'eligibilityNotes',
      'cost',
      'financialAid',
      'stipend',
      'programType',
      'durationText',
      'residential',
      'contactEmail',
      'applicationUrl',
      'reasoning',
      'consultedPages',
    ],
  },
}

function extractPageContent(html, baseUrl) {
  const $ = cheerio.load(html)
  const title = $('title').first().text().trim()
  const ogImage =
    $('meta[property="og:image"]').attr('content') || ''
  const bodyMarkdown = extractPageMarkdown(html, baseUrl)

  const links = []
  const seen = new Set()
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const text = $(el).text().replace(/\s+/g, ' ').trim()
    if (!href || !text) return
    let abs
    try {
      abs = new URL(href, baseUrl).toString()
    } catch {
      return
    }
    if (seen.has(abs)) return
    seen.add(abs)
    links.push({ url: abs, text: text.slice(0, 80) })
  })

  return {
    title,
    ogImage,
    bodyMarkdown,
    links: links.slice(0, 60),
  }
}

const {
  fetchPublicUrl,
  isNonNetworkScheme,
  publicHttpUrlOrNull,
} = require('./lib/publicUrl')

async function fetchPage(browser, url) {
  const safeUrl = await publicHttpUrlOrNull(url)
  if (!safeUrl) {
    return {
      ok: false,
      error: `refused to fetch non-public URL: ${String(
        url
      ).slice(0, 200)}`,
    }
  }
  const context = await browser.newContext()
  await context.route('**/*', async (route) => {
    const requestUrl = route.request().url()
    let parsed
    try {
      parsed = new URL(requestUrl)
    } catch {
      return route.abort('blockedbyclient')
    }
    if (isNonNetworkScheme(parsed.protocol)) {
      return route.continue()
    }
    const allowed = await publicHttpUrlOrNull(requestUrl)
    return allowed
      ? route.continue()
      : route.abort('blockedbyclient')
  })
  const page = await context.newPage()
  try {
    await page.goto(safeUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })
    await page.waitForTimeout(1500)
    const html = await page.content()
    return {
      ok: true,
      ...extractPageContent(html, safeUrl),
    }
  } catch (err) {
    return {
      ok: false,
      error: String(err && err.message ? err.message : err),
    }
  } finally {
    await context.close()
  }
}

function faviconFallbackUrl(pageUrl) {
  const domain = new URL(pageUrl).hostname
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`
}

async function downloadImageBuffer(imageUrl) {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(),
    IMAGE_FETCH_TIMEOUT_MS
  )
  let res
  try {
    res = await fetchPublicUrl(imageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': IMAGE_USER_AGENT },
    })
  } finally {
    clearTimeout(timer)
  }
  if (!res.ok)
    throw new Error(`image fetch HTTP ${res.status}`)
  const contentType = res.headers.get('content-type') || ''
  return {
    buffer: Buffer.from(await res.arrayBuffer()),
    ext: extForContentType(contentType),
  }
}

let lastGeocodeRequestAt = 0

async function geocodeLocation(locationText) {
  const normalized = String(locationText || '')
    .trim()
    .toLowerCase()
  if (
    !normalized ||
    NON_GEOCODABLE_LOCATIONS.has(normalized)
  ) {
    return null
  }

  // Nominatim's usage policy caps unauthenticated use at one
  // request per second: https://operations.osmfoundation.org/policies/nominatim/
  const waitMs =
    lastGeocodeRequestAt +
    GEOCODE_MIN_INTERVAL_MS -
    Date.now()
  if (waitMs > 0) {
    await new Promise((resolve) =>
      setTimeout(resolve, waitMs)
    )
  }
  lastGeocodeRequestAt = Date.now()

  const params = new URLSearchParams({
    q: locationText,
    format: 'jsonv2',
    limit: '1',
  })
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(),
    GEOCODE_FETCH_TIMEOUT_MS
  )
  try {
    const res = await fetchPublicUrl(
      `https://nominatim.openstreetmap.org/search?${params}`,
      {
        signal: controller.signal,
        headers: { 'User-Agent': GEOCODE_USER_AGENT },
      }
    )
    if (!res.ok) return null
    const results = await res.json()
    const top = Array.isArray(results) ? results[0] : null
    if (!top) return null
    const lat = Number(top.lat)
    const lng = Number(top.lon)
    if (!Number.isFinite(lat) || !Number.isFinite(lng))
      return null
    return {
      locationLat: lat,
      locationLng: lng,
      locationFormattedAddress: top.display_name || null,
    }
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function ogImageUrl(browser, sourceUrl) {
  try {
    const page = await fetchPage(browser, sourceUrl)
    if (page.ok && page.ogImage) {
      return new URL(page.ogImage, sourceUrl).toString()
    }
  } catch {
    return null
  }
  return null
}

async function imageCandidateUrls(
  browser,
  sourceUrl,
  curatedLogoUrl
) {
  const ogImage = await ogImageUrl(browser, sourceUrl)
  const favicon = faviconFallbackUrl(sourceUrl)
  return [curatedLogoUrl, ogImage, favicon].filter(Boolean)
}

async function uploadCoverImage(
  bucket,
  slug,
  candidateUrl
) {
  const { buffer, ext } = await downloadImageBuffer(
    candidateUrl
  )
  const { webp, imageFit } = await buildCoverFromBuffer(
    buffer,
    ext
  )
  const imageUrl = await uploadCoverWebp(bucket, slug, webp)
  return { imageUrl, imageFit }
}

async function fetchAndUploadImage(
  browser,
  bucket,
  slug,
  sourceUrl,
  curatedLogoUrl
) {
  const candidates = await imageCandidateUrls(
    browser,
    sourceUrl,
    curatedLogoUrl
  )
  for (const candidateUrl of candidates) {
    try {
      return await uploadCoverImage(
        bucket,
        slug,
        candidateUrl
      )
    } catch {
      continue
    }
  }
  return null
}

function extractionToolConfig(atFetchLimit) {
  return atFetchLimit
    ? {
        mode: FunctionCallingConfigMode.ANY,
        allowedFunctionNames: ['submit_extraction'],
      }
    : { mode: FunctionCallingConfigMode.AUTO }
}

function modelTurnContent(response, calls) {
  const candidate = (response.candidates || [])[0]
  if (
    candidate &&
    candidate.content &&
    candidate.content.parts
  ) {
    return candidate.content
  }
  return {
    role: 'model',
    parts: calls.map((call) => ({ functionCall: call })),
  }
}

function toFunctionResponsePart(call, result) {
  const functionResponse = {
    name: call.name,
    response: {
      result: JSON.stringify(result).slice(0, 20000),
    },
  }
  if (call.id) functionResponse.id = call.id
  return { functionResponse }
}

async function runExtractionTurnLoop(
  browser,
  genai,
  contents,
  visited,
  maxTurns
) {
  let fetchCount = 0
  for (let turn = 0; turn < maxTurns; turn++) {
    const atFetchLimit =
      fetchCount >= MAX_FETCHES_PER_SOURCE
    const response = await genai.models.generateContent({
      model: MODEL,
      contents,
      config: {
        systemInstruction: buildExtractionSystemPrompt(
          new Date().toISOString().slice(0, 10)
        ),
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        tools: [
          {
            functionDeclarations: atFetchLimit
              ? [SUBMIT_TOOL]
              : [FETCH_TOOL, SUBMIT_TOOL],
          },
        ],
        toolConfig: {
          functionCallingConfig:
            extractionToolConfig(atFetchLimit),
        },
      },
    })
    const calls = response.functionCalls || []
    if (calls.length === 0) {
      return {
        visited,
        error: 'model returned no tool call',
      }
    }
    contents.push(modelTurnContent(response, calls))
    const submitCall = calls.find(
      (call) => call.name === 'submit_extraction'
    )
    if (submitCall) {
      const parsed = ExtractionSchema.safeParse(
        submitCall.args
      )
      return {
        visited,
        valid: parsed.success,
        data: parsed.success
          ? parsed.data
          : submitCall.args,
        zodError: parsed.success
          ? null
          : parsed.error.format(),
      }
    }
    const responseParts = []
    for (const call of calls) {
      fetchCount += 1
      const url = call.args && call.args.url
      visited.push(url)
      const result = await fetchPage(browser, url)
      responseParts.push(
        toFunctionResponsePart(call, result)
      )
    }
    contents.push({ role: 'user', parts: responseParts })
  }
  return { visited, error: 'max turns exceeded' }
}

async function runExtractionFromSeed(
  browser,
  genai,
  seedUrl
) {
  const fetched = await fetchConsultedPages(
    browser,
    withSeedPage(seedUrl, [])
  )
  const contents = [
    {
      role: 'user',
      parts: [
        { text: buildPrefetchPrompt(seedUrl, fetched) },
      ],
    },
  ]
  return runExtractionTurnLoop(
    browser,
    genai,
    contents,
    fetched.map((entry) => entry.url),
    8
  )
}

async function fetchConsultedPages(browser, entries) {
  return Promise.all(
    entries.map(async (entry) => {
      const page = await fetchPage(browser, entry.url)
      return { url: entry.url, role: entry.role, page }
    })
  )
}

async function runExtractionFromHistory(
  browser,
  genai,
  seedUrl,
  entries
) {
  const fetched = await fetchConsultedPages(
    browser,
    withSeedPage(seedUrl, entries, MAX_FETCHES_PER_SOURCE)
  )
  const contents = [
    {
      role: 'user',
      parts: [
        { text: buildPrefetchPrompt(seedUrl, fetched) },
      ],
    },
  ]
  return runExtractionTurnLoop(
    browser,
    genai,
    contents,
    fetched.map((f) => f.url),
    4
  )
}

async function runWithOneRetry(extract, url) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const result = await extract(url)
      if (!result.error && result.valid) return result
      if (attempt === 1) {
        result.retried = true
        result.firstAttemptError =
          result.error || 'schema validation failure'
        return result
      }
    } catch (err) {
      if (attempt === 1) {
        return {
          visited: [],
          error: String(
            err && err.message ? err.message : err
          ),
          retried: true,
        }
      }
    }
  }
  return { visited: [], error: 'unreachable' }
}

function parseArgs(argv) {
  const args = {
    dryRun: false,
    refreshImages: false,
    prefetch: true,
    project: undefined,
    bucket: undefined,
    slugs: [],
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--dry-run') {
      args.dryRun = true
    } else if (arg === '--refresh-images') {
      args.refreshImages = true
    } else if (arg === '--no-prefetch') {
      args.prefetch = false
    } else if (arg === '--project') {
      args.project = argv[++i]
    } else if (arg === '--bucket') {
      args.bucket = argv[++i]
    } else {
      args.slugs.push(arg)
    }
  }
  return args
}

function loadEnvLocal(repoRoot) {
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

function resolveCredential(admin) {
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
  if (process.env.GCLOUD_ACCESS_TOKEN) {
    const token = process.env.GCLOUD_ACCESS_TOKEN
    return {
      getAccessToken: async () => ({
        access_token: token,
        expires_in: 3600,
      }),
    }
  }
  try {
    execFileSync('gcloud', ['--version'], { stdio: 'pipe' })
  } catch {
    throw new Error(
      'No Application Default Credentials found, and the gcloud CLI is not on PATH.\n' +
        'Set GOOGLE_APPLICATION_CREDENTIALS to a service account key (see .env.local), ' +
        'or run `gcloud auth application-default login`.'
    )
  }
  return {
    getAccessToken: async () => {
      const token = execFileSync(
        'gcloud',
        ['auth', 'print-access-token'],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      )
        .toString()
        .trim()
      return { access_token: token, expires_in: 3600 }
    },
  }
}

async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length)
  let next = 0
  async function runOne() {
    while (next < items.length) {
      const i = next++
      results[i] = await worker(items[i], i)
    }
  }
  await Promise.all(
    Array.from(
      { length: Math.min(limit, items.length) },
      runOne
    )
  )
  return results
}

function toQueryableTimestampOrNull(
  admin,
  slug,
  fieldName,
  isoString
) {
  if (!isoString) return null
  const parsed = new Date(isoString)
  if (Number.isNaN(parsed.getTime())) {
    console.log(
      `  [WARN] ${slug}: unparseable ${fieldName} "${isoString}", storing null`
    )
    return null
  }
  return admin.firestore.Timestamp.fromDate(parsed)
}

function toQueryableDates(admin, slug, extracted) {
  return {
    applicationDeadline: toQueryableTimestampOrNull(
      admin,
      slug,
      'applicationDeadline',
      extracted.applicationDeadline
    ),
    applicationOpensDate: toQueryableTimestampOrNull(
      admin,
      slug,
      'applicationOpensDate',
      extracted.applicationOpensDate
    ),
  }
}

function extractionFailureMessage(result) {
  return (
    result.error ||
    `schema validation failed: ${JSON.stringify(
      result.zodError
    )}`
  )
}

async function recordSourceFailure(
  admin,
  db,
  slug,
  errorMessage,
  now
) {
  await db
    .collection('opportunity-sources')
    .doc(slug)
    .update({
      lastStatus: 'fetch_failed',
      lastScrapedAt: now,
      lastError: errorMessage.slice(0, 500),
      consecutiveFailures:
        admin.firestore.FieldValue.increment(1),
    })
}

async function existingCoverUrl(db, slug) {
  const snap = await db
    .collection('opportunities')
    .doc(slug)
    .get()
  if (!snap.exists) return null
  const current = snap.data().imageUrl
  return typeof current === 'string' && current
    ? current
    : null
}

async function imagePatchOrEmpty(
  db,
  browser,
  bucket,
  slug,
  sourceUrl,
  curatedLogoUrl,
  refreshImages
) {
  if (!refreshImages) {
    const existing = await existingCoverUrl(db, slug)
    if (existing) {
      console.log(
        `  [SKIP] ${slug}: cover already set, pass --refresh-images to replace it`
      )
      return {}
    }
  }
  try {
    const image = await fetchAndUploadImage(
      browser,
      bucket,
      slug,
      sourceUrl,
      curatedLogoUrl
    )
    return image || {}
  } catch (err) {
    console.log(
      `  [WARN] ${slug}: image fetch failed, keeping existing image: ${err.message}`
    )
    return {}
  }
}

async function commitOpportunityUpsert({
  db,
  source,
  extracted,
  queryableDates,
  imagePatch,
  reasoning,
  consultedPages,
  now,
}) {
  const { slug, url } = source
  const batch = db.batch()
  batch.set(
    db.collection('opportunities').doc(slug),
    {
      ...extracted,
      ...queryableDates,
      sourceUrl: url,
      ...imagePatch,
      sourceType: source.sourceType || 'curated',
      lastScrapedAt: now,
    },
    { merge: true }
  )
  batch.update(
    db.collection('opportunity-sources').doc(slug),
    {
      lastStatus: 'ok',
      lastScrapedAt: now,
      lastError: null,
      consecutiveFailures: 0,
      verificationReasoning: reasoning,
      consultedPages,
    }
  )
  await batch.commit()
}

async function readConsultedPagesForSource(db, slug, cap) {
  try {
    const snap = await db
      .collection('opportunity-sources')
      .doc(slug)
      .get()
    if (!snap.exists) return []
    return selectConsultedPages(snap.data(), cap)
  } catch (err) {
    console.log(
      `  [WARN] ${slug}: could not read prior consultedPages (${err.message}); falling back to multi-turn extraction`
    )
    return []
  }
}

async function scrapeSource(runContext, source) {
  const {
    admin,
    db,
    bucket,
    browser,
    genai,
    dryRun,
    prefetch,
    refreshImages,
  } = runContext
  const { slug, url } = source
  const startedAt = Date.now()
  const prior = prefetch
    ? await readConsultedPagesForSource(
        db,
        slug,
        MAX_FETCHES_PER_SOURCE
      )
    : []
  const extract = prior.length
    ? (u) =>
        runExtractionFromHistory(browser, genai, u, prior)
    : (u) => runExtractionFromSeed(browser, genai, u)
  const result = await runWithOneRetry(extract, url)
  const elapsed = ((Date.now() - startedAt) / 1000).toFixed(
    1
  )

  const now = admin.firestore.FieldValue.serverTimestamp()

  if (result.error || !result.valid) {
    const errorMessage = extractionFailureMessage(result)
    console.log(
      `  [FAIL] ${slug} (${elapsed}s): ${errorMessage}`
    )
    if (process.env.DEBUG_RAW) {
      console.log(
        `  RAW DATA for ${slug}:`,
        JSON.stringify(result.data)
      )
    }
    if (!dryRun) {
      await recordSourceFailure(
        admin,
        db,
        slug,
        errorMessage,
        now
      )
    }
    return false
  }

  const { reasoning, consultedPages, ...extracted } =
    result.data
  const geocode = await geocodeLocation(extracted.location)
  extracted.locationLat = geocode
    ? geocode.locationLat
    : null
  extracted.locationLng = geocode
    ? geocode.locationLng
    : null
  extracted.locationFormattedAddress = geocode
    ? geocode.locationFormattedAddress
    : null
  console.log(
    `  [OK]   ${slug} (${elapsed}s): deadlineStatus=${extracted.deadlineStatus}`
  )

  const queryableDates = toQueryableDates(
    admin,
    slug,
    extracted
  )

  if (!dryRun) {
    const imagePatch = await imagePatchOrEmpty(
      db,
      browser,
      bucket,
      slug,
      url,
      source.logoUrl || null,
      refreshImages
    )
    await commitOpportunityUpsert({
      db,
      source,
      extracted,
      queryableDates,
      imagePatch,
      reasoning,
      consultedPages,
      now,
    })
  }
  return true
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const repoRoot = path.resolve(__dirname, '..')
  loadEnvLocal(repoRoot)

  const projectId =
    args.project || process.env.NEXT_PUBLIC_FB_PROJECT_ID
  if (!projectId) {
    throw new Error(
      'No project id: pass --project <id> or set NEXT_PUBLIC_FB_PROJECT_ID.'
    )
  }

  const admin = require('firebase-admin')
  admin.initializeApp({
    credential: resolveCredential(admin),
    projectId,
    storageBucket:
      args.bucket ||
      process.env.FIREBASE_STORAGE_BUCKET ||
      defaultBucketName(projectId),
  })
  const db = admin.firestore()
  const bucket = admin.storage().bucket()
  const genai = new GoogleGenAI({
    vertexai: true,
    project: process.env.GOOGLE_CLOUD_PROJECT || projectId,
    location:
      process.env.GOOGLE_CLOUD_LOCATION ||
      DEFAULT_VERTEX_LOCATION,
  })

  let sourcesSnap = await db
    .collection('opportunity-sources')
    .where('status', '==', 'active')
    .get()
  let sources = sourcesSnap.docs.map((d) => ({
    slug: d.id,
    ...d.data(),
  }))
  if (args.slugs.length) {
    sources = sources.filter((s) =>
      args.slugs.includes(s.slug)
    )
  }

  if (sources.length === 0) {
    console.log(
      'No active sources to scrape (check --dry-run filters or opportunity-sources status).'
    )
    return
  }

  console.log(
    `Scraping ${sources.length} source(s), concurrency ${CONCURRENCY}, dryRun=${args.dryRun}, prefetch=${args.prefetch}`
  )

  const browser = await chromium.launch({ headless: true })
  let succeeded = 0
  let failed = 0

  const runContext = {
    admin,
    db,
    bucket,
    browser,
    genai,
    dryRun: args.dryRun,
    refreshImages: args.refreshImages,
    prefetch: args.prefetch,
  }

  try {
    await mapWithConcurrency(
      sources,
      CONCURRENCY,
      async (source) => {
        const ok = await scrapeSource(runContext, source)
        if (ok) succeeded += 1
        else failed += 1
      }
    )
  } finally {
    await browser.close()
  }

  console.log(
    `\nDone: ${succeeded} succeeded, ${failed} failed, out of ${sources.length}.`
  )
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
