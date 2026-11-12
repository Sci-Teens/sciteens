export const OPPORTUNITY_COLLECTION_UPDATED_AT =
  '2026-11-11'

export const OPPORTUNITY_COLLECTION_PROGRAMS = {
  rsi: {
    imageUrl:
      '/assets/opportunity-guides/rsi-research.webp',
    imageFit: 'cover',
    imagePosition: '65% 50%',
    imageSource: 'https://www.cee.org/',
    imageCaptionKey: 'opportunity_collections.images.rsi',
    imageAltKey: 'opportunity_collections.image_alt.rsi',
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
    imageUrl:
      '/assets/opportunity-guides/primes-mentoring.webp',
    imageFit: 'cover',
    imagePosition: '50% 20%',
    imageSource:
      'https://betterworld.mit.edu/spectrum/issues/spring-2022/mit-primes-a-plus-for-youth/',
    imageCaptionKey:
      'opportunity_collections.images.primes',
    imageAltKey: 'opportunity_collections.image_alt.primes',
    name: 'MIT PRIMES-USA',
    slug: 'mit-primes',
    sources: [
      'https://math.mit.edu/research/highschool/primes/usa/',
    ],
    format: 'remote_research',
    tuitionFree: true,
  },
  simons: {
    imageUrl:
      '/assets/opportunity-guides/simons-poster-session.webp',
    imageFit: 'cover',
    imageSource: 'https://www.stonybrook.edu/simons/',
    imageCaptionKey:
      'opportunity_collections.images.simons',
    imageAltKey: 'opportunity_collections.image_alt.simons',
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
    imageUrl:
      '/assets/opportunity-guides/lumiere-foundation.webp',
    imageFit: 'contain',
    imageKind: 'logo',
    imageSource: 'https://lumiere.foundation/',
    imageCaptionKey:
      'opportunity_collections.images.foundation',
    name: 'Lumiere Foundation Breakthrough Scholar Program',
    sources: [
      'https://lumiere.foundation/',
      'https://www.lumiere-education.com/post/17-virtual-free-research-opportunities-for-high-school-students-that-are-accepting-applications',
    ],
    format: 'remote_research',
    tuitionFree: true,
  },
  crowdmath: {
    imageUrl:
      '/assets/opportunity-guides/crowdmath-aops.webp',
    imageFit: 'contain',
    imageKind: 'logo',
    imageSource:
      'https://artofproblemsolving.com/polymath/mitprimes',
    imageCaptionKey:
      'opportunity_collections.images.crowdmath',
    name: 'MIT PRIMES / AoPS CrowdMath',
    sources: [
      'https://math.mit.edu/research/highschool/primes/',
      'https://artofproblemsolving.com/polymath/mitprimes',
    ],
    format: 'collaborative_research',
  },
  aimi: {
    imageAltKey: 'opportunity_collections.image_alt.aimi',
    imageCaptionKey: 'opportunity_collections.images.aimi',
    name: 'Stanford AIMI Summer Research Internship',
    slug: 'stanford-aimi-summer-research-internship',
    sources: [
      'https://aimi.stanford.edu/education/summer-research-internship',
    ],
    format: 'remote_research',
  },
  ssp: {
    imageUrl:
      '/assets/opportunity-guides/ssp-laboratory.webp',
    imageFit: 'cover',
    imagePosition: '65% 50%',
    imageSource: 'https://ssp.org/getting-started/',
    imageCaptionKey: 'opportunity_collections.images.ssp',
    imageAltKey: 'opportunity_collections.image_alt.ssp',
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
    imageUrl:
      '/assets/opportunity-guides/rockefeller-research.webp',
    imageFit: 'cover',
    imagePosition: '50% 35%',
    imageSource: 'https://www.rockefeller.edu/outreach/',
    imageCaptionKey:
      'opportunity_collections.images.rockefeller',
    imageAltKey:
      'opportunity_collections.image_alt.rockefeller',
    name: 'Rockefeller Summer Science Research Program',
    slug: 'the-rockefeller-university-hospital-s-summer-science-research-program',
    sources: ['https://www.rockefeller.edu/outreach/ssrp/'],
    format: 'campus_research',
  },
  gwc: {
    imageUrl:
      '/assets/opportunity-guides/gwc-collaboration.webp',
    imageFit: 'cover',
    imagePosition: '50% 35%',
    imageSource:
      'https://girlswhocode.com/programs/pathways',
    imageCaptionKey: 'opportunity_collections.images.gwc',
    imageAltKey: 'opportunity_collections.image_alt.gwc',
    name: 'Girls Who Code Pathways',
    slug: 'girls-who-code-pathways',
    sources: ['https://girlswhocode.com/programs/pathways'],
    format: 'self_paced',
    tuitionFree: true,
  },
  kwk: {
    imageAltKey: 'opportunity_collections.image_alt.kwk',
    imageCaptionKey: 'opportunity_collections.images.kwk',
    name: 'Kode With Klossy',
    slug: 'kode-with-klossy',
    sources: ['https://www.kodewithklossy.com/programs'],
    format: 'coding_camp',
    tuitionFree: true,
  },
  spinwip: {
    imageUrl: '/assets/opportunity-guides/kipac.webp',
    imageFit: 'contain',
    imageKind: 'logo',
    imageSource:
      'https://kipac.stanford.edu/outreach-and-public-engagement-kipac/spinwip',
    imageCaptionKey:
      'opportunity_collections.images.spinwip',
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
    updatedAt: OPPORTUNITY_COLLECTION_UPDATED_AT,
    programs: collection.programIds.map((id) => ({
      id,
      ...OPPORTUNITY_COLLECTION_PROGRAMS[id],
    })),
  }
}
