import { describe, expect, it } from 'vitest'
import {
  buildProjectSearchFilter,
  buildProjectSearchParams,
  formatFieldFacets,
  mapSearchHitToProject,
  requiresSearchIndex,
} from './search'

describe('buildProjectSearchFilter', () => {
  it('returns undefined with no constraints', () => {
    expect(buildProjectSearchFilter({})).toBeUndefined()
    expect(buildProjectSearchFilter()).toBeUndefined()
  })

  it('builds a field-only filter', () => {
    expect(
      buildProjectSearchFilter({ field: 'Biology' })
    ).toBe('fields_facet = "Biology"')
  })

  it('escapes embedded quotes in field', () => {
    expect(
      buildProjectSearchFilter({ field: 'Foo"Bar' })
    ).toBe('fields_facet = "Foo\\"Bar"')
  })

  it('builds a date range filter in unix ms', () => {
    const filter = buildProjectSearchFilter({
      dateFrom: '2024-01-01T00:00:00.000Z',
      dateTo: '2024-06-01T00:00:00.000Z',
    })
    expect(filter).toBe(
      'date >= 1704067200000 AND date <= 1717200000000'
    )
  })

  it('combines field and date constraints with AND', () => {
    const filter = buildProjectSearchFilter({
      field: 'Physics',
      dateFrom: '2024-01-01T00:00:00.000Z',
    })
    expect(filter).toBe(
      'fields_facet = "Physics" AND date >= 1704067200000'
    )
  })

  it('ignores an unparseable date', () => {
    expect(
      buildProjectSearchFilter({ dateFrom: 'not-a-date' })
    ).toBeUndefined()
  })
})

describe('requiresSearchIndex', () => {
  it('is false with no search text or dates', () => {
    expect(requiresSearchIndex({})).toBe(false)
    expect(requiresSearchIndex({ field: 'Biology' })).toBe(
      false
    )
  })

  it('is false for whitespace-only search text', () => {
    expect(requiresSearchIndex({ search: '   ' })).toBe(
      false
    )
  })

  it('is true once free-text search is present', () => {
    expect(requiresSearchIndex({ search: 'dna' })).toBe(
      true
    )
  })

  it('is true once a date bound is present', () => {
    expect(
      requiresSearchIndex({ dateFrom: '2024-01-01' })
    ).toBe(true)
    expect(
      requiresSearchIndex({ dateTo: '2024-01-01' })
    ).toBe(true)
  })
})

describe('buildProjectSearchParams', () => {
  it('defaults to an empty query and page 0', () => {
    const params = buildProjectSearchParams()
    expect(params.q).toBe('')
    expect(params.offset).toBe(0)
    expect(params.filter).toBeUndefined()
    expect(params.facets).toEqual(['fields_facet'])
  })

  it('paginates via limit/offset', () => {
    const params = buildProjectSearchParams({
      page: 2,
      hitsPerPage: 12,
    })
    expect(params.limit).toBe(12)
    expect(params.offset).toBe(24)
  })

  it('maps sort=newest/oldest to a Meilisearch sort array', () => {
    expect(
      buildProjectSearchParams({ sort: 'newest' }).sort
    ).toEqual(['date:desc'])
    expect(
      buildProjectSearchParams({ sort: 'oldest' }).sort
    ).toEqual(['date:asc'])
  })

  it('omits sort for relevance (default)', () => {
    expect(
      buildProjectSearchParams({ search: 'dna' }).sort
    ).toBeUndefined()
  })
})

describe('mapSearchHitToProject', () => {
  it('passes through falsy input unchanged', () => {
    expect(mapSearchHitToProject(null)).toBeNull()
  })

  it('normalizes a hit into ProjectCard shape', () => {
    const project = mapSearchHitToProject({
      id: 'abc123',
      title: 'DNA Origami',
      abstract: 'A study of <b>DNA</b> folding.',
      project_photo: 'https://example.com/photo.jpg',
      fields: ['Biology'],
      member_arr: [{ uid: 'u1', display: 'Ada' }],
      date: 1700000000000,
    })
    expect(project).toMatchObject({
      id: 'abc123',
      title: 'DNA Origami',
      abstract: 'A study of DNA folding.',
      project_photo: 'https://example.com/photo.jpg',
      fields: ['Biology'],
      member_arr: [{ uid: 'u1', display: 'Ada' }],
      date: 1700000000000,
    })
  })

  it('prefers the cropped/highlighted abstract when present', () => {
    const project = mapSearchHitToProject({
      id: 'abc123',
      title: 'DNA Origami',
      abstract: 'Full abstract text goes on for a while.',
      _formatted: { abstract: 'Full abstract…' },
    })
    expect(project.abstract).toBe('Full abstract…')
  })
})

describe('formatFieldFacets', () => {
  it('returns an empty list when the distribution is missing', () => {
    expect(formatFieldFacets(undefined)).toEqual([])
    expect(formatFieldFacets({})).toEqual([])
  })

  it('sorts by count desc, then field name asc', () => {
    expect(
      formatFieldFacets({
        fields_facet: {
          Chemistry: 3,
          Biology: 5,
          Physics: 5,
        },
      })
    ).toEqual([
      { field: 'Biology', count: 5 },
      { field: 'Physics', count: 5 },
      { field: 'Chemistry', count: 3 },
    ])
  })
})
