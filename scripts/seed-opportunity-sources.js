#!/usr/bin/env node
// One-time (and safely re-runnable) seed of the `opportunity-sources`
// Firestore collection with the 33 hand-verified curated program URLs from
// the project plan's Appendix. This is the operator-managed list the
// weekly Tier 1 scraper (scripts/scrapeOpportunities.js) reads from --
// seeding it here is what makes that scraper have something to run
// against.
//
// Each source's doc id is the same slug used elsewhere in the codebase
// (lib/mockPrograms.js, lib/programImages.js, scripts/fetch-program-images.js)
// so a source, its eventual `opportunities/{slug}` doc, and its logo file
// under public/assets/programs/ all line up under one readable id --
// simpler to debug by hand than a URL hash, and just as idempotent since
// the same source always maps to the same slug.
//
// Safe to re-run: only creates docs that don't already exist, and never
// overwrites bookkeeping fields (status, lastStatus, consecutiveFailures,
// etc.) on a source the scraper has already run against -- so re-running
// this after adding a new source to the list below only adds that one new
// doc, it doesn't reset anything already in progress.
//
// Usage:
//   node scripts/seed-opportunity-sources.js [--execute] [--project <id>]
//
// Defaults to a dry run (prints what would be created, makes zero writes).
// Pass --execute to actually write to Firestore.
'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

// Slug, URL, human label, category -- category matches the grouping in the
// project plan's Appendix, kept only for operator reference (never shown
// to end users; opportunity-sources is not client-readable).
const SOURCES = [
  [
    'rsi',
    'https://www.cee.org/programs/research-science-institute-rsi',
    'Research Science Institute (RSI)',
    'MIT-affiliated',
  ],
  [
    'mites-summer',
    'https://mites.mit.edu/mites-summer/',
    'MITES Summer',
    'MIT-affiliated',
  ],
  [
    'mit-primes',
    'https://math.mit.edu/research/highschool/primes/',
    'MIT PRIMES',
    'MIT-affiliated',
  ],
  [
    'wtp',
    'https://wtp.mit.edu/',
    "Women's Technology Program (WTP)",
    'MIT-affiliated',
  ],
  [
    'mathroots',
    'https://math.mit.edu/mathroots/',
    'MIT mathroots',
    'MIT-affiliated',
  ],

  [
    'ssp',
    'https://ssp.org/',
    'Summer Science Program (SSP)',
    'University research programs',
  ],
  [
    'bu-rise',
    'https://www.bu.edu/summer/high-school-programs/rise/',
    'BU RISE',
    'University research programs',
  ],
  [
    'cmu-sams',
    'https://www.cmu.edu/pre-college/academic-programs/sams.html',
    'CMU SAMS',
    'University research programs',
  ],
  [
    'clark-scholars',
    'https://www.depts.ttu.edu/clarkscholars/',
    'Clark Scholars (Texas Tech)',
    'University research programs',
  ],
  [
    'bnl-hsrp',
    'https://www.bnl.gov/education/programs/program.php?q=274',
    'Brookhaven National Lab HSRP',
    'University research programs',
  ],
  [
    'stanford-aimi',
    'https://aimi.stanford.edu/education/aimi-summer-internship',
    'Stanford AIMI Summer Research',
    'University research programs',
  ],
  [
    'stanford-cnix',
    'https://med.stanford.edu/cninx.html',
    'Stanford CNI-X',
    'University research programs',
  ],
  [
    'ucla-summer-sessions',
    'https://www.summer.ucla.edu/high-school-programs',
    'UCLA Summer Sessions (pre-college)',
    'University research programs',
  ],
  [
    'wpi-frontiers',
    'https://www.wpi.edu/academics/pre-collegiate/stem-residential/frontiers/',
    'WPI Frontiers Program',
    'University research programs',
  ],
  [
    'jhu-cty',
    'https://cty.jhu.edu',
    'Johns Hopkins CTY',
    'University research programs',
  ],

  [
    'nasa-internships',
    'https://intern.nasa.gov/',
    'NASA high school internships',
    'National labs / government',
  ],
  [
    'simons-summer-research',
    'https://www.stonybrook.edu/commcms/simons/program/',
    'Simons Summer Research (Stony Brook)',
    'National labs / government',
  ],
  [
    'nih-hs-research',
    'https://www.training.nih.gov/programs/hs_srp',
    'NIH high school research',
    'National labs / government',
  ],
  [
    'fermilab-prism',
    'https://internships.fnal.gov/fermilab-program-for-research-innovation-and-stem-mentorship-prism/',
    'Fermilab PRISM',
    'National labs / government',
  ],

  [
    'nj-gset',
    'https://gset.rutgers.edu',
    "NJ Governor's School of Engineering & Technology (GSET)",
    "State-run Governor's Schools / academic talent",
  ],
  [
    'cosmos',
    'https://cosmos-ucop.ucdavis.edu',
    'COSMOS (CA State Summer School for Math & Science)',
    "State-run Governor's Schools / academic talent",
  ],
  [
    'ncssm-summer-ventures',
    'https://www.ncssm.edu/summer/summer-ventures',
    'NCSSM Summer Ventures',
    "State-run Governor's Schools / academic talent",
  ],

  [
    'girls-who-code-pathways',
    'https://girlswhocode.com/programs/pathways',
    'Girls Who Code -- Pathways',
    'Coding / tech-focused',
  ],
  [
    'kode-with-klossy',
    'https://www.kodewithklossy.com',
    'Kode With Klossy',
    'Coding / tech-focused',
  ],
  [
    'all-star-code',
    'https://www.allstarcode.org',
    'All Star Code',
    'Coding / tech-focused',
  ],
  [
    'inspirit-ai',
    'https://www.inspiritai.com',
    'Inspirit AI Scholars Program',
    'Coding / tech-focused',
  ],

  [
    'regeneron-sts',
    'https://www.societyforscience.org/regeneron-sts/',
    'Regeneron Science Talent Search',
    'Competitions',
  ],
  [
    'regeneron-isef',
    'https://www.societyforscience.org/isef/',
    'Regeneron ISEF',
    'Competitions',
  ],
  [
    'technovation-girls',
    'https://technovationchallenge.org',
    'Technovation Girls',
    'Competitions',
  ],
  [
    'conrad-challenge',
    'https://www.conradchallenge.org',
    'Conrad Challenge',
    'Competitions',
  ],
  [
    'ecybermission',
    'https://www.usaeop.com/program/ecybermission/',
    'eCYBERMISSION',
    'Competitions',
  ],
  [
    'breakthrough-junior-challenge',
    'https://breakthroughjuniorchallenge.org',
    'Breakthrough Junior Challenge',
    'Competitions',
  ],
  [
    'first-robotics',
    'https://www.firstinspires.org/programs/frc/',
    'FIRST Robotics Competition',
    'Competitions',
  ],
]

function parseArgs(argv) {
  const args = { execute: false, project: undefined }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--execute') {
      args.execute = true
    } else if (arg === '--project') {
      args.project = argv[++i]
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  return args
}

// Same dependency-free .env.local loader used by the other admin scripts
// in this repo (e.g. scripts/backfill-file-records.js) -- these scripts
// run standalone via plain `node`, not the Next build, so dotenv isn't
// pulled in as a dependency.
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

// Same credential resolution as scripts/backfill-file-records.js: real
// Application Default Credentials first, then a pre-fetched
// GCLOUD_ACCESS_TOKEN, then falling back to shelling out to the gcloud
// CLI's own login on every token fetch.
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
    console.log(
      'No Application Default Credentials found -- using the static GCLOUD_ACCESS_TOKEN env var.'
    )
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
        'Run `gcloud auth application-default login`, set GOOGLE_APPLICATION_CREDENTIALS ' +
        'to a service account key, set GCLOUD_ACCESS_TOKEN to a pre-fetched token, or ' +
        'install the gcloud CLI and run `gcloud auth login`.'
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

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const repoRoot = path.resolve(__dirname, '..')
  loadEnvLocal(repoRoot)

  const projectId =
    args.project || process.env.NEXT_PUBLIC_FB_PROJECT_ID
  if (!projectId) {
    throw new Error(
      'No project id: pass --project <id> or set NEXT_PUBLIC_FB_PROJECT_ID (e.g. via .env.local).'
    )
  }

  const admin = require('firebase-admin')
  admin.initializeApp({
    credential: resolveCredential(admin),
    projectId,
  })
  const db = admin.firestore()

  const slugs = new Set()
  for (const [slug] of SOURCES) {
    if (slugs.has(slug))
      throw new Error(`Duplicate slug in SOURCES: ${slug}`)
    slugs.add(slug)
  }

  let created = 0
  let skipped = 0

  for (const [slug, url, label, category] of SOURCES) {
    const ref = db
      .collection('opportunity-sources')
      .doc(slug)
    const existing = await ref.get()
    if (existing.exists) {
      skipped += 1
      console.log(`  skip (already exists): ${slug}`)
      continue
    }

    created += 1
    console.log(
      `  ${
        args.execute ? 'create' : '[dry run] would create'
      }: ${slug} -- ${label}`
    )
    if (args.execute) {
      await ref.set({
        url,
        label,
        category,
        sourceType: 'curated',
        status: 'active',
        verificationReasoning: null,
        lastStatus: null,
        lastScrapedAt: null,
        lastError: null,
        consecutiveFailures: 0,
      })
    }
  }

  console.log(
    `\n${created} to create, ${skipped} already exist.`
  )
  if (!args.execute && created > 0) {
    console.log(
      'Dry run only -- re-run with --execute to actually write these to Firestore.'
    )
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
