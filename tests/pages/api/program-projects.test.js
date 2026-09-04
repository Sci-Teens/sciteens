import {
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import handler from '../../../pages/api/program-projects'
import { fetchProgramProjectsPage } from '../../../lib/programProjects'

vi.mock('firebase/app', () => ({
  getApp: () => ({}),
  getApps: () => [{}],
  initializeApp: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
}))

vi.mock('../../../lib/programProjects', () => ({
  fetchProgramProjectsPage: vi.fn(),
}))

function response() {
  const res = {
    setHeader: vi.fn(),
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  }
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
  fetchProgramProjectsPage.mockResolvedValue({
    projects: [],
    nextCursor: null,
  })
})

describe('/api/program-projects', () => {
  it('accepts any Firestore-safe document id as a cursor', async () => {
    const res = response()

    await handler(
      {
        method: 'GET',
        query: {
          opportunity: 'research-week',
          cursor: 'student project ? 研究',
        },
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(200)
    expect(fetchProgramProjectsPage).toHaveBeenCalledWith(
      {},
      'research-week',
      'student project ? 研究'
    )
  })

  it('rejects a cursor that contains a path separator', async () => {
    const res = response()

    await handler(
      {
        method: 'GET',
        query: {
          opportunity: 'research-week',
          cursor: 'projects/other',
        },
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(400)
    expect(fetchProgramProjectsPage).not.toHaveBeenCalled()
  })
})
