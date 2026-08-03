#!/usr/bin/env node
// Measures search relevance against a throwaway Meilisearch index, so that a
// change to scripts/lib/meilisearchIndexSettings.js or to the query shape in
// lib/search.js can be justified with numbers instead of intuition. This is
// the battery infra/meilisearch/README.md's "Relevance tuning" section refers
// to; the table there is this script's output.
//
// Usage (against a local container, never production):
//   docker run --rm -p 7701:7700 -e MEILI_MASTER_KEY=devkey \
//     getmeili/meilisearch:v1.48.2
//   MEILI_HOST=http://127.0.0.1:7701 MEILI_MASTER_KEY=devkey \
//     node scripts/eval-meilisearch-relevance.js
//
//   --keep      leave the scratch index in place for manual querying
//   --baseline  also run the pre-tuning settings and print both, so a change
//               is reported as a delta rather than an absolute
//
// Safety: this writes to `projects-relevance-eval`, never to `projects`, and
// deletes that index on the way out. It refuses to run against a host whose
// name suggests production.
'use strict'

const {
  PROJECTS_INDEX_SETTINGS,
} = require('./lib/meilisearchIndexSettings')
const {
  CORPUS,
  QUERIES,
  RANK_ONE_EXPECTATIONS,
  precisionAtK,
  recall,
  reciprocalRank,
  summarize,
} = require('./lib/relevanceBattery')
const { toSearchDocument } = require('../functions/search')

const INDEX = 'projects-relevance-eval'
const HITS_PER_QUERY = 12

// The settings this change replaced, kept only so --baseline can show the
// delta. Do not "fix" these to match the current ones.
const BASELINE_SETTINGS = {
  searchableAttributes: ['title', 'abstract', 'fields'],
  filterableAttributes: ['fields_facet', 'date'],
  sortableAttributes: ['date'],
  rankingRules: [
    'words',
    'typo',
    'proximity',
    'attribute',
    'sort',
    'exactness',
  ],
  stopWords: [],
  synonyms: {},
}

function parseArgs(argv) {
  const args = { keep: false, baseline: false }
  for (const arg of argv) {
    if (arg === '--keep') args.keep = true
    else if (arg === '--baseline') args.baseline = true
    else throw new Error(`Unknown argument: ${arg}`)
  }
  return args
}

function resolveHost() {
  const host = (process.env.MEILI_HOST || '').replace(
    /\/+$/,
    ''
  )
  if (!host || !process.env.MEILI_MASTER_KEY) {
    throw new Error(
      'Usage: MEILI_HOST=<url> MEILI_MASTER_KEY=<key> node scripts/eval-meilisearch-relevance.js'
    )
  }
  // This script creates, overwrites and deletes an index. Running it against
  // the deployed instance would put a synthetic corpus next to real projects.
  if (/run\.app|prod/i.test(host)) {
    throw new Error(
      `Refusing to run against what looks like a deployed host (${host}). Point MEILI_HOST at a local container.`
    )
  }
  return host
}

function makeClient(host) {
  const masterKey = process.env.MEILI_MASTER_KEY
  return async function meili(
    path,
    { method = 'GET', body } = {}
  ) {
    const res = await fetch(`${host}${path}`, {
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
        `${method} ${path} -> ${res.status}: ${text}`
      )
    }
    return text ? JSON.parse(text) : null
  }
}

async function settle(meili) {
  for (let attempt = 0; attempt < 300; attempt++) {
    const pending = await meili(
      '/tasks?statuses=enqueued,processing&limit=1'
    )
    if (pending.results.length === 0) return
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  throw new Error('Meilisearch tasks did not settle')
}

async function runBattery(
  meili,
  { rankingScoreThreshold }
) {
  const rows = []
  for (const { q, relevant } of QUERIES) {
    const result = await meili(`/indexes/${INDEX}/search`, {
      method: 'POST',
      body: {
        q,
        limit: HITS_PER_QUERY,
        rankingScoreThreshold,
      },
    })
    const ids = result.hits.map((hit) => hit.id)
    rows.push({
      query: q,
      hits: ids.length,
      'P@5': Number(precisionAtK(ids, relevant).toFixed(2)),
      recall: Number(recall(ids, relevant).toFixed(2)),
      MRR: Number(reciprocalRank(ids, relevant).toFixed(2)),
      top5: ids.slice(0, 5).join(' '),
    })
  }
  return rows
}

async function checkRankOne(
  meili,
  { rankingScoreThreshold }
) {
  const results = []
  for (const { q, expect, why } of RANK_ONE_EXPECTATIONS) {
    const result = await meili(`/indexes/${INDEX}/search`, {
      method: 'POST',
      body: { q, limit: 3, rankingScoreThreshold },
    })
    const first = result.hits[0]?.id ?? null
    results.push({
      query: q,
      expected: expect,
      actual: first,
      pass: first === expect,
      why,
    })
  }
  return results
}

async function evaluate(meili, label, settings) {
  await meili(`/indexes/${INDEX}/settings`, {
    method: 'PATCH',
    body: settings,
  })
  await settle(meili)
  // Only the tuned configuration is scored behind the relevance floor the
  // app actually sends; the baseline never had one.
  const rankingScoreThreshold =
    settings === BASELINE_SETTINGS ? undefined : 0.2
  const rows = await runBattery(meili, {
    rankingScoreThreshold,
  })
  return {
    label,
    rows,
    summary: summarize(rows),
    rankOne: await checkRankOne(meili, {
      rankingScoreThreshold,
    }),
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2))
  const meili = makeClient(resolveHost())

  await meili(`/indexes/${INDEX}`, {
    method: 'DELETE',
  }).catch(() => {})
  await meili('/indexes', {
    method: 'POST',
    body: { uid: INDEX, primaryKey: 'id' },
  })
  // Indexed through the real mapper, so a toSearchDocument regression shows
  // up here as a relevance drop rather than passing silently.
  await meili(`/indexes/${INDEX}/documents`, {
    method: 'POST',
    body: CORPUS.map((project) =>
      toSearchDocument(project.id, {
        ...project,
        member_arr: project.members.map((display, i) => ({
          uid: `${project.id}-u${i}`,
          display,
          slug: display.toLowerCase().replace(/ /g, '-'),
        })),
      })
    ),
  })
  await settle(meili)

  const runs = []
  if (args.baseline) {
    runs.push(
      await evaluate(meili, 'baseline', BASELINE_SETTINGS)
    )
  }
  runs.push(
    await evaluate(
      meili,
      'current',
      PROJECTS_INDEX_SETTINGS
    )
  )

  for (const run of runs) {
    console.log(`\n=== ${run.label} ===`)
    console.table(run.rows)
    console.table([run.summary])
    console.table(run.rankOne)
  }

  if (!args.keep) {
    await meili(`/indexes/${INDEX}`, { method: 'DELETE' })
  } else {
    console.log(
      `\nLeft index "${INDEX}" in place (--keep).`
    )
  }

  const failures = runs
    .at(-1)
    .rankOne.filter((check) => !check.pass)
  if (failures.length > 0) {
    console.error(
      `\n${failures.length} rank-1 expectation(s) failed:`
    )
    for (const failure of failures) {
      console.error(
        `  "${failure.query}": expected ${failure.expected}, got ${failure.actual} (${failure.why})`
      )
    }
    process.exitCode = 1
  }
}

main().catch((err) => {
  console.error('eval-meilisearch-relevance failed:', err)
  process.exit(1)
})
