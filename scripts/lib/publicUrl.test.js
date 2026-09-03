import dns from 'node:dns/promises'
import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  assertPublicHttpUrl,
  fetchPublicUrl,
  ipv4FromMappedIpv6,
  isNonNetworkScheme,
  isPrivateHost,
  isPrivateIpv4,
  isPrivateIpv6,
  MAX_REDIRECTS,
  publicHttpUrlOrNull,
  resolvePublicTarget,
  readResponseBuffer,
} from './publicUrl.js'

afterEach(() => {
  vi.restoreAllMocks()
})
const PRIVATE_TARGETS = [
  'http://localhost/x',
  'http://sub.localhost/x',
  'http://127.0.0.1/',
  'http://169.254.169.254/latest/meta-data',
  'http://metadata.google.internal/',
  'http://printer.local/',
  'http://10.0.0.5/',
  'http://192.168.1.1/',
  'http://172.16.0.1/',
  'http://172.31.255.1/',
  'http://100.64.0.1/',
  'http://0.0.0.0/',
  'http://192.0.0.1/',
  'http://192.0.2.1/',
  'http://198.18.0.1/',
  'http://198.51.100.1/',
  'http://203.0.113.1/',
  'http://224.0.0.1/',
  'http://240.0.0.1/',
  'http://[::1]/',
  'http://[fd00::1]/',
  'http://[fe80::1]/',
  'http://[fe90::1]/',
  'http://[febf::1]/',
  'http://[2001:db8::1]/',
  'http://[ff02::1]/',
  'http://[::ffff:127.0.0.1]/',
  'http://[::ffff:10.0.0.1]/',
  'http://[::ffff:7f00:1]/',
  'http://[::ffff:a9fe:a9fe]/',
]

const NON_HTTP = [
  'file:///etc/passwd',
  'ftp://example.com/',
  'javascript:alert(1)',
  'gopher://example.com/',
  'not-a-url',
  '',
]

describe('ipv4 ranges', () => {
  it('blocks the reserved and private blocks', () => {
    expect(isPrivateIpv4('127.0.0.1')).toBe(true)
    expect(isPrivateIpv4('10.1.2.3')).toBe(true)
    expect(isPrivateIpv4('169.254.169.254')).toBe(true)
    expect(isPrivateIpv4('192.168.0.1')).toBe(true)
    expect(isPrivateIpv4('100.64.0.1')).toBe(true)
    expect(isPrivateIpv4('192.0.0.1')).toBe(true)
    expect(isPrivateIpv4('198.18.0.1')).toBe(true)
    expect(isPrivateIpv4('224.0.0.1')).toBe(true)
    expect(isPrivateIpv4('240.0.0.1')).toBe(true)
  })

  it('allows public addresses either side of 172.16/12', () => {
    expect(isPrivateIpv4('172.15.0.1')).toBe(false)
    expect(isPrivateIpv4('172.16.0.1')).toBe(true)
    expect(isPrivateIpv4('172.31.255.255')).toBe(true)
    expect(isPrivateIpv4('172.32.0.1')).toBe(false)
    expect(isPrivateIpv4('8.8.8.8')).toBe(false)
  })
})

describe('ipv6 ranges', () => {
  it('covers the whole fe80::/10 link-local block', () => {
    expect(isPrivateIpv6('fe80::1')).toBe(true)
    expect(isPrivateIpv6('fe90::1')).toBe(true)
    expect(isPrivateIpv6('feaf::1')).toBe(true)
    expect(isPrivateIpv6('febf::1')).toBe(true)
  })

  it('blocks deprecated site-local addresses', () => {
    expect(isPrivateIpv6('fec0::1')).toBe(true)
    expect(isPrivateIpv6('2606:4700::1')).toBe(false)
  })

  it('blocks unique-local and loopback', () => {
    expect(isPrivateIpv6('fc00::1')).toBe(true)
    expect(isPrivateIpv6('fd12::1')).toBe(true)
    expect(isPrivateIpv6('::1')).toBe(true)
  })

  it('decodes ipv4-mapped forms before the ipv4 check', () => {
    expect(ipv4FromMappedIpv6('::ffff:7f00:1')).toBe(
      '127.0.0.1'
    )
    expect(ipv4FromMappedIpv6('::ffff:a9fe:a9fe')).toBe(
      '169.254.169.254'
    )
    expect(ipv4FromMappedIpv6('::ffff:10.0.0.1')).toBe(
      '10.0.0.1'
    )
    expect(ipv4FromMappedIpv6('2606:4700::1')).toBeNull()
    expect(isPrivateIpv6('::ffff:7f00:1')).toBe(true)
  })
})

describe('hostname suffixes', () => {
  it('blocks internal-only suffixes', () => {
    expect(isPrivateHost('metadata.google.internal')).toBe(
      true
    )
    expect(isPrivateHost('printer.local')).toBe(true)
    expect(isPrivateHost('localhost')).toBe(true)
    expect(isPrivateHost('example.com')).toBe(false)
  })
})

describe('publicHttpUrlOrNull', () => {
  it('rejects every private or link-local target', async () => {
    for (const target of PRIVATE_TARGETS) {
      expect(
        await publicHttpUrlOrNull(target),
        target
      ).toBeNull()
    }
  })

  it('rejects non-http schemes and malformed input', async () => {
    for (const target of NON_HTTP) {
      expect(
        await publicHttpUrlOrNull(target),
        target
      ).toBeNull()
    }
  })

  it('rejects a hostname that fails to resolve', async () => {
    expect(
      await publicHttpUrlOrNull(
        'http://this-host-should-not-resolve.invalid/'
      )
    ).toBeNull()
  })
})

describe('resolvePublicTarget', () => {
  it('resolves each request without a reusable safety cache', async () => {
    vi.spyOn(dns, 'lookup')
      .mockResolvedValueOnce([
        { address: '8.8.8.8', family: 4 },
      ])
      .mockResolvedValueOnce([
        { address: '169.254.169.254', family: 4 },
      ])

    await expect(
      resolvePublicTarget('https://rebind.example/page')
    ).resolves.toMatchObject({
      address: '8.8.8.8',
      family: 4,
    })
    await expect(
      resolvePublicTarget('https://rebind.example/page')
    ).resolves.toBeNull()
  })
})

describe('assertPublicHttpUrl', () => {
  it('throws a named error for a blocked target', async () => {
    await expect(
      assertPublicHttpUrl('http://169.254.169.254/')
    ).rejects.toThrow(/refused to fetch non-public URL/)
  })
})

describe('isNonNetworkScheme', () => {
  it('recognises schemes that cannot reach the network', () => {
    expect(isNonNetworkScheme('data:')).toBe(true)
    expect(isNonNetworkScheme('about:')).toBe(true)
    expect(isNonNetworkScheme('blob:')).toBe(true)
    expect(isNonNetworkScheme('http:')).toBe(false)
  })
})

describe('readResponseBuffer', () => {
  it('rejects a declared body above the byte limit', async () => {
    const response = new Response('small', {
      headers: { 'Content-Length': '100' },
    })
    await expect(
      readResponseBuffer(response, 10)
    ).rejects.toThrow('response body exceeds 10 bytes')
  })

  it('rejects a streaming body that crosses the byte limit', async () => {
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new Uint8Array(8))
          controller.enqueue(new Uint8Array(8))
          controller.close()
        },
      })
    )
    await expect(
      readResponseBuffer(response, 10)
    ).rejects.toThrow('response body exceeds 10 bytes')
  })

  it('returns a body at the byte limit', async () => {
    const response = new Response('1234567890')
    await expect(
      readResponseBuffer(response, 10)
    ).resolves.toEqual(Buffer.from('1234567890'))
  })
})

describe('fetchPublicUrl redirects', () => {
  function stubHops(hops) {
    const seen = []
    const request = vi.fn(async (url, options) => {
      seen.push({ url, options })
      const hop = hops[seen.length - 1]
      if (!hop) throw new Error(`unexpected fetch: ${url}`)
      return {
        status: hop.status,
        headers: {
          get: (name) =>
            name.toLowerCase() === 'location'
              ? hop.location || null
              : null,
        },
        body: hop.body,
      }
    })
    return { request, seen }
  }

  it('refuses a public url that redirects to link-local', async () => {
    const { request } = stubHops([
      { status: 302, location: 'http://169.254.169.254/' },
    ])
    await expect(
      fetchPublicUrl('https://example.com/logo.png', {
        request,
      })
    ).rejects.toThrow(/refused to fetch non-public URL/)
  })

  it('refuses a redirect chain that ends on loopback', async () => {
    const { request } = stubHops([
      { status: 302, location: 'https://example.org/next' },
      { status: 302, location: 'http://127.0.0.1/secret' },
    ])
    await expect(
      fetchPublicUrl('https://example.com/logo.png', {
        request,
      })
    ).rejects.toThrow(/refused to fetch non-public URL/)
  })

  it('follows a public redirect and returns the final response', async () => {
    const { request, seen } = stubHops([
      {
        status: 301,
        location: 'https://example.org/final',
      },
      { status: 200, body: 'bytes' },
    ])
    const response = await fetchPublicUrl(
      'https://example.com/logo.png',
      { request }
    )
    expect(response.status).toBe(200)
    expect(response.body).toBe('bytes')
    expect(seen).toHaveLength(2)
    expect(seen[0].options.address).toMatch(
      /^[0-9a-f:.]+$/i
    )
    expect([4, 6]).toContain(seen[0].options.family)
  })

  it('stops after the redirect budget', async () => {
    const { request } = stubHops(
      Array.from({ length: MAX_REDIRECTS + 2 }, () => ({
        status: 302,
        location: 'https://example.com/loop',
      }))
    )
    await expect(
      fetchPublicUrl('https://example.com/logo.png', {
        request,
      })
    ).rejects.toThrow(/too many redirects/)
  })
})
