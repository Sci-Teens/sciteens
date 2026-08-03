#!/usr/bin/env node
// Rebuilds the Meilisearch `projects` index from Firestore.
//
// The Firestore triggers in functions/index.js only reach a project when it
// is written, so a change to functions/search.js#toSearchDocument leaves
// every untouched project indexed under the old shape. That is not cosmetic:
// `member_names` is what makes searching for a student's name return their
// projects, and until this runs, only projects edited since the deploy have
// it.
//
// Usage:
//   MEILI_HOST=https://meilisearch-xxxx.a.run.app \
//   MEILI_MASTER_KEY=<master key from Secret Manager> \
//   node scripts/reindex-meilisearch.js [--execute] [--project <id>]
//
// Defaults to a dry run (reports what would be sent, writes nothing).
// Re-applies the index settings first, then upserts every project: document
// adds are upserts keyed on `id`, so re-running is safe.
'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const {
  PROJECTS_INDEX_SETTINGS,
} = require('./lib/meilisearchIndexSettings')
const { toSearchDocument } = require('../functions/search')

const BATCH_SIZE = 200

function parseArgs(argv) {
  const args = { execute: false, project: undefined }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--execute') {
      args.execute = true
    } else if (arg === '--project') {
      const value = argv[++i]
      // Without this, `--project --execute` silently consumes the flag as
      // the project id and downgrades a write run to a dry run.
      if (!value || value.startsWith('--')) {
        throw new Error('--project requires a project id')
      }
      args.project = value
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  return args
}

// Dependency-free .env.local loader — this script runs standalone (plain
// `node`, not the Next build), and dotenv isn't a repo dependency.
// Shell/CI env vars already set win over the file, matching dotenv.
function loadEnvLocal(repoRoot) {
  const envPath = path.join(repoRoot, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const rawLine of fs
    .readFileSync(envPath, 'utf8')
    .split('\n')) {
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

// Same credential ladder as the other operator scripts (see
// scripts/migrate-profile-pii.js for the full rationale): real ADC first,
// then a pre-fetched token, then re-shelling to the gcloud CLI so a long
// scan refreshes naturally instead of caching an expiring token.
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
      'No Application Default Credentials found — using the static GCLOUD_ACCESS_TOKEN env var.'
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
    'No Application Default Credentials found — falling back to ' +
      '`gcloud auth print-access-token` (gcloud auth login).'
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

function makeMeiliClient(host, masterKey) {
  return async function meili(
    endpoint,
    { method = 'GET', body } = {}
  ) {
    const res = await fetch(`${host}${endpoint}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${masterKey}`,
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    if (!res.ok) {
      throw new Error(
        `${method} ${endpoint} -> ${res.status}: ${text}`
      )
    }
    return text ? JSON.parse(text) : null
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  loadEnvLocal(path.resolve(__dirname, '..'))

  const host = (process.env.MEILI_HOST || '').replace(
    /\/+$/,
    ''
  )
  const masterKey = process.env.MEILI_MASTER_KEY
  if (!host || !masterKey) {
    throw new Error(
      'Usage: MEILI_HOST=<url> MEILI_MASTER_KEY=<key> node scripts/reindex-meilisearch.js [--execute]'
    )
  }

  const projectId =
    args.project || process.env.NEXT_PUBLIC_FB_PROJECT_ID
  if (!projectId) {
    throw new Error(
      'No project id: pass --project <id> or set NEXT_PUBLIC_FB_PROJECT_ID (e.g. via .env.local).'
    )
  }

  const meili = makeMeiliClient(host, masterKey)
  const admin = require('firebase-admin')
  admin.initializeApp({
    credential: resolveCredential(admin),
    projectId,
  })
  const db = admin.firestore()

  const mode = args.execute ? '[EXECUTE]' : '[DRY RUN]'
  console.log(`${mode} reindexing projects/ into ${host}`)

  if (args.execute) {
    await meili('/indexes/projects/settings', {
      method: 'PATCH',
      body: PROJECTS_INDEX_SETTINGS,
    })
    console.log('Re-applied index settings.')
  }

  let lastDoc
  let scanned = 0
  let sent = 0
  let withMemberNames = 0
  try {
    for (;;) {
      let query = db
        .collection('projects')
        .orderBy('__name__')
        .limit(BATCH_SIZE)
      if (lastDoc) query = query.startAfter(lastDoc)
      const snap = await query.get()
      if (snap.empty) break

      const documents = snap.docs.map((doc) =>
        toSearchDocument(doc.id, doc.data())
      )
      scanned += documents.length
      withMemberNames += documents.filter(
        (doc) => doc.member_names.length > 0
      ).length

      if (args.execute) {
        await meili('/indexes/projects/documents', {
          method: 'POST',
          body: documents,
        })
        sent += documents.length
      }

      lastDoc = snap.docs[snap.docs.length - 1]
      console.log(`  ${scanned} projects processed ...`)
      if (snap.docs.length < BATCH_SIZE) break
    }
  } catch (err) {
    // Without this the operator sees only the error and cannot tell whether
    // the index is now half-migrated, which it is.
    console.error(
      `\nFailed after ${scanned} projects read and ${sent} upserted. ` +
        'The index is partially migrated. Document adds are upserts keyed ' +
        'on id, so re-running with --execute is safe and idempotent.'
    )
    throw err
  }

  console.log(
    `\n${mode} done: ${scanned} projects read, ${sent} upserted, ` +
      `${withMemberNames} carry at least one searchable member name.`
  )
  if (!args.execute) {
    console.log('Re-run with --execute to write.')
  } else {
    console.log(
      'Meilisearch indexes asynchronously — poll GET /tasks until the ' +
        'documentAdditionOrUpdate tasks report "succeeded".'
    )
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('reindex-meilisearch failed:', err)
    process.exit(1)
  })
}

module.exports = { parseArgs, loadEnvLocal }
