import { describe, expect, it } from 'vitest'

import {
  buildPrefetchPrompt,
  ExtractionSchema,
  selectConsultedPages,
} from './opportunitySchema.js'

function validBase() {
  return {
    name: 'Test Program',
    about:
      'A two-sentence plain-language description of a test program.',
    location: 'Cambridge, MA',
    startDate: null,
    endDate: null,
    applicationDeadline: null,
    applicationOpensDate: null,
    deadlineStatus: 'unclear',
    gradeRangeLow: 9,
    gradeRangeHigh: 12,
    ageRangeLow: null,
    ageRangeHigh: null,
    fields: ['Computer Science'],
    eligibilityNotes: null,
    cost: 'Free',
    financialAid: 'Program is Free',
    stipend: 'Not specified',
    programType: 'Summer Program',
    durationText: '6 weeks',
    residential: 'Residential',
    contactEmail: null,
    applicationUrl: 'https://example.com/apply',
    reasoning: 'No deadline stated on the seed page.',
  }
}

describe('ExtractionSchema consultedPages', () => {
  it('accepts a valid extraction with empty consultedPages', () => {
    const result = ExtractionSchema.safeParse({
      ...validBase(),
      consultedPages: [],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.consultedPages).toEqual([])
    }
  })

  it('accepts a valid extraction with populated consultedPages', () => {
    const result = ExtractionSchema.safeParse({
      ...validBase(),
      consultedPages: [
        { url: 'https://example.com/', role: 'main' },
        {
          url: 'https://example.com/apply',
          role: 'deadline',
        },
        { url: 'https://example.com/cost', role: 'cost' },
      ],
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.consultedPages).toHaveLength(3)
      expect(result.data.consultedPages[0]).toEqual({
        url: 'https://example.com/',
        role: 'main',
      })
    }
  })

  it('defaults consultedPages to an empty array when missing', () => {
    const result = ExtractionSchema.safeParse(validBase())
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.consultedPages).toEqual([])
    }
  })

  it('rejects a consultedPage with an invalid url', () => {
    const result = ExtractionSchema.safeParse({
      ...validBase(),
      consultedPages: [{ url: 'not a url', role: 'main' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a consultedPage with an empty role', () => {
    const result = ExtractionSchema.safeParse({
      ...validBase(),
      consultedPages: [
        { url: 'https://example.com/', role: '' },
      ],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a consultedPage missing the role field', () => {
    const result = ExtractionSchema.safeParse({
      ...validBase(),
      consultedPages: [{ url: 'https://example.com/' }],
    })
    expect(result.success).toBe(false)
  })

  it('rejects a consultedPage missing the url field', () => {
    const result = ExtractionSchema.safeParse({
      ...validBase(),
      consultedPages: [{ role: 'main' }],
    })
    expect(result.success).toBe(false)
  })
})

describe('selectConsultedPages', () => {
  it('returns [] when the doc has no consultedPages field', () => {
    expect(selectConsultedPages({}, 5)).toEqual([])
    expect(selectConsultedPages(null, 5)).toEqual([])
    expect(selectConsultedPages(undefined, 5)).toEqual([])
  })

  it('returns [] when consultedPages is not an array', () => {
    expect(
      selectConsultedPages({ consultedPages: 'oops' }, 5)
    ).toEqual([])
    expect(
      selectConsultedPages(
        { consultedPages: { url: 'x' } },
        5
      )
    ).toEqual([])
  })

  it('drops entries that fail schema validation', () => {
    const result = selectConsultedPages(
      {
        consultedPages: [
          { url: 'not a url', role: 'main' },
          { url: 'https://example.com/', role: '' },
          null,
          'string',
          {
            url: 'https://example.com/ok',
            role: 'deadline',
          },
        ],
      },
      5
    )
    expect(result).toEqual([
      { url: 'https://example.com/ok', role: 'deadline' },
    ])
  })

  it('de-duplicates by url and preserves first occurrence', () => {
    const result = selectConsultedPages(
      {
        consultedPages: [
          { url: 'https://example.com/a', role: 'main' },
          {
            url: 'https://example.com/b',
            role: 'deadline',
          },
          { url: 'https://example.com/a', role: 'cost' },
        ],
      },
      5
    )
    expect(result).toEqual([
      { url: 'https://example.com/a', role: 'main' },
      { url: 'https://example.com/b', role: 'deadline' },
    ])
  })

  it('caps the result at the requested length', () => {
    const result = selectConsultedPages(
      {
        consultedPages: [
          { url: 'https://a/', role: 'a' },
          { url: 'https://b/', role: 'b' },
          { url: 'https://c/', role: 'c' },
          { url: 'https://d/', role: 'd' },
        ],
      },
      2
    )
    expect(result).toHaveLength(2)
    expect(result[0].url).toBe('https://a/')
  })
})

describe('buildPrefetchPrompt', () => {
  it('mentions every pre-fetched URL with its role', () => {
    const prompt = buildPrefetchPrompt('https://seed/', [
      {
        url: 'https://seed/',
        role: 'main',
        page: {
          ok: true,
          title: 'Home',
          bodyText: 'seed body',
        },
      },
      {
        url: 'https://seed/apply',
        role: 'deadline',
        page: {
          ok: true,
          title: 'Apply',
          bodyText: 'apply body',
        },
      },
    ])
    expect(prompt).toContain('https://seed/')
    expect(prompt).toContain('https://seed/apply')
    expect(prompt).toContain('main')
    expect(prompt).toContain('deadline')
    expect(prompt).toContain('seed body')
    expect(prompt).toContain('apply body')
  })

  it('surfaces a fetch error inline rather than dropping the entry', () => {
    const prompt = buildPrefetchPrompt('https://seed/', [
      {
        url: 'https://seed/apply',
        role: 'deadline',
        page: { ok: false, error: 'HTTP 503' },
      },
    ])
    expect(prompt).toContain('https://seed/apply')
    expect(prompt).toContain('HTTP 503')
  })

  it('handles an empty fetched list with a clear "no prior pages" note', () => {
    const prompt = buildPrefetchPrompt('https://seed/', [])
    expect(prompt).toContain('https://seed/')
    expect(prompt.toLowerCase()).toContain('no prior pages')
  })
})
