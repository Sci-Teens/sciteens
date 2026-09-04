#!/usr/bin/env node
// Creates the Meilisearch indexes and a search-only API key.
//
// Usage:
//   MEILI_HOST=https://meilisearch-xxxx.a.run.app \
//   MEILI_MASTER_KEY=<master key from Secret Manager> \
//   node scripts/setup-meilisearch.js
//
// The script is safe to run more than once. Each run creates a new search
// key because Meilisearch does not show an existing key value.
'use strict'

const {
  OPPORTUNITIES_INDEX_SETTINGS,
  PROJECTS_INDEX_SETTINGS,
} = require('./lib/meilisearchIndexSettings')

const INDEXES = [
  { uid: 'projects', settings: PROJECTS_INDEX_SETTINGS },
  {
    uid: 'opportunities',
    settings: OPPORTUNITIES_INDEX_SETTINGS,
  },
]

const host = (process.env.MEILI_HOST || '').replace(
  /\/+$/,
  ''
)
const masterKey = process.env.MEILI_MASTER_KEY

if (!host || !masterKey) {
  console.error(
    'Set MEILI_HOST and MEILI_MASTER_KEY before you run this script.'
  )
  process.exit(1)
}

async function meili(path, { method = 'GET', body } = {}) {
  const res = await fetch(`${host}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${masterKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  const text = await res.text()
  const json = text ? JSON.parse(text) : null
  if (!res.ok) {
    throw new Error(
      `${method} ${path} -> ${res.status}: ${text}`
    )
  }
  return json
}

async function ensureIndex(index) {
  try {
    await meili('/indexes', {
      method: 'POST',
      body: { uid: index.uid, primaryKey: 'id' },
    })
    console.log(`Created the "${index.uid}" index.`)
  } catch (err) {
    if (
      String(err.message).includes('index_already_exists')
    ) {
      console.log(
        `The "${index.uid}" index already exists.`
      )
      return
    }
    throw err
  }
}

async function applySettings(index) {
  await meili(`/indexes/${index.uid}/settings`, {
    method: 'PATCH',
    body: index.settings,
  })
  console.log(`Applied the "${index.uid}" index settings.`)
}

async function createSearchKey() {
  const key = await meili('/keys', {
    method: 'POST',
    body: {
      name: 'sciteens-search',
      description:
        'Search-only key for the SciTeens API routes. The browser never receives this key.',
      actions: ['search'],
      indexes: INDEXES.map(({ uid }) => uid),
      expiresAt: null,
    },
  })
  console.log('Created a search-only API key.')
  console.log(
    'Store this value as MEILI_SEARCH_KEY. Meilisearch shows it one time.'
  )
  console.log(`  ${key.key}`)
}

async function main() {
  for (const index of INDEXES) {
    await ensureIndex(index)
    await applySettings(index)
  }
  await createSearchKey()
  console.log('The Meilisearch setup is complete.')
}

main().catch((err) => {
  console.error('The Meilisearch setup failed.', err)
  process.exit(1)
})
