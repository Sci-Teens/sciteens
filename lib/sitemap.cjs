const {
  CRAWL_PAGE_SIZES,
  MAX_CRAWL_PAGE,
} = require('./crawlPaginationConfig.cjs')
const {
  canonicalProgramSlug,
} = require('./legacyRoutes.cjs')

const LOCALE_PREFIX = /^\/(?:es|fr|hi)(?=\/|$)/
const NON_INDEXABLE_PATH =
  /^(?:\/404(?:\/|$)|\/api(?:\/|$)|\/signin(?:\/|$)|\/signup(?:\/|$)|\/unsubscribe(?:\/|$)|\/newsletter(?:\/|$)|\/project\/(?:create|invite)(?:\/|$)|\/project\/[^/]+\/edit(?:\/|$)|\/profile(?:\/|$))/

function getPathname(path) {
  return new URL(path, 'https://sciteens.org').pathname
}

function isIndexableSitemapPath(path) {
  const pathname =
    getPathname(path).replace(LOCALE_PREFIX, '') || '/'
  if (pathname.startsWith('/program/')) {
    const slug = pathname.slice('/program/'.length)
    if (canonicalProgramSlug(slug) !== slug) return false
  }
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
  const entries = new Map()
  for (const document of documents) {
    const originalSlug = document[slugField] || document.id
    const slug =
      segment === 'program'
        ? canonicalProgramSlug(originalSlug)
        : originalSlug
    const lastmod = toLastmod(
      document.updatedAt ||
        document.updated ||
        document.createdAt ||
        document.created
    )
    const entry = {
      loc: `/${segment}/${encodeURIComponent(slug)}`,
    }

    const previous = entries.get(entry.loc)
    const latest = [lastmod, previous?.lastmod]
      .filter(Boolean)
      .sort()
      .at(-1)
    if (latest) entry.lastmod = latest
    entries.set(entry.loc, entry)
  }
  return [...entries.values()]
}

function createArchivePaths(section, count) {
  const lastPage = Math.min(
    Math.ceil(count / CRAWL_PAGE_SIZES[section]),
    MAX_CRAWL_PAGE
  )
  const paths = []
  for (
    let page = section === 'opportunities' ? 1 : 2;
    page <= lastPage;
    page += 1
  ) {
    for (const locale of ['', '/es', '/fr', '/hi']) {
      paths.push({
        loc: `${locale}/${section}/page/${page}`,
      })
    }
  }
  return paths
}

module.exports = {
  createArchivePaths,
  createDocumentPaths,
  isIndexableSitemapPath,
  toLastmod,
}
