import { describe, expect, it } from 'vitest'
import sitemap from './sitemap.cjs'

const {
  createDocumentPaths,
  createArchivePaths,
  isIndexableSitemapPath,
  toLastmod,
} = sitemap

describe('isIndexableSitemapPath', () => {
  it.each(['/', '/es/about', '/project/research-project'])(
    'keeps public route %s',
    (path) => {
      expect(isIndexableSitemapPath(path)).toBe(true)
    }
  )

  it.each([
    '/404',
    '/signin/student',
    '/fr/signup/thanks',
    '/unsubscribe',
    '/project/create',
    '/project/project-id/edit',
    '/profile/ada-lovelace',
    '/api/og',
    '/newsletter/confirmed',
    '/fr/newsletter/unsubscribe',
    '/project/invite',
    '/program/research-science-institute-rsi-massachusetts-institute-of-technology',
  ])('removes non-indexable route %s', (path) => {
    expect(isIndexableSitemapPath(path)).toBe(false)
  })
})

describe('createDocumentPaths', () => {
  it('consolidates program aliases and keeps the latest real modification date', () => {
    expect(
      createDocumentPaths(
        [
          { id: 'rsi', updated: '2026-11-01' },
          {
            id: 'research-science-institute-rsi-massachusetts-institute-of-technology',
            updated: '2026-11-05',
          },
        ],
        'program',
        'slug'
      )
    ).toEqual([
      {
        loc: '/program/rsi',
        lastmod: '2026-11-05T00:00:00.000Z',
      },
    ])
  })
  it('uses a provided slug and Firestore update time', () => {
    expect(
      createDocumentPaths(
        [
          {
            id: 'opportunity-id',
            slug: 'research-week',
            updatedAt: {
              toDate: () =>
                new Date('2026-08-31T12:00:00Z'),
            },
          },
        ],
        'program',
        'slug'
      )
    ).toEqual([
      {
        loc: '/program/research-week',
        lastmod: '2026-08-31T12:00:00.000Z',
      },
    ])
  })

  it('uses the document id when an item has no slug', () => {
    expect(
      createDocumentPaths(
        [{ id: 'project id', created: 'invalid' }],
        'project',
        'slug'
      )
    ).toEqual([{ loc: '/project/project%20id' }])
  })
})

describe('toLastmod', () => {
  it('omits invalid dates', () => {
    expect(toLastmod('not a date')).toBeUndefined()
  })
})

describe('createArchivePaths', () => {
  it('lists only real pages in every locale', () => {
    expect(createArchivePaths('articles', 11)).toEqual([
      { loc: '/articles/page/2' },
      { loc: '/es/articles/page/2' },
      { loc: '/fr/articles/page/2' },
      { loc: '/hi/articles/page/2' },
    ])
    expect(createArchivePaths('projects', 10)).toEqual([])
  })

  it('includes the distinct all-program first page', () => {
    expect(
      createArchivePaths('opportunities', 1)[0]
    ).toEqual({ loc: '/opportunities/page/1' })
  })
})
