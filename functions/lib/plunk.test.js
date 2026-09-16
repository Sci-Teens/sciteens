import { describe, expect, it, vi } from 'vitest'

const {
  buildPlunkEmailPayload,
  buildNewsletterCampaignPayload,
  addTransactionalContact,
  plunkRequest,
} = require('./plunk')

describe('buildPlunkEmailPayload', () => {
  it('uses Plunk HTML content and a named sender', () => {
    expect(
      buildPlunkEmailPayload({
        to: 'ada@example.org',
        toName: 'Ada Lovelace',
        subject: 'Verify Email',
        html: '<p>Verify your email</p>',
      })
    ).toEqual({
      from: {
        name: 'SciTeens',
        email: 'noreply@sciteens.org',
      },
      to: {
        name: 'Ada Lovelace',
        email: 'ada@example.org',
      },
      subject: 'Verify Email',
      body: '<p>Verify your email</p>',
    })
  })
})

describe('buildNewsletterCampaignPayload', () => {
  it('targets the newsletter segment as a marketing campaign', () => {
    expect(
      buildNewsletterCampaignPayload({
        segmentId: 'segment_123',
        name: 'September 2026',
        subject: 'September at SciTeens',
        html: '<p>Newsletter</p>',
      })
    ).toEqual({
      name: 'September 2026',
      subject: 'September at SciTeens',
      body: '<p>Newsletter</p>',
      from: 'noreply@sciteens.org',
      fromName: 'SciTeens',
      type: 'MARKETING',
      audienceType: 'SEGMENT',
      segmentId: 'segment_123',
    })
  })
})

describe('plunkRequest', () => {
  it('uses the secret key and unwraps a successful response', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: 'email_123' },
      }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      plunkRequest(
        '/v1/send',
        { method: 'POST' },
        'sk_test'
      )
    ).resolves.toEqual({ id: 'email_123' })

    expect(fetchMock).toHaveBeenCalledWith(
      'https://next-api.useplunk.com/v1/send',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer sk_test',
        }),
      })
    )
    vi.unstubAllGlobals()
  })
})

describe('addTransactionalContact', () => {
  it('preserves a confirmed newsletter subscription', async () => {
    const fetchMock = vi.fn()
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: [
            {
              id: 'segment_123',
              name: 'SciTeens - Transactional',
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      })
    vi.stubGlobal('fetch', fetchMock)

    await addTransactionalContact(
      { email: 'ada@example.org' },
      'sk_test',
      { subscribed: true }
    )

    const payloads = fetchMock.mock.calls
      .slice(1)
      .map(([, init]) => JSON.parse(init.body))
    expect(payloads).toEqual([
      expect.objectContaining({ subscribed: true }),
      expect.objectContaining({ subscribed: true }),
    ])
    vi.unstubAllGlobals()
  })
})
