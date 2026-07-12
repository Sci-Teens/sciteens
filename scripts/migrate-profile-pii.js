#!/usr/bin/env node
// One-off migration: pages/signup/{student,finish,educator}.js used to
// write `race`, `gender`, and `birthday` straight onto the public
// `profiles/{uid}` doc (`allow read: if true` in firestore.rules),
// exposing every user's demographics and date of birth to any
// unauthenticated reader. Those fields are now written to
// `profiles-private/{uid}` instead (owner-read-only, see
// firestore.rules), and functions/index.js#updateUserStats reads from
// there. This script backfills existing users: for every `profiles/{uid}`
// doc that still has any of the three fields, it copies them into
// `profiles-private/{uid}` and deletes them from the public doc. Not a
// live feature — run manually, once, from a maintainer's machine (or CI
// with deploy credentials).
//
// Usage:
//   node scripts/migrate-profile-pii.js [--execute] [--project <id>]
//
// Defaults to a dry run (lists what would change, makes zero writes).
// Pass --execute to actually write profiles-private and strip the
// fields off profiles.

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const PII_FIELDS = ['race', 'gender', 'birthday']

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

  const admin = require('firebase-admin')
  admin.initializeApp({
    credential: resolveCredential(admin),
    projectId,
  })
  const db = admin.firestore()

  console.log(
    `${
      args.execute ? '[EXECUTE]' : '[DRY RUN]'
    } scanning profiles/ for race/gender/birthday ...`
  )

  const counts = {
    scanned: 0,
    migrated: 0,
    alreadyMigrated: 0,
    clean: 0,
    failed: 0,
  }

  let lastDoc
  const pageSize = 300
  for (;;) {
    let query = db
      .collection('profiles')
      .orderBy('__name__')
      .limit(pageSize)
    if (lastDoc) query = query.startAfter(lastDoc)
    const snap = await query.get()
    if (snap.empty) break

    for (const profileDoc of snap.docs) {
      counts.scanned++
      const uid = profileDoc.id
      const data = profileDoc.data()
      const piiPresent = PII_FIELDS.filter(
        (field) => field in data
      )
      if (piiPresent.length === 0) {
        counts.clean++
        continue
      }

      try {
        const privateRef = db
          .collection('profiles-private')
          .doc(uid)
        const existingPrivate = await privateRef.get()
        if (existingPrivate.exists) {
          counts.alreadyMigrated++
        }

        const privateData = {
          race: data.race || '',
          gender: data.gender || '',
          birthday: data.birthday || '',
        }

        if (!args.execute) {
          console.log(
            `[DRY RUN] would move profiles/${uid} -> profiles-private/${uid}: ${JSON.stringify(
              privateData
            )}`
          )
          counts.migrated++
          continue
        }

        const batch = db.batch()
        batch.set(privateRef, privateData, { merge: true })
        const clearedFields = {}
        for (const field of PII_FIELDS) {
          clearedFields[field] =
            admin.firestore.FieldValue.delete()
        }
        batch.update(profileDoc.ref, clearedFields)
        await batch.commit()

        console.log(`migrated profiles/${uid}`)
        counts.migrated++
      } catch (err) {
        counts.failed++
        console.error(
          `FAILED to migrate profiles/${uid}: ${err.message}`
        )
      }
    }

    lastDoc = snap.docs[snap.docs.length - 1]
    if (snap.docs.length < pageSize) break
  }

  console.log(
    `\nSummary: scanned=${counts.scanned} migrated=${counts.migrated} ` +
      `already-had-private-doc=${counts.alreadyMigrated} clean=${counts.clean} ` +
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
