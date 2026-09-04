import { describe, expect, it, vi } from 'vitest'
import { getDocs } from 'firebase/firestore'

import {
  fetchProgramProjectsPage,
  PROGRAM_PROJECTS_PAGE_SIZE,
  toProgramProjectCard,
} from './programProjects'

vi.mock('firebase/firestore', () => ({
  collection: (_db, name) => ({ collection: name }),
  documentId: () => '__name__',
  getDocs: vi.fn(),
  limit: (value) => ({ limit: value }),
  orderBy: (field) => ({ orderBy: field }),
  query: (base, ...constraints) => ({ base, constraints }),
  startAfter: (value) => ({ startAfter: value }),
  where: (field, op, value) => ({ field, op, value }),
}))

function snapshot(id, data = {}) {
  return { id, data: () => data }
}

describe('toProgramProjectCard', () => {
  it('uses the document id and bounds untrusted card fields', () => {
    const card = toProgramProjectCard(
      snapshot('real-id', {
        id: 'forged-id',
        title: 'x'.repeat(250),
        abstract: 'a'.repeat(1100),
        project_photo: 'https://attacker.example/photo.jpg',
        member_arr: [
          {
            uid: 'safe_uid',
            display: 'd'.repeat(250),
            slug: '../unsafe',
          },
        ],
        fields: ['Biology'],
        upvote_count: -10,
      })
    )

    expect(card.id).toBe('real-id')
    expect(card.title).toHaveLength(200)
    expect(card.abstract).toHaveLength(1000)
    expect(card.project_photo).toBe('')
    expect(card.member_arr).toEqual([
      {
        uid: 'safe_uid',
        display: 'd'.repeat(200),
        slug: '',
      },
    ])
    expect(card.upvote_count).toBe(0)
  })
})

describe('fetchProgramProjectsPage', () => {
  it('returns a bounded page and a cursor for remaining projects', async () => {
    getDocs.mockResolvedValueOnce({
      docs: Array.from(
        { length: PROGRAM_PROJECTS_PAGE_SIZE + 1 },
        (_, index) =>
          snapshot(`p${index}`, { title: `P${index}` })
      ),
    })

    const page = await fetchProgramProjectsPage(
      {},
      'research-week',
      'previous-id'
    )

    expect(page.projects).toHaveLength(
      PROGRAM_PROJECTS_PAGE_SIZE
    )
    expect(page.nextCursor).toBe('p11')
    expect(getDocs.mock.calls[0][0].constraints).toEqual([
      {
        field: 'opportunity_id',
        op: '==',
        value: 'research-week',
      },
      { orderBy: '__name__' },
      { startAfter: 'previous-id' },
      { limit: PROGRAM_PROJECTS_PAGE_SIZE + 1 },
    ])
  })
})
