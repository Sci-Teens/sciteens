import { describe, expect, it } from 'vitest'

import {
  buildOpportunitySearchFilter,
  buildOpportunitySearchParams,
  buildOpportunitySearchQueries,
  formatOpportunityFacets,
  mapOpportunitySearchHit,
} from './opportunitySearch'

const NOW = new Date('2026-09-03T18:00:00.000Z')
const TODAY = Date.parse('2026-09-03T00:00:00.000Z')

describe('buildOpportunitySearchFilter', () => {
  it('keeps dated and rolling opportunities open through the deadline day', () => {
    expect(buildOpportunitySearchFilter({ now: NOW })).toBe(
      `((deadlineStatus = "dated" AND applicationDeadline >= ${TODAY}) OR deadlineStatus = "rolling")`
    )
  })

  it('combines student fit, international location, and deadline filters', () => {
    const filter = buildOpportunitySearchFilter({
      field: 'Biology',
      grade: '11',
      location: 'Australia',
      programType: 'Research Experience',
      deadlineFrom: '2026-10-01',
      deadlineTo: '2026-10-31',
      now: NOW,
    })
    expect(filter).toContain('fields_facet = "Biology"')
    expect(filter).toContain('grade_levels = 11')
    expect(filter).toContain(
      'location_facets = "Australia"'
    )
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

  it('escapes a quoted location inside the Meilisearch literal', () => {
    expect(
      buildOpportunitySearchFilter({
        location: 'France" OR deadlineStatus = "rolling',
        now: NOW,
      })
    ).toContain(
      'location_facets = "France\\" OR deadlineStatus = \\"rolling"'
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
})

describe('buildOpportunitySearchQueries', () => {
  it('returns scoped hit, topic, location, and type queries', () => {
    const queries = buildOpportunitySearchQueries({
      field: 'Biology',
      location: 'Singapore',
      programType: 'Internship',
      grade: '10',
      now: NOW,
    })
    expect(queries).toHaveLength(4)
    expect(queries[0].filter).toContain(
      'fields_facet = "Biology"'
    )
    expect(queries[1].filter).not.toContain('fields_facet')
    expect(queries[1].filter).toContain(
      'location_facets = "Singapore"'
    )
    expect(queries[2].filter).not.toContain(
      'location_facets'
    )
    expect(queries[2].filter).toContain(
      'fields_facet = "Biology"'
    )
    expect(queries[3].filter).not.toContain('programType')
    expect(queries[3].filter).toContain('grade_levels = 10')
    expect(
      queries.slice(1).map(({ facets }) => facets)
    ).toEqual([
      ['fields_facet'],
      ['location_facets'],
      ['programType'],
    ])
  })
})

describe('mapOpportunitySearchHit', () => {
  it('returns the public listing shape without index facets', () => {
    const opportunity = mapOpportunitySearchHit({
      id: 'global-research',
      name: 'Global Research Program',
      about: 'Research in Singapore.',
      location: 'Singapore',
      location_facets: ['Singapore'],
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
    expect(opportunity.location_facets).toBeUndefined()
    expect(opportunity.grade_levels).toBeUndefined()
  })
})

describe('formatOpportunityFacets', () => {
  it('sorts non-empty international facets by count', () => {
    expect(
      formatOpportunityFacets(
        {
          location_facets: {
            Singapore: 2,
            Australia: 5,
            Empty: 0,
          },
        },
        'location_facets'
      )
    ).toEqual([
      { value: 'Australia', count: 5 },
      { value: 'Singapore', count: 2 },
    ])
  })

  it('returns an empty list for a missing distribution', () => {
    expect(
      formatOpportunityFacets(undefined, 'location_facets')
    ).toEqual([])
  })
})
