'use strict'

const dns = require('node:dns').promises

function isPrivateIpv4(host) {
  const octets = host.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/)
  if (!octets) return false
  const a = Number(octets[1])
  const b = Number(octets[2])
  if (a === 0 || a === 10 || a === 127) return true
  if (a === 169 && b === 254) return true
  if (a === 192 && b === 168) return true
  if (a === 172 && b >= 16 && b <= 31) return true
  if (a === 100 && b >= 64 && b <= 127) return true
  return false
}

function ipv4FromMappedIpv6(addr) {
  const mapped = addr.match(/^(?:::ffff:)(.+)$/)
  if (!mapped) return null
  const tail = mapped[1]
  if (/^\d+\.\d+\.\d+\.\d+$/.test(tail)) return tail
  const hextets = tail.match(
    /^([0-9a-f]{1,4}):([0-9a-f]{1,4})$/
  )
  if (!hextets) return null
  const high = parseInt(hextets[1], 16)
  const low = parseInt(hextets[2], 16)
  return [high >> 8, high & 255, low >> 8, low & 255].join(
    '.'
  )
}

function isPrivateIpv6(host) {
  const addr = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (addr === '::1' || addr === '::') return true
  if (/^f[cd]/.test(addr)) return true
  if (/^fe[89ab]/.test(addr)) return true
  const mappedIpv4 = ipv4FromMappedIpv6(addr)
  return mappedIpv4 ? isPrivateIpv4(mappedIpv4) : false
}

function isPrivateHost(host) {
  const name = host.replace(/^\[|\]$/g, '').toLowerCase()
  if (
    name === 'localhost' ||
    name.endsWith('.localhost') ||
    name.endsWith('.internal') ||
    name.endsWith('.local')
  ) {
    return true
  }
  return isPrivateIpv4(name) || isPrivateIpv6(name)
}

const privateHostnameCache = new Map()

async function resolvesToPrivateAddress(hostname) {
  const cached = privateHostnameCache.get(hostname)
  if (cached !== undefined) return cached
  let isPrivate
  try {
    const records = await dns.lookup(hostname, {
      all: true,
    })
    isPrivate = records.some((record) =>
      record.family === 6
        ? isPrivateIpv6(record.address)
        : isPrivateIpv4(record.address)
    )
  } catch {
    isPrivate = true
  }
  privateHostnameCache.set(hostname, isPrivate)
  return isPrivate
}

function isNonNetworkScheme(protocol) {
  return (
    protocol === 'data:' ||
    protocol === 'about:' ||
    protocol === 'blob:'
  )
}

async function publicHttpUrlOrNull(rawUrl) {
  let parsed
  try {
    parsed = new URL(String(rawUrl))
  } catch {
    return null
  }
  if (
    parsed.protocol !== 'http:' &&
    parsed.protocol !== 'https:'
  ) {
    return null
  }
  if (isPrivateHost(parsed.hostname)) return null
  if (await resolvesToPrivateAddress(parsed.hostname)) {
    return null
  }
  return parsed.toString()
}

async function assertPublicHttpUrl(rawUrl) {
  const safeUrl = await publicHttpUrlOrNull(rawUrl)
  if (!safeUrl) {
    throw new Error(
      `refused to fetch non-public URL: ${String(
        rawUrl
      ).slice(0, 200)}`
    )
  }
  return safeUrl
}

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const MAX_REDIRECTS = 5

async function fetchPublicUrl(
  rawUrl,
  { headers, signal, maxRedirects = MAX_REDIRECTS } = {}
) {
  let target = await assertPublicHttpUrl(rawUrl)
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetch(target, {
      redirect: 'manual',
      headers,
      signal,
    })
    if (!REDIRECT_STATUSES.has(response.status)) {
      return response
    }
    const location = response.headers.get('location')
    if (!location) return response
    target = await assertPublicHttpUrl(
      new URL(location, target).toString()
    )
  }
  throw new Error(
    `too many redirects for ${String(rawUrl).slice(0, 200)}`
  )
}

module.exports = {
  isPrivateIpv4,
  isPrivateIpv6,
  ipv4FromMappedIpv6,
  isPrivateHost,
  isNonNetworkScheme,
  resolvesToPrivateAddress,
  publicHttpUrlOrNull,
  assertPublicHttpUrl,
  fetchPublicUrl,
  MAX_REDIRECTS,
}
