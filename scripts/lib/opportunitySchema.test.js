import { describe, expect, it } from 'vitest'

import { ExtractionSchema } from './opportunitySchema.js'

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
