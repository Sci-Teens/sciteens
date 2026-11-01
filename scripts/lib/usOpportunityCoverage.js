'use strict'

const JURISDICTIONS = {
  AL: 'Alabama',
  AK: 'Alaska',
  AZ: 'Arizona',
  AR: 'Arkansas',
  CA: 'California',
  CO: 'Colorado',
  CT: 'Connecticut',
  DE: 'Delaware',
  DC: 'District of Columbia',
  FL: 'Florida',
  GA: 'Georgia',
  HI: 'Hawaii',
  ID: 'Idaho',
  IL: 'Illinois',
  IN: 'Indiana',
  IA: 'Iowa',
  KS: 'Kansas',
  KY: 'Kentucky',
  LA: 'Louisiana',
  ME: 'Maine',
  MD: 'Maryland',
  MA: 'Massachusetts',
  MI: 'Michigan',
  MN: 'Minnesota',
  MS: 'Mississippi',
  MO: 'Missouri',
  MT: 'Montana',
  NE: 'Nebraska',
  NV: 'Nevada',
  NH: 'New Hampshire',
  NJ: 'New Jersey',
  NM: 'New Mexico',
  NY: 'New York',
  NC: 'North Carolina',
  ND: 'North Dakota',
  OH: 'Ohio',
  OK: 'Oklahoma',
  OR: 'Oregon',
  PA: 'Pennsylvania',
  RI: 'Rhode Island',
  SC: 'South Carolina',
  SD: 'South Dakota',
  TN: 'Tennessee',
  TX: 'Texas',
  UT: 'Utah',
  VT: 'Vermont',
  VA: 'Virginia',
  WA: 'Washington',
  WV: 'West Virginia',
  WI: 'Wisconsin',
  WY: 'Wyoming',
  AS: 'American Samoa',
  GU: 'Guam',
  MP: 'Northern Mariana Islands',
  PR: 'Puerto Rico',
  VI: 'U.S. Virgin Islands',
  US: 'United States nationwide and online',
}

const TRACKS = {
  research:
    'mentored laboratory or university research programs and research internships, including community colleges, HBCUs, tribal colleges, and regional universities',
  biomedical:
    'biomedical, public health, neuroscience, and hospital research internships or research camps; exclude clinical volunteering without a STEM learning program',
  'engineering-computing-math':
    'engineering, computing, robotics, mathematics, physics, and astronomy research programs, internships, and camps',
  'environment-agriculture':
    'environmental, marine, earth, agricultural, and field science research programs, internships, and camps at extension services, field stations, parks, and nonprofits',
  'camps-courses':
    'science and STEM residential or day camps and structured precollege courses with explicit STEM curricula, including paid and free local programs',
  'year-round':
    'school-year, after-school, weekend, or year-round STEM research mentorships and structured science programs at museums, libraries, community organizations, colleges, and laboratories',
  competitions:
    'science fairs and STEM competitions with verified high school eligibility, including local and regional affiliates',
}

const PRIMARY_TRACKS = Object.keys(TRACKS).filter(
  (track) => track !== 'competitions'
)

function buildUSQueries({ jurisdiction, track } = {}) {
  if (jurisdiction && !JURISDICTIONS[jurisdiction]) {
    throw new Error(
      `Unknown U.S. jurisdiction: ${jurisdiction}`
    )
  }
  if (track && !TRACKS[track]) {
    throw new Error(
      `Unknown U.S. discovery track: ${track}`
    )
  }
  const jurisdictions = jurisdiction
    ? [jurisdiction]
    : Object.keys(JURISDICTIONS)
  const tracks = track ? [track] : PRIMARY_TRACKS
  return jurisdictions.flatMap((code) =>
    tracks.map((key) => ({
      category: `us-${code.toLowerCase()}-${key}`,
      query: `Find official ${TRACKS[key]} for high school students in ${JURISDICTIONS[code]}. Include recurring programs between application cycles, local residency restrictions, and both paid and free programs. Search beyond nationally famous institutions. Use official program pages and verify high school eligibility. Exclude undergraduate-only programs, general admissions preparation, generic volunteering, and permanently discontinued programs. Return distinct programs with their own eligibility or application process, not multiple sessions of the same program.`,
    }))
  )
}

module.exports = {
  JURISDICTIONS,
  PRIMARY_TRACKS,
  TRACKS,
  buildUSQueries,
}
