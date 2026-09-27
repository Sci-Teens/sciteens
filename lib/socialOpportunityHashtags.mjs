const STATE_NAMES = `AL:Alabama|AK:Alaska|AZ:Arizona|AR:Arkansas|CA:California|CO:Colorado|CT:Connecticut|DE:Delaware|FL:Florida|GA:Georgia|HI:Hawaii|ID:Idaho|IL:Illinois|IN:Indiana|IA:Iowa|KS:Kansas|KY:Kentucky|LA:Louisiana|ME:Maine|MD:Maryland|MA:Massachusetts|MI:Michigan|MN:Minnesota|MS:Mississippi|MO:Missouri|MT:Montana|NE:Nebraska|NV:Nevada|NH:New Hampshire|NJ:New Jersey|NM:New Mexico|NY:New York|NC:North Carolina|ND:North Dakota|OH:Ohio|OK:Oklahoma|OR:Oregon|PA:Pennsylvania|RI:Rhode Island|SC:South Carolina|SD:South Dakota|TN:Tennessee|TX:Texas|UT:Utah|VT:Vermont|VA:Virginia|WA:Washington|WV:West Virginia|WI:Wisconsin|WY:Wyoming|DC:District of Columbia`

const states = new Map(
  STATE_NAMES.split('|').flatMap((entry) => {
    const [abbreviation, name] = entry.split(':')
    const tag = name.replaceAll(' ', '')
    return [
      [abbreviation.toLowerCase(), tag],
      [name.toLowerCase(), tag],
    ]
  })
)

const fields = new Map(
  [
    'Biology',
    'Chemistry',
    'Cognitive Science',
    'Computer Science',
    'Earth Science',
    'Electrical Engineering',
    'Environmental Science',
    'Mathematics',
    'Mechanical Engineering',
    'Medicine',
    'Physics',
    'Space Science',
  ].map((field) => [
    field.toLowerCase(),
    `${field.replaceAll(' ', '')}Programs`,
  ])
)

const programTypes = new Map([
  ['summer program', 'SummerPrograms'],
  ['academic year program', 'AcademicYearPrograms'],
  ['competition', 'StudentCompetitions'],
  ['internship', 'StudentInternships'],
  ['research experience', 'StudentResearch'],
  ['scholarship', 'Scholarships'],
  ['online course', 'OnlineCourses'],
  ['fellowship', 'StudentFellowships'],
  ['camp', 'StudentCamps'],
])

function normalized(value) {
  return typeof value === 'string'
    ? value.trim().toLowerCase()
    : ''
}

function includesHighSchool(opportunity) {
  const { gradeRangeLow: low, gradeRangeHigh: high } =
    opportunity
  return (
    Number.isInteger(low) &&
    Number.isInteger(high) &&
    low >= 0 &&
    high <= 16 &&
    low <= high &&
    low <= 12 &&
    high >= 9
  )
}

function geographicTag(opportunity) {
  const location = normalized(opportunity.location)
  const country = normalized(opportunity.locationCountry)
  if (
    ['virtual', 'online', 'remote'].includes(location) ||
    normalized(opportunity.programType) ===
      'online course' ||
    (country &&
      ![
        'us',
        'usa',
        'united states',
        'united states of america',
      ].includes(country))
  ) {
    return null
  }
  const state = states.get(
    normalized(opportunity.locationState)
  )
  if (!state) return null
  return `${state}${
    includesHighSchool(opportunity)
      ? 'HighSchoolProgram'
      : 'StudentPrograms'
  }`
}

function rankedTags(groups) {
  const counts = new Map()
  for (const group of groups) {
    for (const tag of new Set(group.filter(Boolean))) {
      counts.set(tag, (counts.get(tag) || 0) + 1)
    }
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag)
}

export function opportunityHashtags(
  opportunities,
  service
) {
  const entries = Array.isArray(opportunities)
    ? opportunities.filter(
        (entry) => entry && typeof entry === 'object'
      )
    : []
  const categories = [
    rankedTags(
      entries.map((entry) => [geographicTag(entry)])
    ),
    rankedTags(
      entries.map((entry) =>
        Array.isArray(entry.fields)
          ? entry.fields.map((field) =>
              fields.get(normalized(field))
            )
          : []
      )
    ),
    rankedTags(
      entries.map((entry) => [
        programTypes.get(normalized(entry.programType)),
      ])
    ),
  ]
  const limit = normalized(service) === 'facebook' ? 2 : 5
  const tags = new Set()
  // Rotate categories so multi-program posts retain subject and location context.
  for (let index = 0; index < limit; index += 1) {
    for (const category of categories) {
      if (tags.size < limit && category[index]) {
        tags.add(`#${category[index]}`)
      }
    }
  }
  if (!tags.size) tags.add('#StudentOpportunities')
  if (tags.size < limit) tags.add('#SciTeens')
  return [...tags]
}
