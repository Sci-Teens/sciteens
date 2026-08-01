import { describe, expect, it } from 'vitest'
import { formatMediumDate } from './formatDate'

// Regression coverage for the "project start date never renders" bug:
// pages/project/[id]/index.js used to read the non-existent
// `project.start_date` field (the Firestore doc stores `start`), so the
// hero date always resolved to an empty paragraph. This is the shared
// helper the listing pages and the detail page both call.
describe('formatMediumDate', () => {
  it('formats an ISO date string in the requested locale', () => {
    expect(
      formatMediumDate('2024-03-15T12:00:00.000Z', 'en')
    ).toBe('Mar 15, 2024')
  })

  it('formats a Firestore Timestamp-shaped value via toDate()', () => {
    const timestamp = {
      toDate: () => new Date('2024-03-15T12:00:00.000Z'),
    }
    expect(formatMediumDate(timestamp, 'en')).toBe(
      'Mar 15, 2024'
    )
  })

  it('returns an empty string for a missing date instead of "now"', () => {
    expect(formatMediumDate(undefined)).toBe('')
    expect(formatMediumDate(null)).toBe('')
    expect(formatMediumDate('')).toBe('')
  })

  it('returns an empty string for an unparseable date', () => {
    expect(formatMediumDate('not-a-date')).toBe('')
  })

  it('defaults to English when no locale is given', () => {
    expect(
      formatMediumDate('2024-03-15T12:00:00.000Z')
    ).toBe('Mar 15, 2024')
  })

  it('translates the month for a non-English locale', () => {
    expect(
      formatMediumDate('2024-03-15T12:00:00.000Z', 'fr')
    ).toBe('15 mars 2024')
  })

  // The listing pages render on the server and rehydrate on the client;
  // an unpinned timezone would format either side of midnight
  // differently and trip a hydration mismatch.
  it('pins UTC so a late-evening timestamp cannot shift a day', () => {
    expect(
      formatMediumDate('2024-03-15T23:30:00.000Z', 'en')
    ).toBe('Mar 15, 2024')
  })

  // Parsed as local time by `new Date`, so without normalisation the
  // rendered day depends on the machine. vitest pins TZ=Asia/Kolkata
  // (UTC+5:30), where 02:00 local is the previous day in UTC.
  it('reads an offset-less datetime as UTC', () => {
    expect(formatMediumDate('2024-03-16T02:00', 'en')).toBe(
      'Mar 16, 2024'
    )
  })
})
