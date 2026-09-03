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
  buildProjectSearchQueries,
  formatFieldFacets,
  mapSearchHitToProject,
} from '@/lib/search'
import { meiliMultiSearch } from '@/lib/meilisearchServer'

// The page clamp limits the work from user-controlled offsets.
const MAX_SEARCH_PAGE = 200
const MAX_QUERY_LENGTH = 200

function parsePageParam(value) {
  const parsed = parseInt(value, 10)
  if (!Number.isFinite(parsed)) return 0
  return Math.min(Math.max(parsed, 0), MAX_SEARCH_PAGE)
}

function firstParam(value) {
  return Array.isArray(value) ? value[0] : value
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
    const pageParam = parsePageParam(firstParam(page))
    const queries = buildProjectSearchQueries({
      search: String(firstParam(q) ?? '').slice(
        0,
        MAX_QUERY_LENGTH
      ),
      field: String(firstParam(field) ?? '').slice(
        0,
        MAX_QUERY_LENGTH
      ),
      dateFrom: firstParam(dateFrom),
      dateTo: firstParam(dateTo),
      sort: firstParam(sort),
      page: pageParam,
    })

    const { results = [] } = await meiliMultiSearch(queries)
    const [result = {}, facetResult = {}] = results

    res.setHeader('Cache-Control', 'private, no-store')
    res.status(200).json({
      projects: (result.hits || []).map(
        mapSearchHitToProject
      ),
      totalHits: result.estimatedTotalHits ?? 0,
      facets: formatFieldFacets(
        facetResult.facetDistribution
      ),
      page: Math.floor(
        (result.offset ?? 0) / (result.limit || 1)
      ),
      // Closed at the clamp, not just at the end of the result set:
      // pages/projects.js drives its infinite query off this flag, so
      // leaving it true past MAX_SEARCH_PAGE re-appends the last page
      // forever instead of stopping.
      hasNextPage:
        pageParam < MAX_SEARCH_PAGE &&
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
