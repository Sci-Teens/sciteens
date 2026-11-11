const PROGRAM_ALIASES = {
  'research-science-institute': 'rsi',
  'research-science-institute-rsi-massachusetts-institute-of-technology':
    'rsi',
  'promys-program-in-mathematics-for-young-scientists':
    'promys-boston',
}

const LEGACY_ARTICLES = [
  'taking-action-to-plan-a-project',
  'tldr-science-hypothesis',
  'tldr-science-method',
  'tldr-science-abstracts',
  'tldr-science-figures',
  'tldr-science-conclusion',
  'zero-to-hero-ai',
]

function canonicalProgramSlug(slug) {
  return Object.hasOwn(PROGRAM_ALIASES, slug)
    ? PROGRAM_ALIASES[slug]
    : slug
}

function getLegacyRedirects() {
  return [
    ...LEGACY_ARTICLES.map((slug) => ({
      source: `/blog/${slug}`,
      destination: `/article/${slug}`,
      permanent: true,
    })),
    {
      source: '/home/programs',
      destination: '/opportunities',
      permanent: true,
    },
    ...Object.entries(PROGRAM_ALIASES).map(
      ([source, destination]) => ({
        source: `/program/${source}`,
        destination: `/program/${destination}`,
        permanent: true,
      })
    ),
  ]
}

module.exports = {
  PROGRAM_ALIASES,
  canonicalProgramSlug,
  getLegacyRedirects,
}
