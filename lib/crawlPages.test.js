import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { fetchListingArchive } from './crawlPages'
import { getDocs, limit } from 'firebase/firestore'

vi.mock('./firestore', () => ({ db: {} }))
vi.mock('./projects', () => ({
  normalizeProject: (value) => value,
}))
vi.mock('firebase/firestore', () => ({
  collection: vi.fn((_db, section) => section),
  documentId: () => '__name__',
  getDocs: vi.fn(),
  limit: vi.fn((count) => count),
  orderBy: vi.fn((...args) => args),
  query: vi.fn((...args) => args),
  where: vi.fn(),
  Timestamp: {},
}))

function snapshot(items) {
  return {
    docs: items.map(({ id, ...data }) => ({
      id,
      data: () => data,
    })),
  }
}

beforeEach(() => vi.clearAllMocks())

describe('fetchListingArchive', () => {
  it('uses a bounded read and serializes only the requested project page', async () => {
    const records = Array.from(
      { length: 24 },
      (_, index) => ({
        id: String(index),
        title: `Project ${index}`,
        date: '2026-01-01',
      })
    )
    getDocs.mockResolvedValue(snapshot(records))
    const result = await fetchListingArchive('projects', 2)
    expect(limit).toHaveBeenCalledWith(25)
    expect(result.items.map((item) => item.id)).toEqual(
      records.slice(10, 20).map((item) => item.id)
    )
    expect(result.hasNextPage).toBe(true)
  })

  it('omits duplicate program aliases and undefined fields from page props', async () => {
    getDocs.mockResolvedValue(
      snapshot([
        {
          id: 'research-science-institute-rsi-massachusetts-institute-of-technology',
          name: 'RSI',
        },
        { id: 'rsi', name: 'RSI' },
      ])
    )
    const result = await fetchListingArchive(
      'opportunities',
      1
    )
    expect(result.items.map((item) => item.slug)).toEqual([
      'rsi',
    ])
    expect(result.hasNextPage).toBe(false)
    expect(result.items[0]).not.toHaveProperty(
      'gradeRangeLow'
    )
  })

  it('does not disguise a database outage as an empty archive', async () => {
    getDocs.mockRejectedValue(new Error('unavailable'))
    await expect(
      fetchListingArchive('projects', 2)
    ).rejects.toThrow('unavailable')
  })
})
