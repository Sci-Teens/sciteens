import { describe, expect, it, vi } from 'vitest'

import handler from '../../../pages/api/og'

describe('/api/og', () => {
  it('rejects methods that do not render a public image', async () => {
    const res = {
      setHeader: vi.fn(),
      status: vi.fn(() => res),
      end: vi.fn(() => res),
    }

    await handler({ method: 'POST' }, res)

    expect(res.setHeader).toHaveBeenCalledWith(
      'Allow',
      'GET, HEAD'
    )
    expect(res.status).toHaveBeenCalledWith(405)
  })
})
