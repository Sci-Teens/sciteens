#!/usr/bin/env node
// One-off migration: before uploads were restricted to image/png,jpg,jpeg
// + application/pdf (context/helpers.js UPLOAD_MIME_EXTENSIONS), users
// could upload .doc/.docx/.ppt/.pptx to their profile/project Storage
// folders. This walks the whole bucket (except courses/, which is
// server-managed), converts any surviving legacy Office file to PDF via
// a local headless LibreOffice, uploads the PDF under a freshly
// generated name in the same directory, and deletes the original. Not a
// live feature — run manually, once, from a maintainer's machine.
//
// Usage:
//   node scripts/convert-legacy-files.js [--execute] [--project <id>]
//     [--bucket <name>] [--soffice-bin <path>] [--prefix <storage-prefix>]
//
// Defaults to a dry run (lists what would happen, makes zero writes).
// Pass --execute to actually convert + upload + delete.

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const crypto = require('node:crypto')
const {
  execFile,
  execFileSync,
} = require('node:child_process')
const { promisify } = require('node:util')
const execFileAsync = promisify(execFile)

const {
  classifyObject,
  deriveConvertedObjectPath,
  deriveLocalConvertedFilename,
  buildSofficeConvertArgv,
  buildConvertedFileRecord,
} = require('./lib/legacyFileConversion')
const {
  classifyObjectOwner,
} = require('./lib/fileRecordBackfill')

const SOFFICE_TIMEOUT_MS = 120_000

function parseArgs(argv) {
  const args = {
    execute: false,
    project: undefined,
    bucket: undefined,
    sofficeBin: undefined,
    prefix: '',
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--execute') {
      args.execute = true
    } else if (arg === '--project') {
      args.project = argv[++i]
    } else if (arg === '--bucket') {
      args.bucket = argv[++i]
    } else if (arg === '--soffice-bin') {
      args.sofficeBin = argv[++i]
    } else if (arg === '--prefix') {
      args.prefix = argv[++i]
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

// soffice crashes are the most likely failure mode on a machine that
// hasn't set this up before, so this checks and explains itself before
// any Storage call is made.
function resolveAndVerifySofficeBin(sofficeBinArg) {
  const bin =
    sofficeBinArg || process.env.SOFFICE_BIN || 'soffice'
  try {
    execFileSync(bin, ['--version'], { stdio: 'pipe' })
  } catch (err) {
    throw new Error(
      `Could not run "${bin} --version" (${err.message}).\n` +
        'LibreOffice headless is required for this script. Install it, e.g.:\n' +
        '  Debian/Ubuntu: sudo apt-get install -y libreoffice\n' +
        '  macOS:         brew install --cask libreoffice\n' +
        'or pass --soffice-bin <path> / set SOFFICE_BIN to point at an existing install.'
    )
  }
  return bin
}

async function convertOneFile({
  bucket,
  db,
  file,
  contentType,
  sourceExtension,
  sofficeBin,
}) {
  const tmpDir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'legacy-convert-')
  )
  try {
    const inputFileName = `input.${sourceExtension}`
    const inputPath = path.join(tmpDir, inputFileName)
    const outputDir = path.join(tmpDir, 'out')
    const profileDir = path.join(tmpDir, 'lo-profile')
    fs.mkdirSync(outputDir)

    const [buffer] = await file.download()
    fs.writeFileSync(inputPath, buffer)

    const argv = buildSofficeConvertArgv({
      inputPath,
      outputDir,
      profileDir,
    })
    await execFileAsync(sofficeBin, argv, {
      timeout: SOFFICE_TIMEOUT_MS,
    })

    const outputFileName =
      deriveLocalConvertedFilename(inputFileName)
    const outputPath = path.join(outputDir, outputFileName)
    if (!fs.existsSync(outputPath)) {
      throw new Error(
        `soffice reported success but produced no output file at ${outputPath}`
      )
    }
    const pdfBuffer = fs.readFileSync(outputPath)
    if (
      pdfBuffer.length === 0 ||
      pdfBuffer.subarray(0, 5).toString('latin1') !==
        '%PDF-'
    ) {
      throw new Error(
        'converted output is not a valid PDF (missing %PDF- header)'
      )
    }

    const newId = crypto.randomUUID()
    const newPath = deriveConvertedObjectPath(
      file.name,
      newId
    )
    await bucket.file(newPath).save(pdfBuffer, {
      contentType: 'application/pdf',
      metadata: {
        metadata: {
          convertedFrom: file.name,
          convertedFromContentType: contentType,
        },
      },
    })

    // The `files` Firestore subcollection is now the sole source of
    // truth the app reads from (see scripts/lib/fileRecordBackfill.js)
    // — a Storage-only swap would leave the converted PDF invisible
    // (no record) and, if the legacy object had already been
    // backfilled, a dead record behind pointing at nothing. Anything
    // outside a projects/{id}/ or profiles/{uid}/ prefix never had a
    // record to begin with, so there's nothing to sync.
    const owner = classifyObjectOwner(file.name)
    let firestoreSynced = false
    if (owner.kind) {
      const ownerCollection =
        owner.kind === 'project' ? 'projects' : 'profiles'
      const oldBasename = path.posix.basename(file.name)
      const oldDocRef = db
        .collection(ownerCollection)
        .doc(owner.ownerId)
        .collection('files')
        .doc(oldBasename)
      const oldSnap = await oldDocRef.get()
      const previousRecord = oldSnap.exists
        ? oldSnap.data()
        : null

      const record = buildConvertedFileRecord({
        newPath,
        bucketName: bucket.name,
        size: pdfBuffer.length,
        previousRecord,
      })

      const newDocRef = db
        .collection(ownerCollection)
        .doc(owner.ownerId)
        .collection('files')
        .doc(path.posix.basename(newPath))
      await newDocRef.set(record)
      if (oldSnap.exists) {
        await oldDocRef.delete()
      }
      firestoreSynced = true
    }

    await file.delete()
    return { newPath, firestoreSynced }
  } finally {
    fs.rmSync(tmpDir, {
      recursive: true,
      force: true,
    })
  }
}

// Prefers real Application Default Credentials (`gcloud auth
// application-default login`, or GOOGLE_APPLICATION_CREDENTIALS
// pointing at a service account key) when present. Falls back to a
// pre-fetched GCLOUD_ACCESS_TOKEN env var (handy when running inside a
// container that has soffice but not the gcloud CLI — fetch the token
// on the host with `gcloud auth print-access-token` and pass it
// through), then to the gcloud CLI's own user login (`gcloud auth
// login` — a separate, more commonly-already-done step) by
// re-shelling to `gcloud auth print-access-token` on every token
// fetch, which naturally handles refresh across a long-running scan
// without caching an expiring token.
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

async function main() {
  const args = parseArgs(process.argv.slice(2))
  loadEnvLocal(path.resolve(__dirname, '..'))

  const sofficeBin = resolveAndVerifySofficeBin(
    args.sofficeBin
  )

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

  console.log(
    `${
      args.execute ? '[EXECUTE]' : '[DRY RUN]'
    } scanning gs://${bucketName}/${args.prefix} ...`
  )

  const [files] = await bucket.getFiles({
    prefix: args.prefix,
  })

  const counts = {
    scanned: 0,
    converted: 0,
    firestoreSynced: 0,
    skippedUnknown: 0,
    failed: 0,
  }

  for (const file of files) {
    // Storage "directories" are represented as zero-byte objects
    // ending in '/' — never a real upload, always skip.
    if (file.name.endsWith('/')) continue
    counts.scanned++

    const contentType =
      file.metadata?.contentType ||
      (await file.getMetadata())[0]?.contentType

    const classification = classifyObject({
      path: file.name,
      contentType,
    })

    if (
      classification.action === 'excluded' ||
      classification.action === 'skip-allowed'
    ) {
      continue
    }

    if (classification.action === 'skip-unknown') {
      counts.skippedUnknown++
      console.log(
        `found but not converted (unknown type): ${file.name} (${contentType})`
      )
      continue
    }

    // classification.action === 'convert'
    if (!args.execute) {
      const owner = classifyObjectOwner(file.name)
      const firestoreNote = owner.kind
        ? `, syncing its ${owner.kind} Firestore file record`
        : ' (no owned projects/profiles prefix — no Firestore record to sync)'
      console.log(
        `[DRY RUN] would convert: ${file.name} (${contentType}) -> new PDF in same directory, then delete original${firestoreNote}`
      )
      counts.converted++
      continue
    }

    try {
      const { newPath, firestoreSynced } =
        await convertOneFile({
          bucket,
          db,
          file,
          contentType,
          sourceExtension: classification.sourceExtension,
          sofficeBin,
        })
      console.log(
        `converted: ${file.name} (${contentType}) -> ${newPath} (original deleted` +
          (firestoreSynced
            ? ', Firestore file record synced)'
            : ', no Firestore record to sync)')
      )
      counts.converted++
      if (firestoreSynced) counts.firestoreSynced++
    } catch (err) {
      counts.failed++
      console.error(
        `FAILED to convert ${file.name} (${contentType}): ${err.message}`
      )
    }
  }

  console.log(
    `\nSummary: scanned=${counts.scanned} converted=${counts.converted} ` +
      `firestore-synced=${counts.firestoreSynced} ` +
      `skipped-unknown-type=${counts.skippedUnknown} failed=${counts.failed}` +
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
