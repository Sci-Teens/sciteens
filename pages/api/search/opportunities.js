import {
  OPPORTUNITY_PROGRAM_TYPES,
  OPPORTUNITY_STATUS_OPTIONS,
  buildOpportunitySearchQueries,
  formatOpportunityFacets,
  mapOpportunitySearchHit,
} from '@/lib/opportunitySearch'
import { meiliMultiSearch } from '@/lib/meilisearchServer'

const MAX_SEARCH_PAGE = 100
const MAX_QUERY_LENGTH = 160
const MAX_FACET_LENGTH = 100
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
function hasControlCharacters(value) {
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code < 32 || code === 127) return true
  }
  return false
}

function replaceControlCharacters(value) {
  let result = ''
  for (const character of value) {
    const code = character.charCodeAt(0)
    result += code < 32 || code === 127 ? ' ' : character
  }
  return result
}

function firstParam(value) {
  return Array.isArray(value) ? value[0] : value
}

function parsePageParam(value) {
  const text = String(value ?? '')
  if (!/^\d+$/.test(text)) return 0
  return Math.min(Number(text), MAX_SEARCH_PAGE)
}

function queryText(value) {
  return replaceControlCharacters(
    String(firstParam(value) ?? '')
  )
    .slice(0, MAX_QUERY_LENGTH)
    .trim()
}

function facetValue(value) {
  const text = String(firstParam(value) ?? '').trim()
  if (
    !text ||
    text.length > MAX_FACET_LENGTH ||
    hasControlCharacters(text)
  ) {
    return undefined
  }
  return text
}

function dateValue(value) {
  const text = String(firstParam(value) ?? '')
  if (!DATE_ONLY.test(text)) return undefined
  return Number.isNaN(Date.parse(`${text}T00:00:00.000Z`))
    ? undefined
    : text
}

function allowedValue(value, allowed) {
  const text = facetValue(value)
  return text && allowed.includes(text) ? text : undefined
}

function gradeValue(value) {
  const text = String(firstParam(value) ?? '')
  return ['9', '10', '11', '12'].includes(text)
    ? text
    : undefined
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    res.status(405).json({ error: 'Method not allowed' })
    return
  }

  const {
    q,
    field,
    grade,
    location,
    type,
    deadlineFrom,
    deadlineTo,
    status,
    page,
  } = req.query

  try {
    const pageParam = parsePageParam(firstParam(page))
    const queries = buildOpportunitySearchQueries({
      search: queryText(q),
      field: facetValue(field),
      grade: gradeValue(grade),
      location: facetValue(location),
      programType: allowedValue(
        type,
        OPPORTUNITY_PROGRAM_TYPES
      ),
      deadlineFrom: dateValue(deadlineFrom),
      deadlineTo: dateValue(deadlineTo),
      status:
        allowedValue(status, OPPORTUNITY_STATUS_OPTIONS) ||
        'open',
      page: pageParam,
    })

    const { results = [] } = await meiliMultiSearch(queries)
    const [
      result = {},
      fieldResult = {},
      locationResult = {},
      typeResult = {},
    ] = results

    res.setHeader('Cache-Control', 'private, no-store')
    res.status(200).json({
      opportunities: (result.hits || []).map(
        mapOpportunitySearchHit
      ),
      totalHits: result.estimatedTotalHits ?? 0,
      facets: {
        fields: formatOpportunityFacets(
          fieldResult.facetDistribution,
          'fields_facet'
        ).map(({ value, count }) => ({
          field: value,
          count,
        })),
        locations: formatOpportunityFacets(
          locationResult.facetDistribution,
          'location_facets'
        ),
        programTypes: formatOpportunityFacets(
          typeResult.facetDistribution,
          'programType'
        ),
      },
      page: Math.floor(
        (result.offset ?? 0) / (result.limit || 1)
      ),
      hasNextPage:
        pageParam < MAX_SEARCH_PAGE &&
        (result.offset ?? 0) + (result.hits?.length ?? 0) <
          (result.estimatedTotalHits ?? 0),
    })
  } catch (err) {
    console.error('Opportunity search failed.', err)
    res
      .status(err.statusCode || 500)
      .json({ error: 'Search is temporarily unavailable' })
  }
}
