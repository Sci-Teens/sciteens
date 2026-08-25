import { afterEach, describe, expect, it } from 'vitest'

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
} from './publicUrl.js'

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
  'http://[::1]/',
  'http://[fd00::1]/',
  'http://[fe80::1]/',
  'http://[fe90::1]/',
  'http://[febf::1]/',
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

  it('allows addresses just outside fe80::/10', () => {
    expect(isPrivateIpv6('fec0::1')).toBe(false)
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

describe('fetchPublicUrl redirects', () => {
  const realFetch = globalThis.fetch

  afterEach(() => {
    globalThis.fetch = realFetch
  })

  function stubHops(hops) {
    const seen = []
    globalThis.fetch = async (url) => {
      seen.push(url)
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
    }
    return seen
  }

  it('refuses a public url that redirects to link-local', async () => {
    stubHops([
      { status: 302, location: 'http://169.254.169.254/' },
    ])
    await expect(
      fetchPublicUrl('https://example.com/logo.png')
    ).rejects.toThrow(/refused to fetch non-public URL/)
  })

  it('refuses a redirect chain that ends on loopback', async () => {
    stubHops([
      { status: 302, location: 'https://example.org/next' },
      { status: 302, location: 'http://127.0.0.1/secret' },
    ])
    await expect(
      fetchPublicUrl('https://example.com/logo.png')
    ).rejects.toThrow(/refused to fetch non-public URL/)
  })

  it('follows a public redirect and returns the final response', async () => {
    const seen = stubHops([
      {
        status: 301,
        location: 'https://example.org/final',
      },
      { status: 200, body: 'bytes' },
    ])
    const response = await fetchPublicUrl(
      'https://example.com/logo.png'
    )
    expect(response.status).toBe(200)
    expect(response.body).toBe('bytes')
    expect(seen).toHaveLength(2)
  })

  it('stops after the redirect budget', async () => {
    stubHops(
      Array.from({ length: MAX_REDIRECTS + 2 }, () => ({
        status: 302,
        location: 'https://example.com/loop',
      }))
    )
    await expect(
      fetchPublicUrl('https://example.com/logo.png')
    ).rejects.toThrow(/too many redirects/)
  })
})
