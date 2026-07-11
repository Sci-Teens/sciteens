import { describe, expect, it } from 'vitest'
import { getDefaultProjectImage } from './defaultProjectImage'

describe('getDefaultProjectImage', () => {
  it('is deterministic for the same id', () => {
    expect(getDefaultProjectImage('project-123')).toBe(
      getDefaultProjectImage('project-123')
    )
  })

  it('always returns one of the bundled default assets', () => {
    const ids = [
      'a',
      'b',
      'p8',
      'p9',
      'IDKXgtgY7n2ctl7S0Bl9',
      '',
      undefined,
      null,
    ]
    for (const id of ids) {
      expect(getDefaultProjectImage(id)).toMatch(
        /^\/assets\/project-defaults\/default-[1-8]\.svg$/
      )
    }
  })

  it('spreads across more than one default for a varied set of ids', () => {
    const ids = Array.from(
      { length: 30 },
      (_, i) => `project-${i}`
    )
    const results = new Set(
      ids.map((id) => getDefaultProjectImage(id))
    )
    expect(results.size).toBeGreaterThan(1)
  })
})
