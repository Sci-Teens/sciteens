#!/usr/bin/env node
// One-time (and re-run-safe) operator script: provisions the `projects`
// index on a fresh Meilisearch instance and prints a scoped search-only
// API key to store as MEILI_SEARCH_KEY.
//
// Usage:
//   MEILI_HOST=https://meilisearch-xxxx.a.run.app \
//   MEILI_MASTER_KEY=<master key from Secret Manager> \
//   node scripts/setup-meilisearch.js
//
// Safe to re-run: index creation and settings updates are idempotent, and
// re-running only prints a *new* search key (Meilisearch does not let you
// recover a key's plaintext after creation) — if you already have one
// deployed, keep it and skip updating MEILI_SEARCH_KEY.
'use strict'

const host = (process.env.MEILI_HOST || '').replace(
  /\/+$/,
  ''
)
const masterKey = process.env.MEILI_MASTER_KEY

if (!host || !masterKey) {
  console.error(
    'Usage: MEILI_HOST=<url> MEILI_MASTER_KEY=<key> node scripts/setup-meilisearch.js'
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

// Meilisearch task queue is async — most of the calls below return a task
// object immediately. We don't need to block on task completion for a
// one-time setup script; a search or key-creation call issued moments
// later against the same index will simply see settings apply shortly
// after, and the index itself accepts writes immediately upon creation.
async function ensureIndex() {
  try {
    await meili('/indexes', {
      method: 'POST',
      body: { uid: 'projects', primaryKey: 'id' },
    })
    console.log('Created index "projects".')
  } catch (err) {
    if (
      String(err.message).includes('index_already_exists')
    ) {
      console.log('Index "projects" already exists.')
    } else {
      throw err
    }
  }
}

async function applySettings() {
  await meili('/indexes/projects/settings', {
    method: 'PATCH',
    body: {
      searchableAttributes: ['title', 'abstract', 'fields'],
      filterableAttributes: ['fields_facet', 'date'],
      sortableAttributes: ['date'],
      // Rank an exact/near-exact title match above a loose abstract
      // match, then fall back to Meilisearch's default relevance rules.
      rankingRules: [
        'words',
        'typo',
        'proximity',
        'attribute',
        'sort',
        'exactness',
      ],
    },
  })
  console.log('Applied index settings.')
}

async function createSearchKey() {
  const key = await meili('/keys', {
    method: 'POST',
    body: {
      name: 'sciteens-projects-search',
      description:
        'Read-only search key for the /api/search/projects proxy. Never exposed to the browser.',
      actions: ['search'],
      indexes: ['projects'],
      expiresAt: null,
    },
  })
  console.log('\nCreated a scoped search-only API key.')
  console.log(
    'Store this as MEILI_SEARCH_KEY (Secret Manager / functions & website env) — it is shown once:\n'
  )
  console.log(`  ${key.key}\n`)
}

async function main() {
  await ensureIndex()
  await applySettings()
  await createSearchKey()
  console.log('Setup complete.')
}

main().catch((err) => {
  console.error('setup-meilisearch failed:', err)
  process.exit(1)
})
