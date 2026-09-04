import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import { getDocs } from 'firebase/firestore'

import {
  deadlineDisplay,
  fetchOpenNowOpportunities,
  fetchOpportunityOptions,
  normalizeOpportunity,
} from './opportunities.js'

vi.mock('firebase/firestore', () => {
  class FakeTimestamp {
    constructor(date) {
      this.date = date
    }
    static now() {
      return new FakeTimestamp(
        new Date('2026-08-24T00:00:00Z')
      )
    }
    static fromDate(date) {
      return new FakeTimestamp(date)
    }
    toDate() {
      return this.date
    }
  }
  return {
    collection: (_db, name) => ({ collection: name }),
    getDocs: vi.fn(),
    orderBy: (field, dir) => ({ orderBy: field, dir }),
    query: (base, ...constraints) => ({
      base,
      constraints,
    }),
    Timestamp: FakeTimestamp,
    where: (field, op, value) => ({
      where: field,
      op,
      value,
    }),
  }
})

beforeEach(() => {
  vi.clearAllMocks()
})

function snapshotOf(docs) {
  return {
    forEach: (fn) =>
      docs.forEach((d) =>
        fn({ id: d.id, data: () => d.data })
      ),
  }
}

describe('normalizeOpportunity', () => {
  it('strips lastScrapedAt but keeps what the UI renders', () => {
    const normalized = normalizeOpportunity({
      slug: 'rsi',
      name: 'RSI',
      deadlineStatus: 'unclear',
      lastScrapedAt: { toDate: () => new Date() },
      sourceUrl: 'https://example.org/rsi',
    })
    expect(normalized.lastScrapedAt).toBeUndefined()
    expect(normalized.name).toBe('RSI')
    expect(normalized.sourceUrl).toBe(
      'https://example.org/rsi'
    )
  })

  it('converts stored Timestamps to iso strings and leaves nulls alone', () => {
    const normalized = normalizeOpportunity({
      applicationDeadline: {
        toDate: () => new Date('2027-01-15T00:00:00Z'),
      },
      applicationOpensDate: null,
    })
    expect(normalized.applicationDeadline).toBe(
      '2027-01-15T00:00:00.000Z'
    )
    expect(normalized.applicationOpensDate).toBeNull()
  })

  it('passes a nullish doc straight through', () => {
    expect(normalizeOpportunity(null)).toBeNull()
  })
})

describe('fetchOpportunityOptions', () => {
  it('returns named opportunities in the query order', async () => {
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'alpha-program',
          data: () => ({ name: 'Alpha Program' }),
        },
        {
          id: 'missing-name',
          data: () => ({ about: 'No name' }),
        },
      ],
    })

    await expect(
      fetchOpportunityOptions({})
    ).resolves.toEqual([
      {
        id: 'alpha-program',
        name: 'Alpha Program',
      },
    ])
    expect(getDocs.mock.calls[0][0].constraints).toEqual([
      {
        orderBy: 'name',
        dir: 'asc',
      },
    ])
  })
})

describe('fetchOpenNowOpportunities', () => {
  it('combines dated and rolling opportunities for the build snapshot', async () => {
    getDocs
      .mockResolvedValueOnce(
        snapshotOf([
          {
            id: 'dated',
            data: {
              name: 'Dated Program',
              deadlineStatus: 'dated',
              applicationDeadline: {
                toDate: () =>
                  new Date('2027-01-15T00:00:00Z'),
              },
              contactEmail: 'private@example.com',
              reasoning: 'Private pipeline note',
              consultedPages: [
                { url: 'https://example.com' },
              ],
              sourceCategory: 'Australia',
              sourceUrl:
                'https://example.com/private-source',
            },
          },
        ])
      )
      .mockResolvedValueOnce(
        snapshotOf([
          {
            id: 'rolling',
            data: {
              name: 'Rolling Program',
              deadlineStatus: 'rolling',
            },
          },
        ])
      )

    const results = await fetchOpenNowOpportunities({})
    expect(results.map(({ slug }) => slug)).toEqual([
      'dated',
      'rolling',
    ])
    expect(results[0].applicationDeadline).toBe(
      '2027-01-15T00:00:00.000Z'
    )
    expect(results[0].contactEmail).toBeUndefined()
    expect(results[0].reasoning).toBeUndefined()
    expect(results[0].consultedPages).toBeUndefined()
    expect(results[0].sourceCategory).toBeUndefined()
    expect(results[0].sourceUrl).toBeUndefined()
    expect(getDocs.mock.calls[0][0].constraints).toEqual([
      {
        where: 'deadlineStatus',
        op: '==',
        value: 'dated',
      },
      {
        where: 'applicationDeadline',
        op: '>=',
        value: expect.objectContaining({
          date: expect.any(Date),
        }),
      },
      {
        orderBy: 'applicationDeadline',
        dir: 'asc',
      },
    ])
    expect(getDocs.mock.calls[1][0].constraints).toEqual([
      {
        where: 'deadlineStatus',
        op: '==',
        value: 'rolling',
      },
    ])
  })
})

describe('deadlineDisplay', () => {
  it('shows the deadline for a dated program', () => {
    expect(
      deadlineDisplay({
        deadlineStatus: 'dated',
        applicationDeadline: '2027-01-15T00:00:00.000Z',
      })
    ).toEqual({
      kind: 'dated',
      date: '2027-01-15T00:00:00.000Z',
    })
  })

  it('shows the opens date for an upcoming program', () => {
    expect(
      deadlineDisplay({
        deadlineStatus: 'upcoming',
        applicationOpensDate: '2026-11-01T00:00:00.000Z',
      })
    ).toEqual({
      kind: 'opens',
      date: '2026-11-01T00:00:00.000Z',
    })
  })

  it('claims rolling admission only when the source said so', () => {
    expect(
      deadlineDisplay({ deadlineStatus: 'rolling' })
    ).toEqual({ kind: 'rolling', date: null })
  })

  it('never calls an unclear program rolling', () => {
    const display = deadlineDisplay({
      deadlineStatus: 'unclear',
      applicationDeadline: null,
      applicationOpensDate: null,
    })
    expect(display.kind).toBe('unknown')
    expect(display.kind).not.toBe('rolling')
  })

  it('falls back to unknown, not rolling, when a dated program lost its date', () => {
    expect(
      deadlineDisplay({
        deadlineStatus: 'dated',
        applicationDeadline: null,
      }).kind
    ).toBe('unknown')
  })

  it('falls back to unknown, not rolling, when an upcoming date failed to parse', () => {
    expect(
      deadlineDisplay({
        deadlineStatus: 'upcoming',
        applicationOpensDate: null,
      }).kind
    ).toBe('unknown')
  })

  it('treats a missing program as unknown', () => {
    expect(deadlineDisplay(null).kind).toBe('unknown')
    expect(deadlineDisplay(undefined).kind).toBe('unknown')
  })
})
