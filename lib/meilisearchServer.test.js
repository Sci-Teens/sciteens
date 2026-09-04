import { afterEach, describe, expect, it, vi } from 'vitest'

import { meiliMultiSearch } from './meilisearchServer'

const originalNodeEnv = process.env.NODE_ENV

afterEach(() => {
  delete process.env.MEILI_HOST
  delete process.env.MEILI_SEARCH_KEY
  process.env.NODE_ENV = originalNodeEnv
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('meiliMultiSearch', () => {
  it('requires the server-side search key before it sends a request', async () => {
    process.env.MEILI_HOST = 'https://search.example'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      meiliMultiSearch([])
    ).rejects.toMatchObject({
      statusCode: 503,
    })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('requires HTTPS in production', async () => {
    process.env.NODE_ENV = 'production'
    process.env.MEILI_HOST = 'http://search.example'
    process.env.MEILI_SEARCH_KEY = 'search-only'
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(meiliMultiSearch([])).rejects.toThrow(
      'MEILI_HOST is not secure.'
    )
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('keeps the key in the server request and disables caching', async () => {
    process.env.MEILI_HOST = 'https://search.example/'
    process.env.MEILI_SEARCH_KEY = 'search-only'
    const fetchMock = vi
      .fn()
      .mockResolvedValue(Response.json({ results: [] }))
    vi.stubGlobal('fetch', fetchMock)

    await expect(
      meiliMultiSearch([{ indexUid: 'opportunities' }])
    ).resolves.toEqual({ results: [] })
    expect(fetchMock).toHaveBeenCalledWith(
      'https://search.example/multi-search',
      expect.objectContaining({
        cache: 'no-store',
        headers: expect.objectContaining({
          Authorization: 'Bearer search-only',
        }),
      })
    )
  })
})
