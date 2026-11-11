import paginationConfig from './crawlPaginationConfig.cjs'

export const { MAX_CRAWL_PAGE, CRAWL_PAGE_SIZES } =
  paginationConfig

export function parseCrawlPage(value) {
  if (
    typeof value !== 'string' ||
    !/^[1-9]\d*$/.test(value)
  ) {
    return null
  }
  const page = Number(value)
  return page <= MAX_CRAWL_PAGE ? page : null
}

export function getListingPagePath(section, page) {
  if (page === 1 && section !== 'opportunities') {
    return `/${section}`
  }
  return `/${section}/page/${page}`
}

export function sliceListingPage(items, section, page) {
  const size = CRAWL_PAGE_SIZES[section]
  const start = (page - 1) * size
  return {
    items: items.slice(start, start + size),
    hasNextPage:
      page < MAX_CRAWL_PAGE && items.length > start + size,
  }
}
