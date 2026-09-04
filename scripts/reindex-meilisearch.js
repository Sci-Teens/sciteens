#!/usr/bin/env node
// Rebuilds the Meilisearch indexes from Firestore.
//
// Usage:
//   MEILI_HOST=https://meilisearch-xxxx.a.run.app \
//   MEILI_MASTER_KEY=<master key from Secret Manager> \
//   node scripts/reindex-meilisearch.js [--execute] [--project <id>] \
//     [--index projects|opportunities]
//
// The default dry run reports writes and stale documents. The --execute
// option applies the index settings, upserts source documents, and deletes
// stale search documents.
'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')

const {
  OPPORTUNITIES_INDEX_SETTINGS,
  PROJECTS_INDEX_SETTINGS,
} = require('./lib/meilisearchIndexSettings')
const {
  toOpportunitySearchDocument,
  toSearchDocument,
} = require('../functions/search')

const BATCH_SIZE = 200
const INDEXES = [
  {
    uid: 'projects',
    collection: 'projects',
    settings: PROJECTS_INDEX_SETTINGS,
    toDocument: toSearchDocument,
  },
  {
    uid: 'opportunities',
    collection: 'opportunities',
    settings: OPPORTUNITIES_INDEX_SETTINGS,
    toDocument: toOpportunitySearchDocument,
    sourceCollection: 'opportunity-sources',
  },
]

function parseArgs(argv) {
  const args = {
    execute: false,
    project: undefined,
    index: undefined,
  }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    if (arg === '--execute') {
      args.execute = true
    } else if (arg === '--project' || arg === '--index') {
      const value = argv[++i]
      if (!value || value.startsWith('--')) {
        throw new Error(`${arg} requires a value.`)
      }
      if (arg === '--project') args.project = value
      else args.index = value
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }
  if (
    args.index &&
    !INDEXES.some(({ uid }) => uid === args.index)
  ) {
    throw new Error(
      '--index must be projects or opportunities.'
    )
  }
  return args
}

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
      'Application Default Credentials are not available. The script uses GCLOUD_ACCESS_TOKEN.'
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
      'Credentials are not available. Run `gcloud auth application-default login` or set GOOGLE_APPLICATION_CREDENTIALS.'
    )
  }
  console.log(
    'Application Default Credentials are not available. The script uses `gcloud auth print-access-token`.'
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

async function waitForMeiliTask(meili, task) {
  if (!task || !Number.isInteger(task.taskUid)) return
  const deadline = Date.now() + 5 * 60 * 1000
  while (Date.now() < deadline) {
    const status = await meili(`/tasks/${task.taskUid}`)
    if (status.status === 'succeeded') return
    if (
      status.status === 'failed' ||
      status.status === 'canceled'
    ) {
      throw new Error(
        `Meilisearch task ${task.taskUid} ${
          status.status
        }: ${JSON.stringify(status.error || null)}`
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
  throw new Error(
    `Meilisearch task ${task.taskUid} timed out`
  )
}

async function readIndexedDocumentIds(meili, indexUid) {
  const ids = new Set()
  const limit = 1000
  for (let offset = 0; ; offset += limit) {
    const page = await meili(
      `/indexes/${indexUid}/documents?fields=id&limit=${limit}&offset=${offset}`
    )
    const results = Array.isArray(page?.results)
      ? page.results
      : []
    for (const document of results) {
      if (typeof document.id === 'string') {
        ids.add(document.id)
      }
    }
    if (results.length < limit) return ids
  }
}

function deleteDocumentBatch(meili, indexUid, ids) {
  return meili(
    `/indexes/${indexUid}/documents/delete-batch`,
    {
      method: 'POST',
      body: ids,
    }
  )
}

async function sourceDataById(db, index, documents) {
  if (!index.sourceCollection) return new Map()
  const snapshots = await db.getAll(
    ...documents.map((document) =>
      db.collection(index.sourceCollection).doc(document.id)
    )
  )
  return new Map(
    snapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => [snapshot.id, snapshot.data()])
  )
}

async function reindexCollection({
  args,
  db,
  host,
  index,
  meili,
}) {
  const mode = args.execute ? '[EXECUTE]' : '[DRY RUN]'
  console.log(
    `${mode} Reindex ${index.collection} into ${host}.`
  )
  const indexedIds = await readIndexedDocumentIds(
    meili,
    index.uid
  )

  if (args.execute) {
    const settingsTask = await meili(
      `/indexes/${index.uid}/settings`,
      {
        method: 'PATCH',
        body: index.settings,
      }
    )
    await waitForMeiliTask(meili, settingsTask)
    console.log(
      `Applied the "${index.uid}" index settings.`
    )
  }

  let lastDoc
  let scanned = 0
  let sent = 0
  try {
    for (;;) {
      let query = db
        .collection(index.collection)
        .orderBy('__name__')
        .limit(BATCH_SIZE)
      if (lastDoc) query = query.startAfter(lastDoc)
      const snapshot = await query.get()
      if (snapshot.empty) break

      const sourceData = await sourceDataById(
        db,
        index,
        snapshot.docs
      )
      const documents = snapshot.docs.map((doc) => {
        const data = doc.data()
        const source = sourceData.get(doc.id)
        return index.toDocument(doc.id, {
          ...data,
          sourceCategory:
            data.sourceCategory || source?.category || '',
        })
      })
      for (const document of documents) {
        indexedIds.delete(document.id)
      }
      scanned += documents.length

      if (args.execute) {
        const task = await meili(
          `/indexes/${index.uid}/documents`,
          {
            method: 'POST',
            body: documents,
          }
        )
        await waitForMeiliTask(meili, task)
        sent += documents.length
      }

      lastDoc = snapshot.docs[snapshot.docs.length - 1]
      console.log(
        `${scanned} ${index.collection} documents processed.`
      )
      if (snapshot.docs.length < BATCH_SIZE) break
    }
  } catch (err) {
    console.error(
      `${index.uid} stopped after ${scanned} reads and ${sent} writes. The index is partially updated.`
    )
    throw err
  }

  let deleted = 0
  const staleIds = [...indexedIds]
  if (args.execute) {
    for (
      let offset = 0;
      offset < staleIds.length;
      offset += BATCH_SIZE
    ) {
      const batch = staleIds.slice(
        offset,
        offset + BATCH_SIZE
      )
      const task = await deleteDocumentBatch(
        meili,
        index.uid,
        batch
      )
      await waitForMeiliTask(meili, task)
      deleted += batch.length
    }
  }

  console.log(
    `${mode} ${index.uid} complete. Read ${scanned}, wrote ${sent}, and deleted ${deleted} stale documents.`
  )
  if (!args.execute) {
    console.log(
      `${staleIds.length} stale documents will be deleted.`
    )
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
      'Set MEILI_HOST and MEILI_MASTER_KEY before you run this script.'
    )
  }

  const projectId =
    args.project || process.env.NEXT_PUBLIC_FB_PROJECT_ID
  if (!projectId) {
    throw new Error(
      'Pass --project <id> or set NEXT_PUBLIC_FB_PROJECT_ID.'
    )
  }

  const meili = makeMeiliClient(host, masterKey)
  const admin = require('firebase-admin')
  admin.initializeApp({
    credential: resolveCredential(admin),
    projectId,
  })
  const db = admin.firestore()
  const selectedIndexes = args.index
    ? INDEXES.filter(({ uid }) => uid === args.index)
    : INDEXES

  for (const index of selectedIndexes) {
    await reindexCollection({
      args,
      db,
      host,
      index,
      meili,
    })
  }
  if (!args.execute) {
    console.log(
      'Run this command with --execute to write data.'
    )
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error('The Meilisearch reindex failed.', err)
    process.exit(1)
  })
}

module.exports = {
  deleteDocumentBatch,
  loadEnvLocal,
  parseArgs,
}
