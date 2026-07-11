// Pure logic for the one-off legacy-office-file migration
// (scripts/convert-legacy-files.js). Kept dependency-free (no
// firebase-admin, no child_process calls) so it can be unit tested
// without touching Storage or spawning soffice.
//
// This intentionally does NOT import context/helpers.js — that file's
// upload allowlist is being edited by a concurrent workstream, so the
// legacy/allowed MIME lists this script cares about are copied locally
// instead of shared.

const path = require('node:path')

// Uploads used to accept these Office formats before the dropzones
// were restricted to images + PDF; any object still stored under one
// of these content types predates that restriction and is a
// conversion candidate.
const LEGACY_MIME_EXTENSIONS = {
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pptx',
}

const LEGACY_OFFICE_MIME_TYPES = Object.keys(
  LEGACY_MIME_EXTENSIONS
)

// Some legacy uploads predate reliable Storage content-type
// detection and sit under a generic type (application/octet-stream)
// instead of the real Office MIME type — confirmed against
// production, where the surviving legacy files are .pptx objects
// stored as application/octet-stream. A project/profile upload named
// *.doc, *.docx, *.ppt, or *.pptx is unambiguous, so the extension
// alone is trusted as a conversion candidate even when the content
// type doesn't say so.
const LEGACY_OFFICE_EXTENSIONS = Object.values(
  LEGACY_MIME_EXTENSIONS
)

function extensionOf(objectPath) {
  const basename =
    typeof objectPath === 'string'
      ? path.posix.basename(objectPath)
      : ''
  const dot = basename.lastIndexOf('.')
  return dot === -1
    ? ''
    : basename.slice(dot + 1).toLowerCase()
}

// Mirrors context/helpers.js's current UPLOAD_MIME_EXTENSIONS keys —
// objects already in one of these types are the expected post-restriction
// shape and are left alone (not "found but not converted").
const CURRENT_ALLOWED_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'application/pdf',
]

// courses/{slug}/<filename> is server-managed (Prismic webhook /
// fileUpload function) — never scanned for conversion or deletion.
const EXCLUDED_PATH_PREFIX = 'courses/'

function isLegacyOfficeMimeType(contentType) {
  return LEGACY_OFFICE_MIME_TYPES.includes(contentType)
}

function isAllowedMimeType(contentType) {
  return CURRENT_ALLOWED_MIME_TYPES.includes(contentType)
}

function isExcludedPath(objectPath) {
  return (
    typeof objectPath === 'string' &&
    objectPath.startsWith(EXCLUDED_PATH_PREFIX)
  )
}

// Buckets a scanned Storage object into the action the CLI should take.
// { path, contentType } -> { action: 'excluded' | 'convert' | 'skip-allowed' | 'skip-unknown' }
function classifyObject({ path: objectPath, contentType }) {
  if (isExcludedPath(objectPath)) {
    return { action: 'excluded' }
  }
  if (isLegacyOfficeMimeType(contentType)) {
    return {
      action: 'convert',
      sourceExtension: LEGACY_MIME_EXTENSIONS[contentType],
    }
  }
  const extension = extensionOf(objectPath)
  if (
    LEGACY_OFFICE_EXTENSIONS.includes(extension) &&
    !isAllowedMimeType(contentType)
  ) {
    return { action: 'convert', sourceExtension: extension }
  }
  if (isAllowedMimeType(contentType)) {
    return { action: 'skip-allowed' }
  }
  return { action: 'skip-unknown' }
}

// Derives the converted PDF's storage path from the legacy object's
// path: same directory prefix (everything up to and including the last
// '/'), fresh generated basename. The original filename is never
// consulted beyond locating its directory — an attacker-controlled or
// path-traversal-looking original name can never leak into the result,
// matching getSafeUploadName's approach in context/helpers.js.
function deriveConvertedObjectPath(originalPath, newId) {
  if (!newId) {
    throw new Error(
      'deriveConvertedObjectPath requires a freshly generated newId'
    )
  }
  const lastSlash = originalPath.lastIndexOf('/')
  const dir =
    lastSlash === -1
      ? ''
      : originalPath.slice(0, lastSlash + 1)
  return `${dir}${newId}.pdf`
}

// soffice writes its output as <input basename without extension>.pdf
// inside --outdir, so this is how the CLI locates the converted file
// on local disk after the conversion call returns.
function deriveLocalConvertedFilename(inputFileName) {
  const dot = inputFileName.lastIndexOf('.')
  const base =
    dot === -1 ? inputFileName : inputFileName.slice(0, dot)
  return `${base}.pdf`
}

// Builds the argv (excluding the binary itself) for a headless,
// single-file soffice conversion. `-env:UserInstallation` pins each
// call to its own throwaway profile dir so concurrent/repeat runs
// never contend for a shared LibreOffice profile lock.
function buildSofficeConvertArgv({
  inputPath,
  outputDir,
  profileDir,
}) {
  if (!inputPath || !outputDir || !profileDir) {
    throw new Error(
      'buildSofficeConvertArgv requires inputPath, outputDir, and profileDir'
    )
  }
  return [
    `-env:UserInstallation=file://${profileDir}`,
    '--headless',
    '--convert-to',
    'pdf',
    '--outdir',
    outputDir,
    inputPath,
  ]
}

// The commit that made a Firestore `files` subcollection the sole
// source of truth for "what files does this project/profile have"
// (see scripts/lib/fileRecordBackfill.js) means a converted PDF needs
// a Firestore record of its own, and the legacy object's old record
// (if one exists) needs to go — otherwise the conversion either
// leaves the file invisible in the app (no record) or leaves a dead
// record pointing at a Storage object that no longer exists. These
// two helpers build that swap's contents without touching
// Storage/Firestore themselves, so they stay unit-testable like the
// rest of this file.

// Keeps the original display filename recognizable after conversion —
// "Slides.pptx" becomes "Slides.pdf" rather than a random UUID — by
// swapping only the extension. Falls back to the converted object's
// own generated basename when there's no previous record to carry a
// name over from (the legacy object predates the file-record model
// and was never backfilled).
function deriveConvertedDisplayName(
  previousName,
  fallbackBasename
) {
  if (!previousName) return fallbackBasename
  const dot = previousName.lastIndexOf('.')
  const base =
    dot === -1 ? previousName : previousName.slice(0, dot)
  return `${base}.pdf`
}

// Mirrors context/helpers.js's buildFileRecord shape exactly (that
// file isn't imported here — see the file header — but the schema is
// a contract shared with firestore.rules and every reader of the
// `files` subcollection). `previousRecord` is the old Firestore doc
// for the legacy object being replaced, if one existed (from a prior
// backfill run or the original upload flow) — its `uploadedBy`/`name`
// carry over so converting a file doesn't strip who uploaded it or
// rename it out from under them.
function buildConvertedFileRecord({
  newPath,
  bucketName,
  size,
  previousRecord,
}) {
  const basename = path.posix.basename(newPath)
  return {
    path: newPath,
    bucket: bucketName,
    name: deriveConvertedDisplayName(
      previousRecord?.name,
      basename
    ),
    contentType: 'application/pdf',
    size,
    url: `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
      newPath
    )}?alt=media`,
    uploadedBy: previousRecord?.uploadedBy ?? null,
    isPhoto: false,
    thumbnailUrl: null,
    createdAt: new Date().toISOString(),
  }
}

module.exports = {
  LEGACY_MIME_EXTENSIONS,
  LEGACY_OFFICE_MIME_TYPES,
  CURRENT_ALLOWED_MIME_TYPES,
  EXCLUDED_PATH_PREFIX,
  isLegacyOfficeMimeType,
  isAllowedMimeType,
  isExcludedPath,
  classifyObject,
  deriveConvertedObjectPath,
  deriveLocalConvertedFilename,
  buildSofficeConvertArgv,
  deriveConvertedDisplayName,
  buildConvertedFileRecord,
}
