import { describe, expect, it } from 'vitest'
import {
  getOpportunityCollection,
  getOpportunityCollectionSlugs,
  OPPORTUNITY_COLLECTION_PROGRAMS,
} from './opportunityCollections'

describe('curated opportunity collections', () => {
  it('only resolves exact published collection paths', () => {
    expect(
      getOpportunityCollection('free-research-programs')
        ?.key
    ).toBe('free')
    for (const input of [
      undefined,
      '',
      '../free-research-programs',
      '__proto__',
      ['free-research-programs'],
    ]) {
      expect(getOpportunityCollection(input)).toBeNull()
    }
  })

  it('keeps paid and unverified-fee programs outside the free research guide', () => {
    const collection = getOpportunityCollection(
      'free-research-programs'
    )
    expect(
      collection.programs.length
    ).toBeGreaterThanOrEqual(4)
    expect(
      collection.programs.every(
        ({ tuitionFree }) => tuitionFree === true
      )
    ).toBe(true)
    expect(collection.programIds).not.toContain('aimi')
    expect(collection.programIds).not.toContain('ssp')
    expect(collection.programIds).not.toContain('crowdmath')
  })

  it('keeps coding courses separate from the virtual research list', () => {
    const collection = getOpportunityCollection(
      'virtual-research-programs'
    )
    expect(collection.programIds).not.toContain('gwc')
    expect(collection.programIds).not.toContain('kwk')
    expect(collection.programIds).not.toContain('spinwip')
  })

  it('provides reviewed sources and no duplicate rows for every guide', () => {
    for (const slug of getOpportunityCollectionSlugs()) {
      const collection = getOpportunityCollection(slug)
      expect(
        collection.programs.length
      ).toBeGreaterThanOrEqual(4)
      expect(new Set(collection.programIds).size).toBe(
        collection.programIds.length
      )
      expect(collection.reviewedAt).toMatch(
        /^\d{4}-\d{2}-\d{2}$/
      )
      for (const program of collection.programs) {
        expect(program.name).toBeTruthy()
        expect(program.sources.length).toBeGreaterThan(0)
        for (const source of program.sources) {
          const url = new URL(source)
          expect(url.protocol).toBe('https:')
          expect(url.username).toBe('')
          expect(url.password).toBe('')
        }
      }
    }
  })

  it('does not invent directory links for programs absent from the directory', () => {
    expect(
      OPPORTUNITY_COLLECTION_PROGRAMS.crowdmath.slug
    ).toBeUndefined()
    expect(
      OPPORTUNITY_COLLECTION_PROGRAMS.foundation.slug
    ).toBeUndefined()
  })
})
