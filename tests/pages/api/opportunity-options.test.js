import { describe, expect, it, vi } from 'vitest'

import handler from '../../../pages/api/opportunity-options'
import { fetchOpportunityOptions } from '../../../lib/opportunities'

vi.mock('firebase/app', () => ({
  getApp: () => ({}),
  getApps: () => [{}],
  initializeApp: vi.fn(),
}))

vi.mock('firebase/firestore', () => ({
  getFirestore: () => ({}),
}))

vi.mock('../../../lib/opportunities', () => ({
  fetchOpportunityOptions: vi.fn(),
}))

function response() {
  const res = {
    setHeader: vi.fn(),
    status: vi.fn(() => res),
    json: vi.fn(() => res),
  }
  return res
}

describe('/api/opportunity-options', () => {
  it('rejects query parameters before the collection read', async () => {
    const res = response()

    await handler(
      {
        method: 'GET',
        query: { cacheBust: 'unique' },
      },
      res
    )

    expect(res.status).toHaveBeenCalledWith(400)
    expect(fetchOpportunityOptions).not.toHaveBeenCalled()
  })
})
