// Server-side proxy in front of the self-hosted Meilisearch `projects`
// index (see functions/search.js for the indexer, infra/meilisearch/ for
// the Cloud Run deployment). The client never talks to Meilisearch
// directly and never sees MEILI_HOST or MEILI_SEARCH_KEY — unlike the
// Algolia Firebase Extension this replaces, where a search-only key was
// shipped straight into the client bundle (NEXT_PUBLIC_AL_SEARCH_KEY).
// Meilisearch itself is also not required to be reachable from anywhere
// but this server process (see infra/meilisearch/README.md's access
// control section).
import {
  buildProjectSearchParams,
  formatFieldFacets,
  mapSearchHitToProject,
} from '@/lib/search'

const REQUEST_TIMEOUT_MS = 8000

function meiliHost() {
  const host = process.env.MEILI_HOST
  return host ? host.replace(/\/+$/, '') : null
}

async function meiliSearch(params) {
  const host = meiliHost()
  if (!host) {
    throw Object.assign(
      new Error('Search is not configured'),
      { statusCode: 503 }
    )
  }
  const searchKey = process.env.MEILI_SEARCH_KEY
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT_MS
  )
  try {
    const res = await fetch(
      `${host}/indexes/projects/search`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(searchKey && {
            Authorization: `Bearer ${searchKey}`,
          }),
        },
        body: JSON.stringify(params),
        signal: controller.signal,
      }
    )
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      throw Object.assign(
        new Error(
          `Meilisearch search failed: ${res.status} ${text}`
        ),
        { statusCode: 502 }
      )
    }
    return res.json()
  } finally {
    clearTimeout(timeout)
  }
}

function parseIntParam(value, fallback) {
  const parsed = parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const {
    q = '',
    field,
    dateFrom,
    dateTo,
    sort,
    page,
  } = req.query

  try {
    const params = buildProjectSearchParams({
      search: Array.isArray(q) ? q[0] : q,
      field: Array.isArray(field) ? field[0] : field,
      dateFrom: Array.isArray(dateFrom)
        ? dateFrom[0]
        : dateFrom,
      dateTo: Array.isArray(dateTo) ? dateTo[0] : dateTo,
      sort: Array.isArray(sort) ? sort[0] : sort,
      page: parseIntParam(
        Array.isArray(page) ? page[0] : page,
        0
      ),
    })

    const result = await meiliSearch(params)

    res.setHeader('Cache-Control', 'private, no-store')
    res.status(200).json({
      projects: (result.hits || []).map(
        mapSearchHitToProject
      ),
      totalHits: result.estimatedTotalHits ?? 0,
      facets: formatFieldFacets(result.facetDistribution),
      page: Math.floor(
        (result.offset ?? 0) / (result.limit || 1)
      ),
      hasNextPage:
        (result.offset ?? 0) + (result.hits?.length ?? 0) <
        (result.estimatedTotalHits ?? 0),
    })
  } catch (err) {
    console.error('search/projects failed:', err)
    res
      .status(err.statusCode || 500)
      .json({ error: 'Search is temporarily unavailable' })
  }
}
