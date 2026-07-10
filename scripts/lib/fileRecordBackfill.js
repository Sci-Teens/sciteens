// Pure logic for the one-off file-record backfill migration
// (scripts/backfill-file-records.js). Kept dependency-free (no
// firebase-admin) so it can be unit tested without touching Storage or
// Firestore.
//
// This intentionally does NOT import context/helpers.js — that file is
// being edited by a concurrent workstream. The `files` subcollection
// schema this script writes is documented inline below and mirrors the
// contract that stream is wiring into firestore.rules/storage.rules.

const path = require('node:path')

// courses/{slug}/<filename> is server-managed (Prismic webhook /
// fileUpload function) — never scanned for backfill.
const EXCLUDED_PATH_PREFIX = 'courses/'

function isExcludedPath(objectPath) {
  return (
    typeof objectPath === 'string' &&
    objectPath.startsWith(EXCLUDED_PATH_PREFIX)
  )
}

// Storage "directories" are represented as zero-byte objects ending in
// '/' — never a real upload, always skip.
function isDirectoryPlaceholder(objectPath) {
  return (
    typeof objectPath === 'string' &&
    objectPath.endsWith('/')
  )
}

// Classifies a scanned Storage object's path into which owner
// collection (if any) it belongs under, extracting the owner id the
// same way the write-side upload path already lays objects out:
// `projects/{projectId}/<basename>` or `profiles/{uid}/<basename>`.
// Anything else (unknown top-level prefix, or missing a basename
// segment) is not a backfill candidate.
// path -> { kind: 'project' | 'profile', ownerId: string } | { kind: null }
function classifyObjectOwner(objectPath) {
  if (
    typeof objectPath !== 'string' ||
    isExcludedPath(objectPath) ||
    isDirectoryPlaceholder(objectPath)
  ) {
    return { kind: null }
  }

  const segments = objectPath.split('/')
  // Expect exactly <prefix>/<ownerId>/<basename> — deeper nesting isn't
  // part of the current upload layout and isn't a safe guess.
  if (segments.length !== 3) {
    return { kind: null }
  }

  const [prefix, ownerId, basename] = segments
  if (!ownerId || !basename) {
    return { kind: null }
  }

  if (prefix === 'projects') {
    return { kind: 'project', ownerId }
  }
  if (prefix === 'profiles') {
    return { kind: 'profile', ownerId }
  }
  return { kind: null }
}

// A Firebase Storage download URL embeds the encoded object path after
// `/o/`. Given the stored photo URL (project_photo / picture field) and
// a candidate object name, this checks whether that URL points at this
// exact object — used to set `isPhoto` on the backfilled record.
function isPhotoUrlForObject(photoUrl, objectName) {
  if (
    typeof photoUrl !== 'string' ||
    typeof objectName !== 'string' ||
    !photoUrl ||
    !objectName
  ) {
    return false
  }
  const encoded = encodeURIComponent(objectName)
  if (photoUrl.includes(encoded)) return true
  // Fall back to a decoded comparison in case the stored URL used a
  // slightly different (but equivalent) percent-encoding.
  try {
    return decodeURIComponent(photoUrl).includes(objectName)
  } catch {
    // Malformed percent-encoding in a stored URL — not a match.
    return false
  }
}

// Derives the backfilled file-record document shape for a single
// Storage object. `isPhoto` is resolved by the caller (it needs a
// Firestore read against the owner doc) and passed in.
// { object: { name, metadata }, bucketName, isPhoto } -> file record
function buildFileRecord({ object, bucketName, isPhoto }) {
  const metadata = object.metadata || {}
  const originalName =
    metadata.metadata?.originalName ||
    path.posix.basename(object.name)

  return {
    path: object.name,
    bucket: bucketName,
    name: originalName,
    contentType: metadata.contentType,
    size: Number(metadata.size),
    url: `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
      object.name
    )}?alt=media`,
    uploadedBy: null,
    isPhoto: Boolean(isPhoto),
    createdAt: metadata.timeCreated,
  }
}

module.exports = {
  EXCLUDED_PATH_PREFIX,
  isExcludedPath,
  isDirectoryPlaceholder,
  classifyObjectOwner,
  isPhotoUrlForObject,
  buildFileRecord,
}
