#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const OPPORTUNITY_SOURCES_COLLECTION = 'opportunity-sources'

const SOURCES_DATA_FILE = path.join(
  __dirname,
  'data',
  'opportunity-sources.json'
)

function loadSources() {
  const sources = JSON.parse(
    fs.readFileSync(SOURCES_DATA_FILE, 'utf8')
  )
  if (!Array.isArray(sources) || sources.length === 0) {
    throw new Error(
      `No sources found in ${SOURCES_DATA_FILE}`
    )
  }
  for (const source of sources) {
    for (const required of ['slug', 'url', 'label']) {
      if (!source[required]) {
        throw new Error(
          `Source is missing ${required}: ${JSON.stringify(
            source
          )}`
        )
      }
    }
  }
  return sources
}

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
  for (const { slug } of sources) {
    if (slugs.has(slug)) {
      throw new Error(`Duplicate slug in SOURCES: ${slug}`)
    }
    slugs.add(slug)
  }
}

async function createSourceIfMissing(db, source, execute) {
  const ref = db
    .collection(OPPORTUNITY_SOURCES_COLLECTION)
    .doc(source.slug)
  const existing = await ref.get()
  if (existing.exists) {
    console.log(`  skip (already exists): ${source.slug}`)
    return false
  }

  console.log(
    `  ${execute ? 'create' : '[dry run] would create'}: ${
      source.slug
    } -- ${source.label}`
  )
  if (execute) {
    await ref.set({
      url: source.url,
      label: source.label,
      category: source.category,
      logoUrl: source.logoUrl || null,
      allowedExternalHosts: Array.isArray(
        source.allowedExternalHosts
      )
        ? source.allowedExternalHosts
        : [],
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

  const sources = loadSources()
  assertSlugsAreUnique(sources)

  let created = 0
  let skipped = 0

  for (const source of sources) {
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
