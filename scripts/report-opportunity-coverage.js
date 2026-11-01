#!/usr/bin/env node
'use strict'

const {
  normalizeUrl,
} = require('./lib/opportunityDiscovery')
const {
  JURISDICTIONS,
  buildUSQueries,
} = require('./lib/usOpportunityCoverage')

const CATEGORY_ALIASES = {
  'Austin Texas': 'TX',
  Houston: 'TX',
  Dallas: 'TX',
  'Seattle Washington': 'WA',
  'Washington State': 'WA',
  'New York City': 'NY',
  'Los Angeles California': 'CA',
  'The Bay Area': 'CA',
  'San Francisco': 'CA',
  'San Diego': 'CA',
  Chicago: 'IL',
  'Atlanta Ga': 'GA',
  'Cincinnati Ohio': 'OH',
  'Washington, DC': 'DC',
  'New Orleans': 'LA',
  Miami: 'FL',
}

function buildCoverageReport(sources) {
  const buckets = Object.fromEntries(
    Object.entries(JURISDICTIONS).map(([code, name]) => [
      code,
      { name, sourceSlugs: [] },
    ])
  )
  const stateNames = Object.fromEntries(
    Object.entries(JURISDICTIONS).map(([code, name]) => [
      name,
      code,
    ])
  )
  const urls = new Map()
  const unassignedSourceSlugs = []
  for (const source of sources) {
    const key = normalizeUrl(source.url)
    if (!urls.has(key)) urls.set(key, [])
    urls.get(key).push(source.slug)
    const codes = new Set(
      String(source.category || '')
        .split(' / ')
        .map(
          (part) =>
            stateNames[part] || CATEGORY_ALIASES[part]
        )
        .filter(Boolean)
    )
    if (!codes.size) unassignedSourceSlugs.push(source.slug)
    for (const code of codes)
      buckets[code].sourceSlugs.push(source.slug)
  }
  return {
    basis:
      'Local curated source file only. Category hints are not verified locations, eligibility, extraction success, or publication.',
    totalSourceEntries: sources.length,
    uniqueNormalizedUrls: urls.size,
    totalUSPrograms: null,
    coveragePercent: null,
    primaryDiscoveryCells: buildUSQueries().length,
    duplicateUrlGroups: [...urls.entries()]
      .filter(([, slugs]) => slugs.length > 1)
      .map(([url, sourceSlugs]) => ({ url, sourceSlugs })),
    jurisdictionCategoryHints: buckets,
    unassignedSourceSlugs,
  }
}

if (require.main === module) {
  const sources = require('./data/opportunity-sources.json')
  console.log(
    JSON.stringify(buildCoverageReport(sources), null, 2)
  )
}

module.exports = { buildCoverageReport }
