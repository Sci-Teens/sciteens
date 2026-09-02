const LOCALE_PREFIX = /^\/(?:es|fr|hi)(?=\/|$)/
const NON_INDEXABLE_PATH =
  /^(?:\/404(?:\/|$)|\/api(?:\/|$)|\/signin(?:\/|$)|\/signup(?:\/|$)|\/unsubscribe(?:\/|$)|\/project\/create(?:\/|$)|\/project\/[^/]+\/edit(?:\/|$)|\/profile(?:\/|$))/

function getPathname(path) {
  return new URL(path, 'https://sciteens.org').pathname
}

function isIndexableSitemapPath(path) {
  const pathname =
    getPathname(path).replace(LOCALE_PREFIX, '') || '/'
  return !NON_INDEXABLE_PATH.test(pathname)
}

function toLastmod(value) {
  const date = value?.toDate?.() || value
  if (!date) return undefined

  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime())
    ? undefined
    : parsed.toISOString()
}

function createDocumentPaths(
  documents,
  segment,
  slugField
) {
  return documents.map((document) => {
    const slug = document[slugField] || document.id
    const lastmod = toLastmod(
      document.updatedAt ||
        document.updated ||
        document.createdAt ||
        document.created
    )
    const entry = {
      loc: `/${segment}/${encodeURIComponent(slug)}`,
    }

    if (lastmod) entry.lastmod = lastmod
    return entry
  })
}

module.exports = {
  createDocumentPaths,
  isIndexableSitemapPath,
  toLastmod,
}
