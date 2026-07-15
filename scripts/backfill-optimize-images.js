#!/usr/bin/env node
// One-off migration: resizes/recompresses to WebP every pre-existing
// profile/project image that predates the fileUpload Cloud Function's
// automatic optimization (functions/index.js + functions/lib/
// imageOptimize.js). Walks the whole bucket once (same full-bucket
// scan style as backfill-file-records.js / convert-legacy-files.js,
// skipping `courses/` and the legacy singular `profilephoto/`/
// `project/` prefixes — none of those are resized by the live trigger
// either), and for every eligible, not-yet-optimized image, downloads
// it, resizes it with sharp per scripts/lib/imageOptimize.js's
// targets, and overwrites the SAME object path in place — preserving
// its `firebaseStorageDownloadTokens` metadata so every URL already
// stored in Firestore (files/{id}.url, profile-pictures/{uid}.picture,
// projects/{id}.project_photo) keeps working unchanged. Not a live
// feature — run manually, once, from a maintainer's machine (or CI
// with deploy credentials).
//
// Usage:
//   node scripts/backfill-optimize-images.js [--execute] [--project <id>]
//     [--bucket <name>]
//
// Defaults to a dry run (lists what would be resized, makes zero
// writes). Pass --execute to actually overwrite the Storage objects.

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const {
  isExcludedPath,
  isDirectoryPlaceholder,
  classifyObjectOwner,
  isPhotoUrlForObject,
} = require('./lib/fileRecordBackfill')
const {
  isThumbnailObjectPath,
  WEBP_QUALITY,
  PHOTO_DIMENSION,
  GENERAL_MAX_DIMENSION,
} = require('./lib/imageOptimize')

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
        ? { photoUrl: snap.data()?.project_photo }
        : { photoUrl: undefined }
    } else {
      const snap = await db
        .collection('profile-pictures')
        .doc(ownerId)
        .get()
      result = snap.exists
        ? { photoUrl: snap.data()?.picture }
        : { photoUrl: undefined }
    }
    cache.set(cacheKey, result)
    return result
  }
}

// Resolves whether a pre-existing object is the display photo. The
// `files/{basename}` Firestore record (if backfilled/present) is the
// primary source of truth; falling back to a URL match against the
// owner's photo-pointer field covers objects that predate that
// subcollection too (same fallback backfill-file-records.js uses).
async function resolveIsPhoto({
  db,
  ownerCollection,
  ownerId,
  basename,
  objectName,
  getOwnerPhotoUrl,
}) {
  const fileDoc = await db
    .collection(ownerCollection)
    .doc(ownerId)
    .collection('files')
    .doc(basename)
    .get()
  if (fileDoc.exists) {
    return Boolean(fileDoc.data()?.isPhoto)
  }
  const { photoUrl } = await getOwnerPhotoUrl(
    ownerCollection === 'projects' ? 'project' : 'profile',
    ownerId
  )
  return isPhotoUrlForObject(photoUrl, objectName)
}

// Resizes one Storage object in place to WebP, preserving (or
// minting, if absent) its download token — identical strategy to
// functions/index.js#optimizeImageObject, so the rewritten object
// keeps serving from the exact same URL every existing Firestore
// record/pointer field already points at.
async function optimizeObject({ bucket, object, isPhoto }) {
  const sharp = require('sharp')
  const file = bucket.file(object.name)

  const [buffer] = await file.download()
  const target = isPhoto
    ? {
        width: PHOTO_DIMENSION,
        height: PHOTO_DIMENSION,
        fit: 'cover',
      }
    : {
        width: GENERAL_MAX_DIMENSION,
        height: GENERAL_MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      }
  const webpBuffer = await sharp(buffer)
    .resize(target)
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()

  const [freshMetadata] = await file.getMetadata()
  const existingTokens =
    freshMetadata.metadata?.firebaseStorageDownloadTokens
  const token = existingTokens
    ? existingTokens.split(',')[0]
    : require('node:crypto').randomUUID()

  await file.save(webpBuffer, {
    contentType: 'image/webp',
    metadata: {
      cacheControl: freshMetadata.cacheControl,
      metadata: {
        ...freshMetadata.metadata,
        optimized: 'true',
        firebaseStorageDownloadTokens: token,
      },
    },
  })

  return { before: buffer.length, after: webpBuffer.length }
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
    optimized: 0,
    alreadyOptimized: 0,
    skippedNotImage: 0,
    skippedUnowned: 0,
    failed: 0,
  }

  for (const object of objects) {
    if (
      isExcludedPath(object.name) ||
      isDirectoryPlaceholder(object.name) ||
      isThumbnailObjectPath(object.name)
    ) {
      continue
    }

    const owner = classifyObjectOwner(object.name)
    if (owner.kind === null) {
      continue
    }
    counts.scanned++

    const metadata =
      object.metadata && object.metadata.contentType
        ? object.metadata
        : (await object.getMetadata())[0]

    if (!metadata.contentType?.startsWith('image/')) {
      counts.skippedNotImage++
      continue
    }
    if (metadata.metadata?.optimized === 'true') {
      counts.alreadyOptimized++
      continue
    }

    const basename = path.posix.basename(object.name)
    const ownerCollection =
      owner.kind === 'project' ? 'projects' : 'profiles'

    try {
      const isPhoto = await resolveIsPhoto({
        db,
        ownerCollection,
        ownerId: owner.ownerId,
        basename,
        objectName: object.name,
        getOwnerPhotoUrl,
      })

      if (!args.execute) {
        console.log(
          `[DRY RUN] would resize ${object.name} to ` +
            `${
              isPhoto
                ? `${PHOTO_DIMENSION}x${PHOTO_DIMENSION} (photo)`
                : `<=${GENERAL_MAX_DIMENSION}px (gallery)`
            }, contentType=${
              metadata.contentType
            } -> image/webp`
        )
        counts.optimized++
        continue
      }

      const { before, after } = await optimizeObject({
        bucket,
        object,
        isPhoto,
      })
      console.log(
        `optimized ${object.name}: ${before}B -> ${after}B` +
          (isPhoto ? ' (photo)' : '')
      )
      counts.optimized++
    } catch (err) {
      counts.failed++
      console.error(
        `FAILED to optimize ${object.name}: ${err.message}`
      )
    }
  }

  console.log(
    `\nSummary: scanned=${counts.scanned} optimized=${counts.optimized} ` +
      `already-optimized=${counts.alreadyOptimized} skipped-not-image=${counts.skippedNotImage} ` +
      `failed=${counts.failed}` +
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
