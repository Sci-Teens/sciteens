#!/usr/bin/env node
// One-off migration: before every uploaded file got a Firestore
// `files/{basename}` record alongside it (see context/helpers.js /
// pages/project/*/edit.js's upload flow), Storage objects under
// `projects/{projectId}/` and `profiles/{uid}/` existed with no
// corresponding Firestore doc. This walks the whole bucket once (same
// full-bucket scan style as convert-legacy-files.js, skipping
// `courses/` — server-managed), and for every pre-existing object that
// doesn't yet have a `files/{basename}` doc, creates one from the
// object's own Storage metadata. Not a live feature — run manually,
// once, from a maintainer's machine (or CI with deploy credentials).
//
// Usage:
//   node scripts/backfill-file-records.js [--execute] [--project <id>]
//     [--bucket <name>]
//
// Defaults to a dry run (lists what would be created, makes zero
// writes). Pass --execute to actually create the Firestore docs.

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const {
  isExcludedPath,
  isDirectoryPlaceholder,
  classifyObjectOwner,
  isPhotoUrlForObject,
  buildFileRecord,
} = require('./lib/fileRecordBackfill')

function parseArgs(argv) {
  const args = {
    execute: false,
    project: undefined,
    bucket: undefined,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--execute') {
      args.execute = true
    } else if (arg === '--project') {
      args.project = argv[++i]
    } else if (arg === '--bucket') {
      args.bucket = argv[++i]
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  return args
}

// Dependency-free .env.local loader — this script runs standalone
// (plain `node`, not the Next build), and dotenv isn't a repo
// dependency. Shell/CI env vars already set win over the file, matching
// dotenv's own precedence.
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

// Prefers real Application Default Credentials (`gcloud auth
// application-default login`, or GOOGLE_APPLICATION_CREDENTIALS
// pointing at a service account key) when present. Falls back to a
// pre-fetched GCLOUD_ACCESS_TOKEN env var (handy when running inside a
// container that has no gcloud CLI — fetch the token on the host with
// `gcloud auth print-access-token` and pass it through), then to the
// gcloud CLI's own user login (`gcloud auth login` — a separate, more
// commonly-already-done step) by re-shelling to
// `gcloud auth print-access-token` on every token fetch, which
// naturally handles refresh across a long-running scan without caching
// an expiring token.
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

// Reads the owner doc's photo-url field once per distinct ownerId and
// caches the result (including "doesn't exist" / null) so a bucket
// with thousands of files under the same project only costs one read
// per project, not one per file.
function makeOwnerPhotoLookup(db) {
  const cache = new Map()

  return async function getOwnerPhotoUrl(kind, ownerId) {
    const cacheKey = `${kind}:${ownerId}`
    if (cache.has(cacheKey)) return cache.get(cacheKey)

    let result
    if (kind === 'project') {
      const snap = await db
        .collection('projects')
        .doc(ownerId)
        .get()
      result = snap.exists
        ? {
            exists: true,
            photoUrl: snap.data()?.project_photo,
          }
        : { exists: false, photoUrl: undefined }
    } else {
      const snap = await db
        .collection('profile-pictures')
        .doc(ownerId)
        .get()
      result = snap.exists
        ? { exists: true, photoUrl: snap.data()?.picture }
        : { exists: false, photoUrl: undefined }
    }
    cache.set(cacheKey, result)
    return result
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  loadEnvLocal(path.resolve(__dirname, '..'))

  const projectId =
    args.project || process.env.NEXT_PUBLIC_FB_PROJECT_ID
  if (!projectId) {
    throw new Error(
      'No project id: pass --project <id> or set NEXT_PUBLIC_FB_PROJECT_ID (e.g. via .env.local).'
    )
  }
  const bucketName =
    args.bucket || `${projectId}.appspot.com`

  const admin = require('firebase-admin')
  admin.initializeApp({
    credential: resolveCredential(admin),
    projectId,
    storageBucket: bucketName,
  })
  const bucket = admin.storage().bucket()
  const db = admin.firestore()
  const getOwnerPhotoUrl = makeOwnerPhotoLookup(db)

  console.log(
    `${
      args.execute ? '[EXECUTE]' : '[DRY RUN]'
    } scanning gs://${bucketName}/ ...`
  )

  const [objects] = await bucket.getFiles()

  const counts = {
    scanned: 0,
    created: 0,
    alreadyRecorded: 0,
    skippedOrphan: 0,
    skippedUnowned: 0,
    failed: 0,
  }

  for (const object of objects) {
    if (
      isExcludedPath(object.name) ||
      isDirectoryPlaceholder(object.name)
    ) {
      continue
    }
    counts.scanned++

    const owner = classifyObjectOwner(object.name)
    if (owner.kind === null) {
      counts.skippedUnowned++
      continue
    }

    const basename = path.posix.basename(object.name)
    const ownerCollection =
      owner.kind === 'project' ? 'projects' : 'profiles'

    try {
      const fileDocRef = db
        .collection(ownerCollection)
        .doc(owner.ownerId)
        .collection('files')
        .doc(basename)

      const existing = await fileDocRef.get()
      if (existing.exists) {
        counts.alreadyRecorded++
        continue
      }

      const { exists: ownerExists, photoUrl } =
        await getOwnerPhotoUrl(owner.kind, owner.ownerId)
      if (!ownerExists) {
        counts.skippedOrphan++
        console.log(
          `skipped (owner ${ownerCollection}/${owner.ownerId} no longer exists): ${object.name}`
        )
        continue
      }

      // metadata may already be populated from the getFiles() listing,
      // but fetch it fresh if not (mirrors convert-legacy-files.js).
      const metadata =
        object.metadata && object.metadata.contentType
          ? object.metadata
          : (await object.getMetadata())[0]

      const record = buildFileRecord({
        object: { name: object.name, metadata },
        bucketName,
        isPhoto: isPhotoUrlForObject(photoUrl, object.name),
      })

      if (!args.execute) {
        console.log(
          `[DRY RUN] would create ${ownerCollection}/${
            owner.ownerId
          }/files/${basename}: ${JSON.stringify(record)}`
        )
        counts.created++
        continue
      }

      await fileDocRef.set(record)
      console.log(
        `created ${ownerCollection}/${owner.ownerId}/files/${basename}`
      )
      counts.created++
    } catch (err) {
      counts.failed++
      console.error(
        `FAILED to backfill a record for ${object.name}: ${err.message}`
      )
    }
  }

  console.log(
    `\nSummary: scanned=${counts.scanned} created=${counts.created} ` +
      `already-recorded=${counts.alreadyRecorded} skipped-orphan=${counts.skippedOrphan} ` +
      `skipped-unowned-path=${counts.skippedUnowned} failed=${counts.failed}` +
      (args.execute ? '' : ' (dry run — no writes made)')
  )

  if (counts.failed > 0) process.exitCode = 1
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err)
    process.exitCode = 1
  })
}

module.exports = { parseArgs, loadEnvLocal }
