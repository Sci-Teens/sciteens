import { describe, expect, it } from 'vitest'

const {
  OPPORTUNITIES_INDEX_SETTINGS,
  OPPORTUNITY_SYNONYMS,
  PROJECTS_INDEX_SETTINGS,
  STOP_WORDS,
  SYNONYMS,
} = require('./meilisearchIndexSettings')
const {
  CANONICAL_FIELDS,
  toOpportunitySearchDocument,
  toSearchDocument,
} = require('../../functions/search')

// Every attribute named in the settings has to be one the indexer actually
// emits. Meilisearch accepts a name that matches nothing without complaint,
// so a typo here is a silent relevance regression, not an error.
const INDEXED_ATTRIBUTES = Object.keys(
  toSearchDocument('p1', {
    title: 'T',
    abstract: 'A',
    fields: ['Biology'],
    member_arr: [{ uid: 'u1', display: 'Ada' }],
    date: '2024-01-01',
    upvote_count: 1,
  })
)

describe('projects index settings', () => {
  it('only names attributes the indexer emits', () => {
    const named = [
      ...PROJECTS_INDEX_SETTINGS.searchableAttributes,
      ...PROJECTS_INDEX_SETTINGS.filterableAttributes,
      ...PROJECTS_INDEX_SETTINGS.sortableAttributes,
      ...PROJECTS_INDEX_SETTINGS.rankingRules
        .filter((rule) => rule.includes(':'))
        .map((rule) => rule.split(':')[0]),
    ]
    expect(
      named.filter(
        (attribute) =>
          !INDEXED_ATTRIBUTES.includes(attribute)
      )
    ).toEqual([])
  })

  // `attributeRank` reads this array's order, so a project someone authored
  // must outrank one that merely names them in its abstract.
  it('ranks member names above the abstract', () => {
    const searchable =
      PROJECTS_INDEX_SETTINGS.searchableAttributes
    expect(searchable).toContain('member_names')
    expect(searchable.indexOf('member_names')).toBeLessThan(
      searchable.indexOf('abstract')
    )
  })

  // Meilisearch rejects the whole settings PATCH if the combined `attribute`
  // rule appears alongside either of the rules it was split into.
  it('never mixes `attribute` with its split replacements', () => {
    const rules = PROJECTS_INDEX_SETTINGS.rankingRules
    expect(rules).not.toContain('attribute')
    expect(rules).toContain('attributeRank')
    expect(rules).toContain('wordPosition')
  })

  // Popularity decides only among hits that are already equally relevant.
  // `exactness` stays above it, because that rule is what keeps a literal
  // term ahead of a synonym expansion; below it, an upvoted near-match
  // outranks an exact one.
  it('breaks ties on upvotes, but never above exactness', () => {
    const rules = PROJECTS_INDEX_SETTINGS.rankingRules
    const upvotes = rules.indexOf('upvote_count:desc')
    expect(upvotes).toBeGreaterThan(
      rules.indexOf('attributeRank')
    )
    expect(upvotes).toBeGreaterThan(
      rules.indexOf('exactness')
    )
    expect(upvotes).toBeLessThan(
      rules.indexOf('wordPosition')
    )
  })

  // Meilisearch documents a custom ranking rule over an attribute that is
  // missing on some documents as undefined behaviour, and `toSearchDocument`
  // emits `date: null` for a project with no or an unparseable date.
  it('never ranks on an attribute the indexer can emit as null', () => {
    const nullable = Object.entries(
      toSearchDocument('p1', {})
    )
      .filter(([, value]) => value === null)
      .map(([key]) => key)
    const custom = PROJECTS_INDEX_SETTINGS.rankingRules
      .filter((rule) => rule.includes(':'))
      .map((rule) => rule.split(':')[0])
    expect(
      custom.filter((attribute) =>
        nullable.includes(attribute)
      )
    ).toEqual([])
  })

  it('sorts on upvote_count so the listing can offer it', () => {
    expect(
      PROJECTS_INDEX_SETTINGS.sortableAttributes
    ).toContain('upvote_count')
  })

  // Meilisearch lowercases tokens before matching, so a capitalised or
  // duplicated entry is dead weight that never fires.
  it('keeps stop words lowercase and unique', () => {
    expect(STOP_WORDS).toEqual(
      STOP_WORDS.map((word) => word.toLowerCase())
    )
    expect(new Set(STOP_WORDS).size).toBe(STOP_WORDS.length)
  })

  // Derived from real data rather than a hand-list, so it keeps biting as
  // the vocabulary grows: a stop word is stripped from the query too, so any
  // term the product itself treats as meaningful must not appear here.
  it('never stops a word the product treats as meaningful', () => {
    const meaningful = new Set([
      ...CANONICAL_FIELDS.flatMap((field) =>
        field.toLowerCase().split(' ')
      ),
      ...Object.keys(SYNONYMS).flatMap((key) =>
        key.split(' ')
      ),
      ...Object.values(SYNONYMS).flatMap((expansions) =>
        expansions.flatMap((expansion) =>
          expansion.toLowerCase().split(' ')
        )
      ),
    ])
    expect(
      STOP_WORDS.filter((word) => meaningful.has(word))
    ).toEqual([])
  })

  // `member_names` is searchable, and stop words are stripped from documents
  // as well as queries, so a stop word that is also a common given name
  // makes that person unfindable by first name.
  it('never stops a common given name', () => {
    for (const name of [
      'will',
      'grace',
      'mark',
      'may',
      'rose',
      'art',
      'sky',
      'faith',
    ]) {
      expect(STOP_WORDS).not.toContain(name)
    }
  })

  it('keeps synonym keys lowercase and non-empty', () => {
    for (const [key, expansions] of Object.entries(
      SYNONYMS
    )) {
      expect(key).toBe(key.toLowerCase())
      expect(expansions.length).toBeGreaterThan(0)
      expect(expansions).not.toContain(key)
    }
  })

  // Expanding to a stop word would expand to nothing at all.
  it('never expands a synonym into a stop word', () => {
    for (const expansions of Object.values(SYNONYMS)) {
      for (const expansion of expansions) {
        for (const word of expansion.split(' ')) {
          expect(STOP_WORDS).not.toContain(
            word.toLowerCase()
          )
        }
      }
    }
  })

  // The comment above SYNONYMS claims exactly these pairs are mutual.
  // Meilisearch synonyms are neither bidirectional nor transitive, so an
  // unlisted reverse is silent one-way behaviour.
  it('declares the pairs it calls mutual in both directions', () => {
    for (const [left, right] of [
      ['ai', 'artificial intelligence'],
      ['ai', 'machine learning'],
      ['ml', 'machine learning'],
      ['ml', 'artificial intelligence'],
      ['machine learning', 'deep learning'],
      ['deep learning', 'neural network'],
      ['co2', 'carbon dioxide'],
    ]) {
      expect(SYNONYMS[left]).toContain(right)
      expect(SYNONYMS[right]).toContain(left)
    }
  })

  // Not an oversight: the reverse was measured to add a "solar wind"
  // space-science false positive while finding nothing the literal token
  // did not already match.
  it('keeps solar -> photovoltaic one-way', () => {
    expect(SYNONYMS.solar).toContain('photovoltaic')
    expect(SYNONYMS.photovoltaic).toBeUndefined()
  })
})

describe('opportunities index settings', () => {
  const indexedAttributes = Object.keys(
    toOpportunitySearchDocument('o1', {
      name: 'Research Program',
      about: 'Biology research',
      location: 'Singapore',
      fields: ['Biology'],
    })
  )

  it('only names attributes that the opportunity indexer emits', () => {
    const named = [
      ...OPPORTUNITIES_INDEX_SETTINGS.searchableAttributes,
      ...OPPORTUNITIES_INDEX_SETTINGS.filterableAttributes,
      ...OPPORTUNITIES_INDEX_SETTINGS.sortableAttributes,
    ]
    expect(
      named.filter(
        (attribute) =>
          !indexedAttributes.includes(attribute)
      )
    ).toEqual([])
  })

  it('supports every student-facing filter and date order', () => {
    expect(
      OPPORTUNITIES_INDEX_SETTINGS.filterableAttributes
    ).toEqual(
      expect.arrayContaining([
        'fields_facet',
        'grade_levels',
        'programType',
        'deadlineStatus',
        'applicationDeadline',
        'applicationOpensDate',
      ])
    )
    expect(
      OPPORTUNITIES_INDEX_SETTINGS.sortableAttributes
    ).toEqual(
      expect.arrayContaining([
        'applicationDeadline',
        'applicationOpensDate',
        'name',
      ])
    )
  })

  it('searches location, eligibility, and costs without exposing private fields', () => {
    expect(
      OPPORTUNITIES_INDEX_SETTINGS.searchableAttributes
    ).toEqual(
      expect.arrayContaining([
        'location',
        'locationCity',
        'locationState',
        'locationPostalCode',
        'locationCountry',
        'eligibilityNotes',
        'cost',
        'financialAid',
        'stipend',
      ])
    )
    expect(
      OPPORTUNITIES_INDEX_SETTINGS.searchableAttributes
    ).not.toEqual(
      expect.arrayContaining([
        'contactEmail',
        'reasoning',
        'consultedPages',
      ])
    )
  })

  it('matches virtual, online, and remote in both directions', () => {
    expect(OPPORTUNITY_SYNONYMS.virtual).toContain('online')
    expect(OPPORTUNITY_SYNONYMS.online).toContain('remote')
    expect(OPPORTUNITY_SYNONYMS.remote).toContain('virtual')
  })
})
