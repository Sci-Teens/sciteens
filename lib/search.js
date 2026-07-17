// Pure helpers for querying the Meilisearch `projects` index and mapping
// hits back into the shape ProjectCard expects. Framework- and
// network-free on purpose so it's unit-testable directly — the actual HTTP
// call to Meilisearch lives in pages/api/search/projects.js.
import { normalizeProject } from './projects'

export const PROJECTS_SEARCH_HITS_PER_PAGE = 12

function toMillis(value) {
  if (value === undefined || value === null || value === '')
    return null
  const parsed =
    value instanceof Date ? value : new Date(value)
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.getTime()
}

// Meilisearch filter expression syntax:
// https://www.meilisearch.com/docs/reference/api/search#filter
export function buildProjectSearchFilter({
  field,
  dateFrom,
  dateTo,
} = {}) {
  const clauses = []
  if (field) {
    // fields_facet is indexed as canonical Title Case (functions/search.js)
    // — escape embedded quotes so a stray one in `field` can't break out
    // of the filter string.
    clauses.push(
      `fields_facet = "${String(field).replace(
        /"/g,
        '\\"'
      )}"`
    )
  }
  const fromMs = toMillis(dateFrom)
  if (fromMs !== null) clauses.push(`date >= ${fromMs}`)
  const toMs = toMillis(dateTo)
  if (toMs !== null) clauses.push(`date <= ${toMs}`)
  return clauses.length ? clauses.join(' AND ') : undefined
}

// A request only needs Meilisearch at all once free-text search or a date
// range is in play — plain field-only browsing stays on the existing
// Firestore path (pages/projects.js), which needs no search infra.
export function requiresSearchIndex({
  search,
  dateFrom,
  dateTo,
} = {}) {
  return Boolean(
    (search && search.trim()) || dateFrom || dateTo
  )
}

export function buildProjectSearchParams({
  search = '',
  field,
  dateFrom,
  dateTo,
  sort,
  page = 0,
  hitsPerPage = PROJECTS_SEARCH_HITS_PER_PAGE,
} = {}) {
  const params = {
    q: search || '',
    limit: hitsPerPage,
    offset: page * hitsPerPage,
    filter: buildProjectSearchFilter({
      field,
      dateFrom,
      dateTo,
    }),
    facets: ['fields_facet'],
    attributesToCrop: ['abstract'],
    cropLength: 40,
  }
  if (sort === 'newest') params.sort = ['date:desc']
  else if (sort === 'oldest') params.sort = ['date:asc']
  return params
}

// Maps one Meilisearch hit into the same shape
// lib/projects.js#normalizeProject produces from a Firestore doc, so
// ProjectCard never has to branch on where the data came from.
export function mapSearchHitToProject(hit) {
  if (!hit) return hit
  return normalizeProject({
    id: hit.id,
    title: hit.title,
    abstract: hit._formatted?.abstract ?? hit.abstract,
    project_photo: hit.project_photo,
    fields: hit.fields,
    member_arr: hit.member_arr,
    date: hit.date,
    upvote_count: hit.upvote_count,
  })
}

// Turns Meilisearch's facetDistribution.fields_facet map into a sorted
// [{ field, count }] list for the filter sidebar. A missing/empty
// distribution (e.g. mid-outage) degrades to an empty list, never throws.
export function formatFieldFacets(facetDistribution) {
  const distribution = facetDistribution?.fields_facet
  if (!distribution) return []
  return Object.entries(distribution)
    .map(([field, count]) => ({ field, count }))
    .sort(
      (a, b) =>
        b.count - a.count || a.field.localeCompare(b.field)
    )
}
