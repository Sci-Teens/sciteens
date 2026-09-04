import { normalizeOpportunityListing } from './opportunities'

export const OPPORTUNITIES_SEARCH_INDEX = 'opportunities'
export const OPPORTUNITIES_SEARCH_HITS_PER_PAGE = 12
export const OPPORTUNITY_STATUS_OPTIONS = [
  'all',
  'open',
  'opening_soon',
  'closed_recently',
  'deadline_unknown',
]
export const OPPORTUNITY_PROGRAM_TYPES = [
  'Summer Program',
  'Academic Year Program',
  'Competition',
  'Internship',
  'Research Experience',
  'Scholarship',
  'Online Course',
  'Fellowship',
  'Camp',
  'Other',
]
export function defaultOpportunityStatus(search = '') {
  return String(search).trim() ? 'all' : 'open'
}

const CLOSED_RECENTLY_WINDOW_DAYS = 120
const MS_PER_DAY = 24 * 60 * 60 * 1000
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const OPPORTUNITY_RESULT_ATTRIBUTES = [
  'id',
  'name',
  'about',
  'location',
  'applicationDeadline',
  'applicationOpensDate',
  'deadlineStatus',
  'gradeRangeLow',
  'gradeRangeHigh',
  'fields',
  'programType',
  'residential',
  'imageUrl',
  'imageFit',
]

function escapeFilterValue(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
}

function quotedFilter(attribute, value) {
  return `${attribute} = "${escapeFilterValue(value)}"`
}

function dateToMillis(value, endOfDay = false) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null
  }
  const normalized =
    typeof value === 'string' && DATE_ONLY.test(value)
      ? `${value}T${
          endOfDay ? '23:59:59.999' : '00:00:00.000'
        }Z`
      : value
  const parsed =
    normalized instanceof Date
      ? normalized
      : new Date(normalized)
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.getTime()
}

function startOfUtcDay(value) {
  const date =
    value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return Date.now()
  return Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate()
  )
}

function statusFilter(status, now) {
  if (status === 'all') return null
  const today = startOfUtcDay(now)
  if (status === 'opening_soon') {
    return `(deadlineStatus = "upcoming" AND applicationOpensDate >= ${today})`
  }
  if (status === 'closed_recently') {
    return `(deadlineStatus = "dated" AND applicationDeadline >= ${
      today - CLOSED_RECENTLY_WINDOW_DAYS * MS_PER_DAY
    } AND applicationDeadline < ${today})`
  }
  if (status === 'deadline_unknown') {
    return 'deadlineStatus = "unclear"'
  }
  return `((deadlineStatus = "dated" AND applicationDeadline >= ${today}) OR deadlineStatus = "rolling")`
}

export function buildOpportunitySearchFilter({
  field,
  grade,
  programType,
  deadlineFrom,
  deadlineTo,
  status = 'open',
  now = Date.now(),
} = {}) {
  const statusClause = statusFilter(status, now)
  const clauses = statusClause ? [statusClause] : []
  if (field)
    clauses.push(quotedFilter('fields_facet', field))

  const gradeNumber = Number(grade)
  if (
    Number.isInteger(gradeNumber) &&
    gradeNumber >= 9 &&
    gradeNumber <= 12
  ) {
    clauses.push(`grade_levels = ${gradeNumber}`)
  }
  if (programType) {
    clauses.push(quotedFilter('programType', programType))
  }

  const deadlineFromMs = dateToMillis(deadlineFrom)
  if (deadlineFromMs !== null) {
    clauses.push(`applicationDeadline >= ${deadlineFromMs}`)
  }
  const deadlineToMs = dateToMillis(deadlineTo, true)
  if (deadlineToMs !== null) {
    clauses.push(`applicationDeadline <= ${deadlineToMs}`)
  }
  return clauses.join(' AND ')
}

function sortForStatus(status) {
  if (status === 'all') return ['name:asc']
  if (status === 'opening_soon') {
    return ['applicationOpensDate:asc', 'name:asc']
  }
  if (status === 'closed_recently') {
    return ['applicationDeadline:desc', 'name:asc']
  }
  if (status === 'deadline_unknown') return ['name:asc']
  return ['applicationDeadline:asc', 'name:asc']
}

export function buildOpportunitySearchParams({
  search = '',
  field,
  grade,
  programType,
  deadlineFrom,
  deadlineTo,
  status = 'open',
  page = 0,
  hitsPerPage = OPPORTUNITIES_SEARCH_HITS_PER_PAGE,
  now = Date.now(),
} = {}) {
  return {
    q: search.trim(),
    limit: hitsPerPage,
    offset: page * hitsPerPage,
    filter: buildOpportunitySearchFilter({
      field,
      grade,
      programType,
      deadlineFrom,
      deadlineTo,
      status,
      now,
    }),
    sort: sortForStatus(status),
    attributesToRetrieve: OPPORTUNITY_RESULT_ATTRIBUTES,
  }
}

function buildFacetQuery(options, omittedFilter, facet) {
  return {
    indexUid: OPPORTUNITIES_SEARCH_INDEX,
    q: String(options.search || '').trim(),
    limit: 0,
    filter: buildOpportunitySearchFilter({
      field:
        omittedFilter === 'field'
          ? undefined
          : options.field,
      grade: options.grade,
      programType:
        omittedFilter === 'programType'
          ? undefined
          : options.programType,
      deadlineFrom: options.deadlineFrom,
      deadlineTo: options.deadlineTo,
      status: options.status,
      now: options.now,
    }),
    facets: [facet],
  }
}

export function buildOpportunitySearchQueries(
  options = {}
) {
  const hits = buildOpportunitySearchParams(options)
  return [
    { indexUid: OPPORTUNITIES_SEARCH_INDEX, ...hits },
    buildFacetQuery(options, 'field', 'fields_facet'),
    buildFacetQuery(options, 'programType', 'programType'),
  ]
}

export function mapOpportunitySearchHit(hit) {
  return normalizeOpportunityListing({
    ...hit,
    slug: hit.id,
  })
}

export function formatOpportunityFacets(
  facetDistribution,
  attribute
) {
  const distribution = facetDistribution?.[attribute]
  if (!distribution || typeof distribution !== 'object') {
    return []
  }
  return Object.entries(distribution)
    .filter(
      ([value, count]) =>
        value && Number.isFinite(count) && count > 0
    )
    .map(([value, count]) => ({ value, count }))
    .sort(
      (a, b) =>
        b.count - a.count || a.value.localeCompare(b.value)
    )
}
