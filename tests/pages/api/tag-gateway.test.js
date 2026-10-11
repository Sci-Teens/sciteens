import { Readable } from 'node:stream'
import { afterEach, describe, expect, it, vi } from 'vitest'
import handler from '../../../pages/api/tag-gateway/[[...path]]'

function request(options = {}) {
  return Object.assign(
    Readable.from(options.chunks || []),
    {
      method: 'GET',
      query: { path: [] },
      url: '/metrics/',
      headers: {},
      ...options,
    }
  )
}

function response() {
  const res = {
    setHeader: vi.fn(),
    status: vi.fn(() => res),
    end: vi.fn(() => res),
  }
  return res
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function enable() {
  vi.stubEnv('NEXT_PUBLIC_GA_GATEWAY_ENABLED', 'true')
  vi.stubEnv('NEXT_PUBLIC_FB_MEASUREMENT_ID', 'G-TEST')
  const fetch = vi.fn().mockResolvedValue(
    new Response('ok', {
      headers: { 'content-type': 'application/javascript' },
    })
  )
  vi.stubGlobal('fetch', fetch)
  return fetch
}

describe('Google tag gateway', () => {
  it('does not forward requests when disabled', async () => {
    const fetch = enable()
    vi.stubEnv('NEXT_PUBLIC_GA_GATEWAY_ENABLED', 'false')
    const res = response()
    await handler(request(), res)
    expect(res.status).toHaveBeenCalledWith(404)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('preserves the path, query and raw POST body without forwarding credentials', async () => {
    const fetch = enable()
    const res = response()
    await handler(
      request({
        method: 'POST',
        query: { path: ['g', 'collect'] },
        url: '/metrics/g/collect?v=2&dl=https%3A%2F%2Fsciteens.org%2F',
        chunks: ['event=page_view\nsecond=event'],
        headers: {
          cookie:
            '__session=secret; _ga=visitor; _ga_TEST=session',
          authorization: 'Bearer secret',
          'x-country-code': 'FR',
          'user-agent': 'browser',
          'content-type': 'text/plain',
        },
      }),
      res
    )
    const [url, options] = fetch.mock.calls[0]
    expect(url).toBe(
      'https://g-test.fps.goog/metrics/g/collect?v=2&dl=https%3A%2F%2Fsciteens.org%2F'
    )
    expect(options.body.toString()).toBe(
      'event=page_view\nsecond=event'
    )
    expect(options.headers).toEqual({
      cookie: '_ga=visitor; _ga_TEST=session',
      'user-agent': 'browser',
      'content-type': 'text/plain',
      'X-Forwarded-Country': 'FR',
    })
    expect(res.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'private, no-store'
    )
  })

  it.each([['..'], ['https:', 'evil.example'], ['a/b']])(
    'rejects unsafe path segments: %s',
    async (...path) => {
      const fetch = enable()
      const res = response()
      await handler(request({ query: { path } }), res)
      expect(res.status).toHaveBeenCalledWith(400)
      expect(fetch).not.toHaveBeenCalled()
    }
  )

  it('rejects oversized request bodies', async () => {
    const fetch = enable()
    const res = response()
    await handler(
      request({
        method: 'POST',
        chunks: [Buffer.alloc(65537)],
      }),
      res
    )
    expect(res.status).toHaveBeenCalledWith(413)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('does not relay redirects or upstream cookies', async () => {
    const fetch = enable()
    fetch.mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: {
          location: 'https://evil.example',
          'set-cookie': 'secret=value',
        },
      })
    )
    const res = response()
    await handler(request(), res)
    expect(res.status).toHaveBeenCalledWith(502)
    expect(res.setHeader).toHaveBeenCalledTimes(1)
  })

  it('handles upstream failures', async () => {
    const fetch = enable()
    fetch.mockRejectedValue(new Error('timeout'))
    const res = response()
    await handler(request(), res)
    expect(res.status).toHaveBeenCalledWith(502)
  })
})
