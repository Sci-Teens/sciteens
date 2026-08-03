// Pure helpers for querying the Meilisearch `projects` index and mapping
// hits back into the shape ProjectCard expects. Framework- and
// network-free on purpose so it's unit-testable directly — the actual HTTP
// call to Meilisearch lives in pages/api/search/projects.js.
//
// The index-side half of relevance (searchable attributes, ranking rules,
// stop words, synonyms) lives in scripts/lib/meilisearchIndexSettings.js.
import { normalizeProject } from './projects'

export const PROJECTS_SEARCH_HITS_PER_PAGE = 12
export const PROJECTS_SEARCH_INDEX = 'projects'

// Floor on Meilisearch's normalized [0,1] relevance score. Without it the
// tail of a multi-word search is documents that matched one incidental word,
// plus typo-tolerant near-misses ("neural" reaching "neutral pH"). 0.2 was
// the highest value that trimmed that tail without dropping a relevant hit
// from the tuning battery; 0.3 started costing recall.
export const RANKING_SCORE_THRESHOLD = 0.2

// Meilisearch wraps matched terms in these. Deliberately control characters
// rather than the default `<em>`: the formatted values pass through
// lib/projects.js#normalizeProject (which strips HTML) and are rendered as
// React text, never as markup, so a tag-shaped marker would either be
// swallowed or would have to be trusted as HTML.
export const HIGHLIGHT_PRE_TAG = '\u0002'
export const HIGHLIGHT_POST_TAG = '\u0003'

// Escaped and alternated rather than dropped into a character class, so this
// stays correct if the sentinels ever change: `[<em></em>]` would strip every
// `<`, `e`, `m`, `/` and `>` from plain text, and `]`/`-`/`\` would throw.
const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const HIGHLIGHT_TAGS = new RegExp(
  `${escapeRegExp(HIGHLIGHT_PRE_TAG)}|${escapeRegExp(
    HIGHLIGHT_POST_TAG
  )}`,
  'g'
)

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
    // fields_facet is indexed as canonical Title Case (functions/search.js).
    // Backslash first, then quote: escaping only the quote lets a
    // trailing backslash in `field` swallow the closing delimiter and
    // reshape the filter expression.
    clauses.push(
      `fields_facet = "${String(field)
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')}"`
    )
  }
  const fromMs = toMillis(dateFrom)
  if (fromMs !== null) clauses.push(`date >= ${fromMs}`)
  const toMs = toMillis(dateTo)
  if (toMs !== null) clauses.push(`date <= ${toMs}`)
  return clauses.length ? clauses.join(' AND ') : undefined
}

// A request only needs Meilisearch at all once free-text search, a date
// range, or an upvote ordering is in play — plain field-only browsing stays
// on the existing Firestore path (pages/projects.js), which needs no search
// infra. Upvote ordering is here because the Firestore path would need a
// composite (fields array-contains-any + upvote_count) index for it, while
// the search index already sorts on upvote_count for free.
export function requiresSearchIndex({
  search,
  dateFrom,
  dateTo,
  sort,
} = {}) {
  return Boolean(
    (search && search.trim()) ||
      dateFrom ||
      dateTo ||
      sort === 'upvotes'
  )
}

function sortForQuery(sort, hasQueryText) {
  if (sort === 'newest') return ['date:desc']
  if (sort === 'oldest') return ['date:asc']
  if (sort === 'upvotes')
    return ['upvote_count:desc', 'date:desc']
  // "Relevance" has nothing to rank by without query text, and Meilisearch
  // then answers in internal document order — which reads as random. Date
  // ordering is the only honest default for a filter-only browse.
  return hasQueryText ? undefined : ['date:desc']
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
  const q = search || ''
  const params = {
    q,
    limit: hitsPerPage,
    offset: page * hitsPerPage,
    filter: buildProjectSearchFilter({
      field,
      dateFrom,
      dateTo,
    }),
    attributesToCrop: ['abstract'],
    cropLength: 40,
    attributesToHighlight: ['title', 'abstract'],
    highlightPreTag: HIGHLIGHT_PRE_TAG,
    highlightPostTag: HIGHLIGHT_POST_TAG,
    rankingScoreThreshold: RANKING_SCORE_THRESHOLD,
  }
  const order = sortForQuery(sort, Boolean(q.trim()))
  if (order) params.sort = order
  return params
}

// Two queries for one /multi-search round trip. The second exists only for
// its facetDistribution and deliberately drops the `fields_facet` clause:
// counted against the *filtered* hits, every topic but the selected one
// reads 0, and counted against the whole index (what the sidebar used to
// show) they describe a result set the visitor isn't looking at — click
// "Environmental Science 9" on a search that has one environmental hit and
// you get one result. Scoped to the query and dates but not the topic, the
// counts finally say "of these results, N are Biology".
export function buildProjectSearchQueries(options = {}) {
  const hits = buildProjectSearchParams(options)
  return [
    { indexUid: PROJECTS_SEARCH_INDEX, ...hits },
    {
      indexUid: PROJECTS_SEARCH_INDEX,
      q: hits.q,
      limit: 0,
      filter: buildProjectSearchFilter({
        dateFrom: options.dateFrom,
        dateTo: options.dateTo,
      }),
      facets: ['fields_facet'],
      rankingScoreThreshold: RANKING_SCORE_THRESHOLD,
    },
  ]
}

// Splits a Meilisearch `_formatted` value into renderable runs. Callers map
// this to text nodes and <mark>s; nothing here is ever handed to
// dangerouslySetInnerHTML. Unbalanced or stray sentinels (a truncated crop,
// a control character that somehow survived into project text) are dropped
// rather than rendered.
export function splitHighlightedText(value) {
  if (typeof value !== 'string' || value === '') return []
  const segments = []
  // Stripped on both run kinds, not just plain ones: a literal sentinel in
  // project text mis-anchors the scan, and the resulting match run would
  // otherwise carry the raw control character into the DOM.
  const push = (text, match) => {
    const clean = text.replace(HIGHLIGHT_TAGS, '')
    if (clean) segments.push({ text: clean, match })
  }

  let index = 0
  for (;;) {
    const open = value.indexOf(HIGHLIGHT_PRE_TAG, index)
    if (open === -1) break
    const close = value.indexOf(
      HIGHLIGHT_POST_TAG,
      open + HIGHLIGHT_PRE_TAG.length
    )
    if (close === -1) break
    push(value.slice(index, open), false)
    push(
      value.slice(open + HIGHLIGHT_PRE_TAG.length, close),
      true
    )
    index = close + HIGHLIGHT_POST_TAG.length
  }
  push(value.slice(index), false)
  return segments
}

// Maps one Meilisearch hit into the same shape
// lib/projects.js#normalizeProject produces from a Firestore doc, so
// ProjectCard never has to branch on where the data came from.
export function mapSearchHitToProject(hit) {
  if (!hit) return hit
  return normalizeProject({
    id: hit.id,
    title: hit.title,
    abstract: hit.abstract,
    project_photo: hit.project_photo,
    fields: hit.fields,
    member_arr: hit.member_arr,
    date: hit.date,
    upvote_count: hit.upvote_count,
    // Kept beside the plain values rather than replacing them: title and
    // abstract still feed alt text, aria-labels and meta descriptions, none
    // of which may carry highlight sentinels or a mid-sentence crop.
    highlight: {
      title: hit._formatted?.title ?? null,
      abstract: hit._formatted?.abstract ?? null,
    },
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
