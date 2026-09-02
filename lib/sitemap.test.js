import { describe, expect, it } from 'vitest'
import sitemap from './sitemap.cjs'

const {
  createDocumentPaths,
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
  ])('removes non-indexable route %s', (path) => {
    expect(isIndexableSitemapPath(path)).toBe(false)
  })
})

describe('createDocumentPaths', () => {
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
