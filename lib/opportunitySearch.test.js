import { describe, expect, it } from 'vitest'

import {
  buildOpportunitySearchFilter,
  buildOpportunitySearchParams,
  buildOpportunitySearchQueries,
  defaultOpportunityStatus,
  formatOpportunityFacets,
  mapOpportunitySearchHit,
} from './opportunitySearch'

const NOW = new Date('2026-09-03T18:00:00.000Z')
const TODAY = Date.parse('2026-09-03T00:00:00.000Z')
describe('defaultOpportunityStatus', () => {
  it('uses open browsing and searches across every deadline', () => {
    expect(defaultOpportunityStatus('')).toBe('open')
    expect(defaultOpportunityStatus('Florida')).toBe('all')
  })
})

describe('buildOpportunitySearchFilter', () => {
  it('keeps dated and rolling opportunities open through the deadline day', () => {
    expect(buildOpportunitySearchFilter({ now: NOW })).toBe(
      `((deadlineStatus = "dated" AND applicationDeadline >= ${TODAY}) OR deadlineStatus = "rolling")`
    )
  })

  it('combines student fit, program type, and deadline filters', () => {
    const filter = buildOpportunitySearchFilter({
      field: 'Biology',
      grade: '11',
      programType: 'Research Experience',
      deadlineFrom: '2026-10-01',
      deadlineTo: '2026-10-31',
      now: NOW,
    })
    expect(filter).toContain('fields_facet = "Biology"')
    expect(filter).toContain('grade_levels = 11')
    expect(filter).toContain(
      'programType = "Research Experience"'
    )
    expect(filter).toContain(
      `applicationDeadline >= ${Date.parse(
        '2026-10-01T00:00:00.000Z'
      )}`
    )
    expect(filter).toContain(
      `applicationDeadline <= ${Date.parse(
        '2026-10-31T23:59:59.999Z'
      )}`
    )
  })

  it('builds each deadline status from a fixed date', () => {
    expect(
      buildOpportunitySearchFilter({
        status: 'opening_soon',
        now: NOW,
      })
    ).toBe(
      `(deadlineStatus = "upcoming" AND applicationOpensDate >= ${TODAY})`
    )
    expect(
      buildOpportunitySearchFilter({
        status: 'closed_recently',
        now: NOW,
      })
    ).toContain(`applicationDeadline < ${TODAY}`)
    expect(
      buildOpportunitySearchFilter({
        status: 'deadline_unknown',
        now: NOW,
      })
    ).toBe('deadlineStatus = "unclear"')
    expect(
      buildOpportunitySearchFilter({
        status: 'all',
        now: NOW,
      })
    ).toBe('')
  })

  it('ignores invalid grades and dates', () => {
    const filter = buildOpportunitySearchFilter({
      grade: '8',
      deadlineFrom: 'not-a-date',
      deadlineTo: 'also-not-a-date',
      now: NOW,
    })
    expect(filter).not.toContain('grade_levels')
    expect(filter).not.toContain('not-a-date')
  })
})

describe('buildOpportunitySearchParams', () => {
  it('paginates and limits retrieved fields', () => {
    const params = buildOpportunitySearchParams({
      search: '  biology internship  ',
      page: 2,
      hitsPerPage: 12,
      now: NOW,
    })
    expect(params).toMatchObject({
      q: 'biology internship',
      limit: 12,
      offset: 24,
      sort: ['applicationDeadline:asc', 'name:asc'],
    })
    expect(params.attributesToRetrieve).toContain('name')
    expect(params.attributesToRetrieve).not.toContain(
      'contactEmail'
    )
    expect(params.attributesToRetrieve).not.toContain(
      'sourceCategory'
    )
  })

  it('sorts all opportunities alphabetically', () => {
    expect(
      buildOpportunitySearchParams({
        search: 'Florida',
        status: 'all',
        now: NOW,
      })
    ).toMatchObject({
      q: 'Florida',
      filter: '',
      sort: ['name:asc'],
    })
  })
})

describe('buildOpportunitySearchQueries', () => {
  it('returns scoped hit, topic, and type queries', () => {
    const queries = buildOpportunitySearchQueries({
      field: 'Biology',
      programType: 'Internship',
      grade: '10',
      now: NOW,
    })
    expect(queries).toHaveLength(3)
    expect(queries[0].filter).toContain(
      'fields_facet = "Biology"'
    )
    expect(queries[1].filter).not.toContain('fields_facet')
    expect(queries[1].filter).toContain('grade_levels = 10')
    expect(queries[2].filter).not.toContain('programType')
    expect(queries[2].filter).toContain('grade_levels = 10')
    expect(
      queries.slice(1).map(({ facets }) => facets)
    ).toEqual([['fields_facet'], ['programType']])
  })
})

describe('mapOpportunitySearchHit', () => {
  it('returns the public listing shape without index facets', () => {
    const opportunity = mapOpportunitySearchHit({
      id: 'global-research',
      name: 'Global Research Program',
      about: 'Research in Singapore.',
      location: 'Singapore',
      grade_levels: [10, 11, 12],
      fields: ['Biology'],
      applicationDeadline: 1798761600000,
      deadlineStatus: 'dated',
    })
    expect(opportunity).toMatchObject({
      slug: 'global-research',
      location: 'Singapore',
      fields: ['Biology'],
    })
    expect(opportunity.grade_levels).toBeUndefined()
  })
})

describe('formatOpportunityFacets', () => {
  it('sorts non-empty facets by count', () => {
    expect(
      formatOpportunityFacets(
        {
          programType: {
            Internship: 2,
            Competition: 5,
            Empty: 0,
          },
        },
        'programType'
      )
    ).toEqual([
      { value: 'Competition', count: 5 },
      { value: 'Internship', count: 2 },
    ])
  })

  it('returns an empty list for a missing distribution', () => {
    expect(
      formatOpportunityFacets(undefined, 'programType')
    ).toEqual([])
  })
})
