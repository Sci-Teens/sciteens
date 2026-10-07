import { createRequire } from 'node:module'
import { describe, expect, it, vi } from 'vitest'

const { createRequestRunner, retryAfterMillis } =
  createRequire(import.meta.url)('./requestRetry')

function runner(options = {}) {
  let clock = 0
  const sleep = vi.fn(async (ms) => {
    clock += ms
  })
  const run = createRequestRunner({
    label: 'Test',
    now: () => clock,
    sleep,
    random: () => 1,
    log: () => {},
    ...options,
  })
  return { run, sleep, now: () => clock }
}

describe('request retries', () => {
  it('paces concurrent callers through one queue', async () => {
    const { run, now } = runner()
    const times = []
    await Promise.all(
      [1, 2, 3].map(() =>
        run(async () => times.push(now()))
      )
    )
    expect(times).toEqual([0, 1000, 2000])
  })

  it('retries overload with exponential delays before admitting queued callers', async () => {
    const { run, now } = runner()
    const times = []
    let attempts = 0
    const first = run(async () => {
      times.push(now())
      if (++attempts < 3)
        throw Object.assign(new Error('Overloaded'), {
          status: 429,
        })
      return 'recovered'
    })
    const second = run(async () => {
      times.push(now())
      return 'next'
    })
    expect(await Promise.all([first, second])).toEqual([
      'recovered',
      'next',
    ])
    expect(times).toEqual([0, 5000, 15000, 16000])
    expect(run.stats.retries).toBe(2)
  })

  it('honors Retry-After and limits retries on persistent failures', async () => {
    const { run, sleep } = runner({ maxAttempts: 3 })
    const error = Object.assign(new Error('Busy'), {
      status: 503,
      retryAfter: '30',
    })
    const request = vi.fn(async () => {
      throw error
    })
    await expect(run(request)).rejects.toMatchObject({
      retryExhausted: true,
    })
    expect(request).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls).toEqual([[30000], [30000]])
    expect(run.stats.exhausted).toBe(1)
    expect(await run(async () => 'next')).toBe('next')
  })

  it('does not retry permanent errors or unsafe URLs', async () => {
    for (const status of [400, 401, 403, 404]) {
      const { run } = runner()
      const request = vi.fn(async () => {
        throw Object.assign(new Error('Permanent'), {
          status,
        })
      })
      await expect(run(request)).rejects.toThrow(
        'Permanent'
      )
      expect(request).toHaveBeenCalledTimes(1)
    }
    const { run } = runner()
    const request = vi.fn(async () => {
      throw Object.assign(new Error('Unsafe'), {
        code: 'ERR_INVALID_IP_ADDRESS',
      })
    })
    await expect(run(request)).rejects.toThrow('Unsafe')
    expect(request).toHaveBeenCalledTimes(1)
  })

  it('retries transient network failures', async () => {
    const { run } = runner()
    const request = vi
      .fn()
      .mockRejectedValueOnce(
        Object.assign(new Error('Reset'), {
          code: 'ECONNRESET',
        })
      )
      .mockResolvedValue('ok')
    expect(await run(request)).toBe('ok')
    expect(request).toHaveBeenCalledTimes(2)
  })

  it('stops rather than retrying before an excessive server cooldown', async () => {
    const { run, sleep } = runner()
    const request = vi.fn(async () => {
      throw Object.assign(new Error('Quota'), {
        status: 429,
        retryAfter: '3600',
      })
    })
    await expect(run(request)).rejects.toMatchObject({
      retryExhausted: true,
    })
    expect(request).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
    const next = vi.fn(async () => 'next')
    await expect(run(next)).rejects.toMatchObject({
      retryExhausted: true,
    })
    expect(next).not.toHaveBeenCalled()
  })

  it('parses numeric and HTTP-date cooldowns', () => {
    expect(retryAfterMillis('2', 0)).toBe(2000)
    expect(
      retryAfterMillis(
        'Thu, 01 Jan 1970 00:00:05 GMT',
        1000
      )
    ).toBe(4000)
    expect(retryAfterMillis('invalid', 0)).toBe(0)
    expect(retryAfterMillis('-1', 0)).toBe(0)
  })
})
