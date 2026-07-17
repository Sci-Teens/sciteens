import { describe, expect, it, vi } from 'vitest'
import {
  getProjectUpvoteRef,
  normalizeUpvoteCount,
  toggleProjectUpvote,
} from './projectUpvotes'

vi.mock('firebase/firestore', () => ({
  doc: (db, ...path) => ({ path: path.join('/'), db }),
  runTransaction: vi.fn(),
}))

import { runTransaction } from 'firebase/firestore'

describe('normalizeUpvoteCount', () => {
  it('returns 0 for missing/invalid values', () => {
    expect(normalizeUpvoteCount(undefined)).toBe(0)
    expect(normalizeUpvoteCount(null)).toBe(0)
    expect(normalizeUpvoteCount('x')).toBe(0)
    expect(normalizeUpvoteCount(-3)).toBe(0)
    expect(normalizeUpvoteCount(Number.NaN)).toBe(0)
  })

  it('floors finite non-negative numbers', () => {
    expect(normalizeUpvoteCount(0)).toBe(0)
    expect(normalizeUpvoteCount(3.9)).toBe(3)
    expect(normalizeUpvoteCount('7')).toBe(7)
  })
})

describe('getProjectUpvoteRef', () => {
  it('builds projects/{id}/upvotes/{uid}', () => {
    const ref = getProjectUpvoteRef({}, 'p1', 'u1')
    expect(ref.path).toBe('projects/p1/upvotes/u1')
  })
})

describe('toggleProjectUpvote', () => {
  it('rejects missing args before opening a transaction', async () => {
    await expect(
      toggleProjectUpvote(null, 'p1', 'u1')
    ).rejects.toThrow(/missing args/)
    expect(runTransaction).not.toHaveBeenCalled()
  })

  it('creates a vote and increments count when missing', async () => {
    const db = {}
    runTransaction.mockImplementation(async (_db, fn) => {
      const projectSnap = {
        exists: () => true,
        data: () => ({ upvote_count: 2 }),
      }
      const upvoteSnap = { exists: () => false }
      const transaction = {
        get: vi
          .fn()
          .mockResolvedValueOnce(projectSnap)
          .mockResolvedValueOnce(upvoteSnap),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      }
      return fn(transaction)
    })

    await expect(
      toggleProjectUpvote(db, 'p1', 'u1')
    ).resolves.toEqual({ upvoted: true, upvote_count: 3 })
  })

  it('removes a vote and decrements count when present', async () => {
    const db = {}
    runTransaction.mockImplementation(async (_db, fn) => {
      const projectSnap = {
        exists: () => true,
        data: () => ({ upvote_count: 1 }),
      }
      const upvoteSnap = { exists: () => true }
      const transaction = {
        get: vi
          .fn()
          .mockResolvedValueOnce(projectSnap)
          .mockResolvedValueOnce(upvoteSnap),
        set: vi.fn(),
        update: vi.fn(),
        delete: vi.fn(),
      }
      return fn(transaction)
    })

    await expect(
      toggleProjectUpvote(db, 'p1', 'u1')
    ).resolves.toEqual({
      upvoted: false,
      upvote_count: 0,
    })
  })
})
