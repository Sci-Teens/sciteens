// Pure filtering for the /articles and /courses listings: no fs, no network,
// no React, so it is unit-testable and safe in the client bundle.

export const ARTICLES_PAGE_SIZE = 10
export const COURSES_PAGE_SIZE = 10

export function parseQuery(search) {
  return String(search || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

// Tags are searchable so typing a topic behaves like picking its chip.
function summaryHaystack(summary) {
  return [
    summary.title,
    summary.description,
    summary.author,
    ...(summary.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

// Every term must match. Widening this to OR would return most of the corpus
// for any multi-word query.
function matchesAll(haystack, terms) {
  return terms.every((term) => haystack.includes(term))
}

// `corpus` is an optional slug to body-text map. Without it, matching falls
// back to the summary fields so search degrades instead of breaking.
export function filterArticles(
  summaries,
  { search = '', field = '', corpus = null } = {}
) {
  const terms = parseQuery(search)
  return (summaries || []).filter((summary) => {
    if (field && !(summary.tags || []).includes(field))
      return false
    if (!terms.length) return true
    const body = corpus?.[summary.slug]
    const haystack = body
      ? `${summaryHaystack(summary)} ${body}`
      : summaryHaystack(summary)
    return matchesAll(haystack, terms)
  })
}

export function filterCourses(
  summaries,
  { search = '', field = '' } = {}
) {
  const terms = parseQuery(search)
  return (summaries || []).filter((summary) => {
    if (field && !(summary.tags || []).includes(field))
      return false
    return (
      !terms.length ||
      matchesAll(summaryHaystack(summary), terms)
    )
  })
}

export function toCorpusMap(entries) {
  if (!Array.isArray(entries)) return null
  const map = {}
  for (const entry of entries)
    if (entry?.slug) map[entry.slug] = entry.text || ''
  return map
}
