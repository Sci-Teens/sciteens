// Pure logic for the one-off legacy-office-file migration
// (scripts/convert-legacy-files.js). Kept dependency-free (no
// firebase-admin, no child_process calls) so it can be unit tested
// without touching Storage or spawning soffice.
//
// This intentionally does NOT import context/helpers.js — that file's
// upload allowlist is being edited by a concurrent workstream, so the
// legacy/allowed MIME lists this script cares about are copied locally
// instead of shared.

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
}
