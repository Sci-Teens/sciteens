import { describe, expect, it } from 'vitest'
import {
  getListingPagePath,
  parseCrawlPage,
  sliceListingPage,
} from './crawlPagination'

describe('crawlable listing pages', () => {
  it.each([
    '0',
    '-1',
    '1.5',
    '2garbage',
    '01',
    '101',
    undefined,
    ['2'],
  ])('rejects invalid or oversized page %s', (value) => {
    expect(parseCrawlPage(value)).toBeNull()
  })

  it('accepts bounded positive page numbers', () => {
    expect(parseCrawlPage('2')).toBe(2)
    expect(parseCrawlPage('100')).toBe(100)
  })

  it('presents nonoverlapping pages without skipping items after the root listing', () => {
    const articles = Array.from(
      { length: 23 },
      (_, index) => ({ slug: String(index) })
    )
    expect(
      sliceListingPage(articles, 'articles', 2)
    ).toEqual({
      items: articles.slice(10, 20),
      hasNextPage: true,
    })
    expect(
      sliceListingPage(articles, 'articles', 3)
    ).toEqual({
      items: articles.slice(20),
      hasNextPage: false,
    })
    expect(
      sliceListingPage(articles, 'articles', 4).items
    ).toEqual([])
  })

  it('links back to the root listing and keeps the all-program archive distinct', () => {
    expect(getListingPagePath('articles', 1)).toBe(
      '/articles'
    )
    expect(getListingPagePath('projects', 2)).toBe(
      '/projects/page/2'
    )
    expect(getListingPagePath('opportunities', 1)).toBe(
      '/opportunities/page/1'
    )
  })
})
