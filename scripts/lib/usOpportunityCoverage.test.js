import { describe, expect, it } from 'vitest'
import {
  buildUSQueries,
  JURISDICTIONS,
} from './usOpportunityCoverage'
import {
  loadQueryTemplates,
  parseArgs,
} from '../discoverOpportunitySources'
import { buildCoverageReport } from '../report-opportunity-coverage'

describe('U.S. program coverage', () => {
  it('covers every state, DC, five territories, and nationwide programs across six primary tracks', () => {
    expect(Object.keys(JURISDICTIONS)).toHaveLength(57)
    const queries = buildUSQueries()
    expect(queries).toHaveLength(342)
    expect(
      new Set(queries.map((q) => q.category)).size
    ).toBe(342)
    expect(
      queries.every(
        (q) => !q.category.endsWith('-competitions')
      )
    ).toBe(true)
    expect(
      buildUSQueries({ jurisdiction: 'PR' })
    ).toHaveLength(6)
  })

  it('keeps competitions available as an explicit secondary track', () => {
    expect(
      buildUSQueries({
        jurisdiction: 'MT',
        track: 'competitions',
      })[0].category
    ).toBe('us-mt-competitions')
  })

  it('selects a bounded batch and supports a stable offset', () => {
    const args = parseArgs([
      '--us',
      '--jurisdiction',
      'mt',
      '--query-offset',
      '1',
      '--query-limit',
      '2',
      '--list-queries',
    ])
    expect(args.jurisdiction).toBe('MT')
    expect(loadQueryTemplates(args)).toEqual(
      buildUSQueries({ jurisdiction: 'MT' }).slice(1, 3)
    )
    expect(
      loadQueryTemplates(parseArgs(['--us']))
    ).toHaveLength(6)
    expect(loadQueryTemplates().length).toBeGreaterThan(6)
  })

  it('rejects invalid filters and empty batches before any network calls', () => {
    for (const argv of [
      ['--us', '--query-limit', '0'],
      ['--us', '--query-offset', '-1'],
      ['--us', '--jurisdiction'],
      ['--track', 'research'],
      ['--execute', '--offline'],
    ])
      expect(() => parseArgs(argv)).toThrow()
    expect(() =>
      buildUSQueries({ jurisdiction: 'XX' })
    ).toThrow()
    expect(() =>
      buildUSQueries({ track: 'unknown' })
    ).toThrow()
    expect(() =>
      loadQueryTemplates({ us: true, queryOffset: 342 })
    ).toThrow()
  })

  it('reports duplicate URLs without treating source categories as a national coverage percentage', () => {
    const report = buildCoverageReport([
      {
        slug: 'one',
        url: 'https://www.example.org/program/?utm_source=a',
        category: 'The Bay Area',
      },
      {
        slug: 'two',
        url: 'https://example.org/program',
        category: 'California / Oregon',
      },
      {
        slug: 'three',
        url: 'https://other.example.org',
        category: 'Canada',
      },
    ])
    expect(report.uniqueNormalizedUrls).toBe(2)
    expect(
      report.duplicateUrlGroups[0].sourceSlugs
    ).toEqual(['one', 'two'])
    expect(
      report.jurisdictionCategoryHints.CA.sourceSlugs
    ).toEqual(['one', 'two'])
    expect(
      report.jurisdictionCategoryHints.OR.sourceSlugs
    ).toEqual(['two'])
    expect(report.unassignedSourceSlugs).toEqual(['three'])
    expect(report.coveragePercent).toBeNull()
    expect(report.totalUSPrograms).toBeNull()
    expect(
      buildCoverageReport([]).uniqueNormalizedUrls
    ).toBe(0)
  })
})
