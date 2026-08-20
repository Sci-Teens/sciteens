// Pure filtering for the /articles and /courses listings. No fs, no network,
// no React, so it is unit-testable directly and safe in the client bundle.
//
// The Prismic listings paged through a network query per keystroke and per
// scroll. All 135 article summaries now arrive in the page props, so filtering
// and paging are local array work and a search returns without a round trip.
// Body-text matching needs the corpus from public/content/article-search.json,
// which /articles fetches lazily the first time a reader searches.

export const ARTICLES_PAGE_SIZE = 10
export const COURSES_PAGE_SIZE = 10

// Whitespace-separated terms, all of which must appear. Mirrors how Prismic's
// fulltext predicate treated a multi-word query: narrowing, not widening.
export function parseQuery(search) {
  return String(search || '')
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
}

function matchesTerms(haystack, terms) {
  return terms.every((term) => haystack.includes(term))
}

// Everything a summary can be matched on without the corpus. Tags are
// included so searching "Biology" behaves like picking the topic filter.
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

// `corpus` is an optional slug -> lowercased body text map. When it is absent
// (still loading, or failed to load) matching falls back to the summary
// fields, so search degrades instead of breaking.
export function filterArticles(
  summaries,
  { search = '', field = '', corpus = null } = {}
) {
  const terms = parseQuery(search)
  return (summaries || []).filter((summary) => {
    if (field && !(summary.tags || []).includes(field))
      return false
    if (!terms.length) return true
    const haystack = corpus?.[summary.slug]
      ? `${summaryHaystack(summary)} ${
          corpus[summary.slug]
        }`
      : summaryHaystack(summary)
    return matchesTerms(haystack, terms)
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
    if (!terms.length) return true
    return matchesTerms(summaryHaystack(summary), terms)
  })
}

// Turns the fetched corpus array into the lookup filterArticles expects.
export function toCorpusMap(entries) {
  if (!Array.isArray(entries)) return null
  const map = {}
  for (const entry of entries) {
    if (entry?.slug) map[entry.slug] = entry.text || ''
  }
  return map
}
