#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const path = require('node:path')

const {
  buildCoverFromBuffer,
  coverObjectPath,
  coverDownloadUrl,
  defaultBucketName,
  extForFilename,
  uploadCoverWebp,
} = require('./lib/programImages')

const LEGACY_IMAGE_DIR = path.join(
  __dirname,
  '..',
  'public',
  'assets',
  'programs'
)
const LEGACY_URL_PREFIX = '/assets/programs/'
const SOURCE_EXT_PRIORITY = ['png', 'jpg', 'svg', 'webp']

function parseArgs(argv) {
  let project
  let bucket
  let dryRun = false
  const slugs = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project') project = argv[++i]
    else if (argv[i] === '--bucket') bucket = argv[++i]
    else if (argv[i] === '--dry-run') dryRun = true
    else slugs.push(argv[i])
  }
  return { project, bucket, dryRun, slugs }
}

function preferredSource(candidates) {
  const ranked = [...candidates].sort(
    (a, b) =>
      SOURCE_EXT_PRIORITY.indexOf(a.ext) -
      SOURCE_EXT_PRIORITY.indexOf(b.ext)
  )
  return ranked[0]
}

function groupLegacyImagesBySlug(requestedSlugs) {
  if (!fs.existsSync(LEGACY_IMAGE_DIR)) return []
  const bySlug = new Map()
  for (const filename of fs.readdirSync(LEGACY_IMAGE_DIR)) {
    const ext = extForFilename(filename)
    const slug = filename.replace(/\.[^.]+$/, '')
    if (
      requestedSlugs.length &&
      !requestedSlugs.includes(slug)
    ) {
      continue
    }
    const entry = { slug, filename, ext }
    bySlug.set(slug, [...(bySlug.get(slug) || []), entry])
  }
  return [...bySlug.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([slug, candidates]) => ({
      slug,
      chosen: preferredSource(candidates),
      skipped: candidates.filter(
        (c) => c !== preferredSource(candidates)
      ),
    }))
}

async function uploadLegacyCover(bucket, entry, dryRun) {
  const buffer = fs.readFileSync(
    path.join(LEGACY_IMAGE_DIR, entry.chosen.filename)
  )
  const { webp, imageFit } = await buildCoverFromBuffer(
    buffer,
    entry.chosen.ext,
    { skipDimensionGate: true }
  )
  if (dryRun) {
    return {
      imageUrl: coverDownloadUrl(
        bucket.name,
        coverObjectPath(entry.slug)
      ),
      imageFit,
      bytesBefore: buffer.length,
      bytesAfter: webp.length,
    }
  }
  const imageUrl = await uploadCoverWebp(
    bucket,
    entry.slug,
    webp
  )
  return {
    imageUrl,
    imageFit,
    bytesBefore: buffer.length,
    bytesAfter: webp.length,
  }
}

async function repointLegacyDocs(db, uploaded, dryRun) {
  const snap = await db.collection('opportunities').get()
  const repointed = []
  for (const doc of snap.docs) {
    const current = doc.data().imageUrl
    if (
      typeof current !== 'string' ||
      !current.startsWith(LEGACY_URL_PREFIX)
    ) {
      continue
    }
    const cover = uploaded.get(doc.id)
    if (!cover) continue
    if (!dryRun) {
      await doc.ref.set(
        {
          imageUrl: cover.imageUrl,
          imageFit: cover.imageFit,
        },
        { merge: true }
      )
    }
    repointed.push(doc.id)
  }
  return repointed
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const projectId =
    args.project || process.env.NEXT_PUBLIC_FB_PROJECT_ID
  if (!projectId) {
    throw new Error(
      'No project id: pass --project <id> or set NEXT_PUBLIC_FB_PROJECT_ID.'
    )
  }
  const bucketName =
    args.bucket ||
    process.env.FIREBASE_STORAGE_BUCKET ||
    defaultBucketName(projectId)

  const entries = groupLegacyImagesBySlug(args.slugs)
  if (!entries.length) {
    console.log(
      `No legacy images found under ${LEGACY_IMAGE_DIR}. Nothing to migrate.`
    )
    return
  }

  const admin = require('firebase-admin')
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
    storageBucket: bucketName,
  })
  const db = admin.firestore()
  const bucket = admin.storage().bucket()

  console.log(
    `Migrating ${entries.length} program image(s) to gs://${bucketName}/opportunities, dryRun=${args.dryRun}`
  )

  const uploaded = new Map()
  const failures = []
  let bytesBefore = 0
  let bytesAfter = 0

  for (const entry of entries) {
    process.stdout.write(`${entry.slug}: `)
    try {
      const cover = await uploadLegacyCover(
        bucket,
        entry,
        args.dryRun
      )
      uploaded.set(entry.slug, cover)
      bytesBefore += cover.bytesBefore
      bytesAfter += cover.bytesAfter
      const skippedNote = entry.skipped.length
        ? ` (ignored ${entry.skipped
            .map((s) => s.filename)
            .join(', ')})`
        : ''
      console.log(
        `${entry.chosen.filename} -> cover.webp ${cover.imageFit} ${cover.bytesBefore}b->${cover.bytesAfter}b${skippedNote}`
      )
    } catch (err) {
      failures.push({
        slug: entry.slug,
        error: err.message,
      })
      console.log(`FAILED (${err.message})`)
    }
  }

  const repointed = await repointLegacyDocs(
    db,
    uploaded,
    args.dryRun
  )

  console.log(
    `\n${uploaded.size}/${entries.length} uploaded, ${bytesBefore}b -> ${bytesAfter}b`
  )
  console.log(
    `${repointed.length} opportunities doc(s) repointed off ${LEGACY_URL_PREFIX}`
  )
  if (failures.length) {
    console.log('\nFailed:')
    failures.forEach((f) =>
      console.log(`  ${f.slug}: ${f.error}`)
    )
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error(
    'migrate-program-images-to-storage failed:',
    err
  )
  process.exit(1)
})
