import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const sources = JSON.parse(
  readFileSync(
    join(
      import.meta.dirname,
      'data',
      'opportunity-sources.json'
    ),
    'utf8'
  )
)

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/

describe('opportunity-sources data file', () => {
  it('is a non-empty array', () => {
    expect(Array.isArray(sources)).toBe(true)
    expect(sources.length).toBeGreaterThan(0)
  })

  it('has a unique slug per entry', () => {
    const slugs = sources.map((s) => s.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('uses slugs that are safe as firestore ids and storage paths', () => {
    for (const source of sources) {
      expect(source.slug, source.slug).toMatch(SLUG_PATTERN)
    }
  })

  it('gives every entry a label and an https url', () => {
    for (const source of sources) {
      expect(source.label, source.slug).toBeTruthy()
      expect(source.category, source.slug).toBeTruthy()
      expect(
        new URL(source.url).protocol,
        source.slug
      ).toBe('https:')
    }
  })

  it('only ever uses https for a curated logo override', () => {
    for (const source of sources.filter((s) => s.logoUrl)) {
      expect(
        new URL(source.logoUrl).protocol,
        source.slug
      ).toBe('https:')
    }
  })

  it('carries no keys beyond the documented shape', () => {
    const allowed = new Set([
      'slug',
      'url',
      'label',
      'category',
      'logoUrl',
    ])
    for (const source of sources) {
      for (const key of Object.keys(source)) {
        expect(
          allowed.has(key),
          `${source.slug}.${key}`
        ).toBe(true)
      }
    }
  })
})
