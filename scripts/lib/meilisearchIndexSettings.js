// Relevance configuration for the Meilisearch `projects` index, shared by
// scripts/setup-meilisearch.js (provision) and
// scripts/reindex-meilisearch.js (backfill). Kept dependency-free so it can
// be unit tested without reaching a Meilisearch instance.
//
// Every value here was picked against a measured query battery rather than
// by taste. Re-measure before changing any of it:
//   node scripts/eval-meilisearch-relevance.js --baseline
// See the "Relevance tuning" section of infra/meilisearch/README.md for the
// before/after numbers and for the changes that were tried and rejected.
'use strict'

// English function words only. Project titles on SciTeens are dominated by
// them ("The Effect of X on Y", "How Does X Affect Y"), and because Meilisearch
// strips stop words from the query too, leaving them in lets a query like
// "how does sleep affect performance" rank every "How Does ..." title above
// the one project actually about sleep. Content words are never listed here,
// however common — "effect" and "study" still carry meaning in a search.
const STOP_WORDS = [
  'a',
  'an',
  'and',
  'are',
  'as',
  'at',
  'be',
  'but',
  'by',
  'can',
  'did',
  'do',
  'does',
  'for',
  'from',
  'had',
  'has',
  'have',
  'how',
  'i',
  'if',
  'in',
  'into',
  'is',
  'it',
  'its',
  'my',
  'of',
  'on',
  'or',
  'our',
  'over',
  's',
  'so',
  'than',
  'that',
  'the',
  'their',
  'then',
  'there',
  'these',
  'they',
  'this',
  'to',
  'under',
  'using',
  'was',
  'we',
  'were',
  'what',
  'when',
  'where',
  'which',
  'while',
  'why',
  'with',
  'you',
  'your',
]

// Abbreviation-to-expansion is one-way by design: a searcher types "cnn" and
// wants the projects whose abstracts spell it out, but someone who typed the
// full phrase already found them. Only the AI cluster and co2/carbon dioxide
// are declared mutually, because in those the short form appears in project
// text as often as the long one. `solar -> photovoltaic` is deliberately
// one-way: the reverse found nothing the literal token had not already
// matched, and dragged "solar wind" space-science projects into a query
// about panels.
//
// Expansions are kept narrow. These were tried and removed for reaching into
// unrelated topics: `dna -> genetic/genome` (matches "genetic algorithm" CS
// projects), `robot -> autonomous` (matches autonomous-vehicle work with no
// robotics in it), and `cv`/`ev` (collide with coefficient of variation and
// the electron-volt).
//
// `renewable -> wind` looks like the same over-reach but measurably is not,
// and the battery carries two adversarial documents (p34 "Solar Wind", p35
// "Wind Tunnel") to keep it honest. Dropping it halves recall on the
// renewable queries without improving precision: `matchingStrategy` defaults
// to `last`, so "renewable energy solar wind" sheds "wind" from the tail
// before it is ever matched, and only the expansion reaches the actual wind
// turbine project. Precision is 0.5 either way, because the solar-wind false
// positive arrives through `solar`, not through `wind`.
const SYNONYMS = {
  ai: ['artificial intelligence', 'machine learning'],
  'artificial intelligence': [
    'ai',
    'ml',
    'machine learning',
  ],
  ml: ['machine learning', 'artificial intelligence'],
  'machine learning': [
    'ml',
    'ai',
    'deep learning',
    'neural network',
  ],
  'deep learning': ['neural network', 'machine learning'],
  'neural network': ['nn', 'deep learning'],
  nn: ['neural network'],
  cnn: ['convolutional neural network'],
  nlp: ['natural language processing'],
  cs: ['computer science'],
  compsci: ['computer science'],
  'comp sci': ['computer science'],
  bio: ['biology'],
  chem: ['chemistry'],
  math: ['mathematics'],
  maths: ['mathematics'],
  stats: ['statistics'],
  env: ['environmental'],
  eco: ['ecology', 'ecological'],
  co2: ['carbon dioxide'],
  'carbon dioxide': ['co2'],
  h2o: ['water'],
  dna: ['deoxyribonucleic acid', 'gene'],
  rna: ['ribonucleic acid'],
  pv: ['photovoltaic', 'solar panel'],
  solar: ['photovoltaic'],
  renewable: ['solar', 'photovoltaic', 'wind'],
  covid: ['coronavirus', 'sars-cov-2', 'covid-19'],
  ecg: ['electrocardiogram'],
  eeg: ['electroencephalogram'],
  robot: ['robotic', 'robotics'],
}

const PROJECTS_INDEX_SETTINGS = {
  // Order IS the `attributeRank` priority order, lowest index wins. Names sit
  // above `abstract` so a project someone authored outranks one that merely
  // cites them in its body text.
  searchableAttributes: [
    'title',
    'member_names',
    'abstract',
    'fields',
  ],
  filterableAttributes: ['fields_facet', 'date'],
  // `upvote_count` is sortable for the "Most upvoted" listing option, on top
  // of its role as the ranking tiebreaker below.
  sortableAttributes: ['date', 'upvote_count'],
  // `attribute` (the older combined rule) is deliberately split into
  // `attributeRank` + `wordPosition` so `upvote_count:desc` can sit between
  // them: which attribute matched still dominates, but among hits that are
  // equally relevant the community-rated ones come first, instead of the
  // near-meaningless "matched nearer the start of the field" signal.
  // `exactness` deliberately stays ABOVE popularity: it is what keeps a
  // literal term ahead of a synonym expansion, so an upvoted near-match must
  // not be able to outrank an exact one.
  rankingRules: [
    'words',
    'typo',
    'proximity',
    'sort',
    'attributeRank',
    'exactness',
    'upvote_count:desc',
    'wordPosition',
  ],
  stopWords: STOP_WORDS,
  synonyms: SYNONYMS,
}

const OPPORTUNITY_SYNONYMS = {
  ...SYNONYMS,
  virtual: ['online', 'remote'],
  online: ['virtual', 'remote'],
  remote: ['virtual', 'online'],
  internship: ['intern'],
  intern: ['internship'],
  'high school': ['secondary school'],
  'secondary school': ['high school'],
  stem: [
    'science',
    'technology',
    'engineering',
    'mathematics',
  ],
}

const OPPORTUNITIES_INDEX_SETTINGS = {
  searchableAttributes: [
    'name',
    'programType',
    'fields',
    'location',
    'about',
    'eligibilityNotes',
    'cost',
    'financialAid',
    'stipend',
    'durationText',
  ],
  filterableAttributes: [
    'fields_facet',
    'grade_levels',
    'location_facets',
    'programType',
    'deadlineStatus',
    'applicationDeadline',
    'applicationOpensDate',
  ],
  sortableAttributes: [
    'applicationDeadline',
    'applicationOpensDate',
    'startDate',
    'name',
  ],
  rankingRules: [
    'words',
    'typo',
    'proximity',
    'sort',
    'attribute',
    'exactness',
  ],
  stopWords: STOP_WORDS,
  synonyms: OPPORTUNITY_SYNONYMS,
}

module.exports = {
  OPPORTUNITIES_INDEX_SETTINGS,
  OPPORTUNITY_SYNONYMS,
  PROJECTS_INDEX_SETTINGS,
  STOP_WORDS,
  SYNONYMS,
}
