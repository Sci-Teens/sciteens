import { describe, expect, it } from 'vitest'

const {
  CORPUS,
  QUERIES,
  RANK_ONE_EXPECTATIONS,
  precisionAtK,
  recall,
  reciprocalRank,
  summarize,
} = require('./relevanceBattery')

// The metrics decide whether a relevance change ships, so a bug here would
// quietly bless a regression. The fixture checks matter for the same reason:
// a judgement naming a document that is not in the corpus caps the score
// below 1.0 forever and looks like a search defect.
describe('relevance metrics', () => {
  it('scores a perfect top-5 as 1, normalised by the reachable ceiling', () => {
    expect(precisionAtK(['a', 'b', 'c'], ['a', 'b'])).toBe(
      1
    )
    expect(
      precisionAtK(
        ['a', 'b', 'c', 'd', 'e'],
        ['a', 'b', 'c', 'd', 'e', 'f']
      )
    ).toBe(1)
  })

  it('ignores hits past k', () => {
    expect(
      precisionAtK(['x', 'x', 'x', 'x', 'x', 'a'], ['a'])
    ).toBe(0)
  })

  it('measures recall over the whole returned list', () => {
    expect(recall(['x', 'a'], ['a', 'b'])).toBe(0.5)
    expect(recall([], ['a'])).toBe(0)
    expect(recall(['a'], [])).toBe(0)
  })

  it('reports the reciprocal of the first relevant rank', () => {
    expect(reciprocalRank(['a'], ['a'])).toBe(1)
    expect(reciprocalRank(['x', 'x', 'a'], ['a'])).toBe(
      1 / 3
    )
    expect(reciprocalRank(['x'], ['a'])).toBe(0)
  })

  it('averages to three decimals and survives an empty run', () => {
    expect(
      summarize([
        { 'P@5': 1, recall: 1, MRR: 1 },
        { 'P@5': 0, recall: 0.5, MRR: 0 },
      ])
    ).toEqual({ 'P@5': 0.5, recall: 0.75, MRR: 0.5 })
    expect(summarize([])).toEqual({
      'P@5': 0,
      recall: 0,
      MRR: 0,
    })
  })
})

describe('relevance fixtures', () => {
  const ids = new Set(CORPUS.map((project) => project.id))

  it('has a unique id per corpus document', () => {
    expect(ids.size).toBe(CORPUS.length)
  })

  it('only judges documents that exist in the corpus', () => {
    for (const { q, relevant } of QUERIES) {
      expect(relevant.length).toBeGreaterThan(0)
      for (const id of relevant) {
        expect(
          ids.has(id),
          `query "${q}" judges unknown document ${id}`
        ).toBe(true)
      }
    }
  })

  it('only expects rank-1 documents that exist and are judged relevant', () => {
    for (const { q, expect: id } of RANK_ONE_EXPECTATIONS) {
      const query = QUERIES.find((entry) => entry.q === q)
      expect(
        query,
        `no battery query for "${q}"`
      ).toBeDefined()
      expect(ids.has(id)).toBe(true)
      expect(query.relevant).toContain(id)
    }
  })

  // Each adversarial document only earns its place if something in the
  // corpus can be confused with it.
  it('keeps the adversarial documents that pin the ranking rules', () => {
    for (const id of ['p32', 'p33', 'p34', 'p35']) {
      expect(ids.has(id)).toBe(true)
    }
  })
})
