export const OPPORTUNITY_COLLECTION_REVIEWED_AT =
  '2026-11-10'

export const OPPORTUNITY_COLLECTION_PROGRAMS = {
  rsi: {
    name: 'Research Science Institute (RSI)',
    slug: 'rsi',
    sources: [
      'https://www.cee.org/programs/research-science-institute',
      'https://www.cee.org/programs/research-science-institute-rsi/rsi-application-faqs',
    ],
    format: 'residential',
    tuitionFree: true,
  },
  primes: {
    name: 'MIT PRIMES-USA',
    sources: [
      'https://math.mit.edu/research/highschool/primes/usa/',
    ],
    format: 'remote_research',
    tuitionFree: true,
  },
  simons: {
    name: 'Simons Summer Research Program',
    slug: 'simons-summer-research',
    sources: [
      'https://www.stonybrook.edu/simons/',
      'https://www.stonybrook.edu/simons/about/faqs.html',
    ],
    format: 'campus_research',
    tuitionFree: true,
  },
  foundation: {
    name: 'Lumiere Foundation Breakthrough Scholar Program',
    sources: [
      'https://lumiere.foundation/',
      'https://www.lumiere-education.com/post/17-virtual-free-research-opportunities-for-high-school-students-that-are-accepting-applications',
    ],
    format: 'remote_research',
    tuitionFree: true,
  },
  crowdmath: {
    name: 'MIT PRIMES / AoPS CrowdMath',
    sources: [
      'https://math.mit.edu/research/highschool/primes/',
      'https://artofproblemsolving.com/polymath/mitprimes',
    ],
    format: 'collaborative_research',
  },
  aimi: {
    name: 'Stanford AIMI Summer Research Internship',
    slug: 'stanford-aimi-summer-research-internship',
    sources: [
      'https://aimi.stanford.edu/education/summer-research-internship',
    ],
    format: 'remote_research',
  },
  ssp: {
    name: 'Summer Science Program (SSP)',
    slug: 'ssp',
    sources: [
      'https://ssp.org/getting-started/',
      'https://ssp.org/fees-financial-aid/',
      'https://ssp.org/faqs/',
    ],
    format: 'residential',
  },
  rockefeller: {
    name: 'Rockefeller Summer Science Research Program',
    slug: 'the-rockefeller-university-hospital-s-summer-science-research-program',
    sources: ['https://www.rockefeller.edu/outreach/ssrp/'],
    format: 'campus_research',
  },
  gwc: {
    name: 'Girls Who Code Pathways',
    slug: 'girls-who-code-pathways',
    sources: ['https://girlswhocode.com/programs/pathways'],
    format: 'self_paced',
    tuitionFree: true,
  },
  kwk: {
    name: 'Kode With Klossy',
    slug: 'kode-with-klossy',
    sources: ['https://www.kodewithklossy.com/programs'],
    format: 'coding_camp',
    tuitionFree: true,
  },
  spinwip: {
    name: 'Stanford SPINWIP',
    sources: [
      'https://physics.stanford.edu/about/inclusion/spinwip',
    ],
    format: 'remote_outreach',
    tuitionFree: true,
  },
}

export const OPPORTUNITY_COLLECTIONS = [
  {
    slug: 'free-research-programs',
    key: 'free',
    programIds: ['rsi', 'primes', 'simons', 'foundation'],
  },
  {
    slug: 'virtual-research-programs',
    key: 'virtual',
    programIds: [
      'primes',
      'crowdmath',
      'aimi',
      'foundation',
    ],
  },
  {
    slug: 'international-students',
    key: 'international',
    programIds: [
      'rsi',
      'ssp',
      'gwc',
      'spinwip',
      'foundation',
    ],
  },
  {
    slug: 'biology-research',
    key: 'biology',
    programIds: ['simons', 'rockefeller', 'ssp', 'aimi'],
  },
  {
    slug: 'computer-science',
    key: 'computing',
    programIds: ['gwc', 'kwk', 'primes', 'aimi'],
  },
  {
    slug: 'summer-research-programs',
    key: 'summer',
    programIds: ['rsi', 'simons', 'rockefeller', 'ssp'],
  },
]

export function getOpportunityCollectionSlugs() {
  return OPPORTUNITY_COLLECTIONS.map(({ slug }) => slug)
}

export function getOpportunityCollection(slug) {
  const collection = OPPORTUNITY_COLLECTIONS.find(
    (entry) => entry.slug === slug
  )
  if (!collection) return null

  return {
    ...collection,
    reviewedAt: OPPORTUNITY_COLLECTION_REVIEWED_AT,
    programs: collection.programIds.map((id) => ({
      id,
      ...OPPORTUNITY_COLLECTION_PROGRAMS[id],
    })),
  }
}
