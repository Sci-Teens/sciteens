#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const OPPORTUNITY_SOURCES_COLLECTION = 'opportunity-sources'

const APPENDIX_CATEGORY = {
  mitAffiliated: 'MIT-affiliated',
  universityResearch: 'University research programs',
  nationalLabsAndGovernment: 'National labs / government',
  stateGovernorsSchools:
    "State-run Governor's Schools / academic talent",
  codingAndTech: 'Coding / tech-focused',
  competitions: 'Competitions',
}

const SOURCES = [
  {
    programSlug: 'rsi',
    url: 'https://www.cee.org/programs/research-science-institute-rsi',
    label: 'Research Science Institute (RSI)',
    category: APPENDIX_CATEGORY.mitAffiliated,
  },
  {
    programSlug: 'mites-summer',
    url: 'https://mites.mit.edu/mites-summer/',
    label: 'MITES Summer',
    category: APPENDIX_CATEGORY.mitAffiliated,
  },
  {
    programSlug: 'mit-primes',
    url: 'https://math.mit.edu/research/highschool/primes/',
    label: 'MIT PRIMES',
    category: APPENDIX_CATEGORY.mitAffiliated,
  },
  {
    programSlug: 'wtp',
    url: 'https://wtp.mit.edu/',
    label: "Women's Technology Program (WTP)",
    category: APPENDIX_CATEGORY.mitAffiliated,
  },
  {
    programSlug: 'mathroots',
    url: 'https://math.mit.edu/mathroots/',
    label: 'MIT mathroots',
    category: APPENDIX_CATEGORY.mitAffiliated,
  },

  {
    programSlug: 'ssp',
    url: 'https://ssp.org/',
    label: 'Summer Science Program (SSP)',
    category: APPENDIX_CATEGORY.universityResearch,
  },
  {
    programSlug: 'bu-rise',
    url: 'https://www.bu.edu/summer/high-school-programs/rise/',
    label: 'BU RISE',
    category: APPENDIX_CATEGORY.universityResearch,
  },
  {
    programSlug: 'cmu-sams',
    url: 'https://www.cmu.edu/pre-college/academic-programs/sams.html',
    label: 'CMU SAMS',
    category: APPENDIX_CATEGORY.universityResearch,
  },
  {
    programSlug: 'clark-scholars',
    url: 'https://www.depts.ttu.edu/clarkscholars/',
    label: 'Clark Scholars (Texas Tech)',
    category: APPENDIX_CATEGORY.universityResearch,
  },
  {
    programSlug: 'bnl-hsrp',
    url: 'https://www.bnl.gov/education/programs/program.php?q=274',
    label: 'Brookhaven National Lab HSRP',
    category: APPENDIX_CATEGORY.universityResearch,
  },
  {
    programSlug: 'stanford-aimi',
    url: 'https://aimi.stanford.edu/education/aimi-summer-internship',
    label: 'Stanford AIMI Summer Research',
    category: APPENDIX_CATEGORY.universityResearch,
  },
  {
    programSlug: 'stanford-cnix',
    url: 'https://med.stanford.edu/cninx.html',
    label: 'Stanford CNI-X',
    category: APPENDIX_CATEGORY.universityResearch,
  },
  {
    programSlug: 'ucla-summer-sessions',
    url: 'https://www.summer.ucla.edu/high-school-programs',
    label: 'UCLA Summer Sessions (pre-college)',
    category: APPENDIX_CATEGORY.universityResearch,
  },
  {
    programSlug: 'wpi-frontiers',
    url: 'https://www.wpi.edu/academics/pre-collegiate/stem-residential/frontiers/',
    label: 'WPI Frontiers Program',
    category: APPENDIX_CATEGORY.universityResearch,
  },
  {
    programSlug: 'jhu-cty',
    url: 'https://cty.jhu.edu',
    label: 'Johns Hopkins CTY',
    category: APPENDIX_CATEGORY.universityResearch,
  },

  {
    programSlug: 'nasa-internships',
    url: 'https://intern.nasa.gov/',
    label: 'NASA high school internships',
    category: APPENDIX_CATEGORY.nationalLabsAndGovernment,
  },
  {
    programSlug: 'simons-summer-research',
    url: 'https://www.stonybrook.edu/commcms/simons/program/',
    label: 'Simons Summer Research (Stony Brook)',
    category: APPENDIX_CATEGORY.nationalLabsAndGovernment,
  },
  {
    programSlug: 'nih-hs-research',
    url: 'https://www.training.nih.gov/programs/hs_srp',
    label: 'NIH high school research',
    category: APPENDIX_CATEGORY.nationalLabsAndGovernment,
  },
  {
    programSlug: 'fermilab-prism',
    url: 'https://internships.fnal.gov/fermilab-program-for-research-innovation-and-stem-mentorship-prism/',
    label: 'Fermilab PRISM',
    category: APPENDIX_CATEGORY.nationalLabsAndGovernment,
  },

  {
    programSlug: 'nj-gset',
    url: 'https://gset.rutgers.edu',
    label:
      "NJ Governor's School of Engineering & Technology (GSET)",
    category: APPENDIX_CATEGORY.stateGovernorsSchools,
  },
  {
    programSlug: 'cosmos',
    url: 'https://cosmos-ucop.ucdavis.edu',
    label:
      'COSMOS (CA State Summer School for Math & Science)',
    category: APPENDIX_CATEGORY.stateGovernorsSchools,
  },
  {
    programSlug: 'ncssm-summer-ventures',
    url: 'https://www.ncssm.edu/summer/summer-ventures',
    label: 'NCSSM Summer Ventures',
    category: APPENDIX_CATEGORY.stateGovernorsSchools,
  },

  {
    programSlug: 'girls-who-code-pathways',
    url: 'https://girlswhocode.com/programs/pathways',
    label: 'Girls Who Code -- Pathways',
    category: APPENDIX_CATEGORY.codingAndTech,
  },
  {
    programSlug: 'kode-with-klossy',
    url: 'https://www.kodewithklossy.com',
    label: 'Kode With Klossy',
    category: APPENDIX_CATEGORY.codingAndTech,
  },
  {
    programSlug: 'all-star-code',
    url: 'https://www.allstarcode.org',
    label: 'All Star Code',
    category: APPENDIX_CATEGORY.codingAndTech,
  },
  {
    programSlug: 'inspirit-ai',
    url: 'https://www.inspiritai.com',
    label: 'Inspirit AI Scholars Program',
    category: APPENDIX_CATEGORY.codingAndTech,
  },

  {
    programSlug: 'regeneron-sts',
    url: 'https://www.societyforscience.org/regeneron-sts/',
    label: 'Regeneron Science Talent Search',
    category: APPENDIX_CATEGORY.competitions,
  },
  {
    programSlug: 'regeneron-isef',
    url: 'https://www.societyforscience.org/isef/',
    label: 'Regeneron ISEF',
    category: APPENDIX_CATEGORY.competitions,
  },
  {
    programSlug: 'technovation-girls',
    url: 'https://technovationchallenge.org',
    label: 'Technovation Girls',
    category: APPENDIX_CATEGORY.competitions,
  },
  {
    programSlug: 'conrad-challenge',
    url: 'https://www.conradchallenge.org',
    label: 'Conrad Challenge',
    category: APPENDIX_CATEGORY.competitions,
  },
  {
    programSlug: 'ecybermission',
    url: 'https://www.usaeop.com/program/ecybermission/',
    label: 'eCYBERMISSION',
    category: APPENDIX_CATEGORY.competitions,
  },
  {
    programSlug: 'breakthrough-junior-challenge',
    url: 'https://breakthroughjuniorchallenge.org',
    label: 'Breakthrough Junior Challenge',
    category: APPENDIX_CATEGORY.competitions,
  },
  {
    programSlug: 'first-robotics',
    url: 'https://www.firstinspires.org/programs/frc/',
    label: 'FIRST Robotics Competition',
    category: APPENDIX_CATEGORY.competitions,
  },
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

function resolveCredential(admin) {
  return (
    applicationDefaultCredential(admin) ||
    staticAccessTokenCredential() ||
    gcloudCliLoginCredential()
  )
}

function assertSlugsAreUnique(sources) {
  const slugs = new Set()
  for (const { programSlug } of sources) {
    if (slugs.has(programSlug))
      throw new Error(
        `Duplicate slug in SOURCES: ${programSlug}`
      )
    slugs.add(programSlug)
  }
}

async function createSourceIfMissing(db, source, execute) {
  const ref = db
    .collection(OPPORTUNITY_SOURCES_COLLECTION)
    .doc(source.programSlug)
  const existing = await ref.get()
  if (existing.exists) {
    console.log(
      `  skip (already exists): ${source.programSlug}`
    )
    return false
  }

  console.log(
    `  ${execute ? 'create' : '[dry run] would create'}: ${
      source.programSlug
    } -- ${source.label}`
  )
  if (execute) {
    await ref.set({
      url: source.url,
      label: source.label,
      category: source.category,
      sourceType: 'curated',
      status: 'active',
      verificationReasoning: null,
      lastStatus: null,
      lastScrapedAt: null,
      lastError: null,
      consecutiveFailures: 0,
    })
  }
  return true
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const repoRoot = path.resolve(__dirname, '..')
  loadEnvLocalWithoutDotenv(repoRoot)

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

  assertSlugsAreUnique(SOURCES)

  let created = 0
  let skipped = 0

  for (const source of SOURCES) {
    const wasCreated = await createSourceIfMissing(
      db,
      source,
      args.execute
    )
    if (wasCreated) created += 1
    else skipped += 1
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
