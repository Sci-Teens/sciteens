'use strict'

const dns = require('node:dns').promises
const http = require('node:http')
const https = require('node:https')
const { Readable } = require('node:stream')
const net = require('node:net')

const nonGlobalIpv4 = new net.BlockList()
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
]) {
  nonGlobalIpv4.addSubnet(address, prefix, 'ipv4')
}

const nonGlobalIpv6 = new net.BlockList()
for (const [address, prefix] of [
  ['::', 128],
  ['::1', 128],
  ['64:ff9b:1::', 48],
  ['100::', 64],
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['3fff::', 20],
  ['5f00::', 16],
  ['fc00::', 7],
  ['fe80::', 10],
  ['fec0::', 10],
  ['ff00::', 8],
]) {
  nonGlobalIpv6.addSubnet(address, prefix, 'ipv6')
}

function isPrivateIpv4(host) {
  return (
    net.isIP(host) === 4 &&
    nonGlobalIpv4.check(host, 'ipv4')
  )
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
  const mappedIpv4 = ipv4FromMappedIpv6(addr)
  if (mappedIpv4) return isPrivateIpv4(mappedIpv4)
  return (
    net.isIP(addr) === 6 &&
    nonGlobalIpv6.check(addr, 'ipv6')
  )
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

async function resolvePublicTarget(rawUrl) {
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

  let records
  try {
    records = await dns.lookup(parsed.hostname, {
      all: true,
    })
  } catch {
    return null
  }
  if (
    records.length === 0 ||
    records.some((record) =>
      record.family === 6
        ? isPrivateIpv6(record.address)
        : isPrivateIpv4(record.address)
    )
  ) {
    return null
  }
  return {
    url: parsed.toString(),
    address: records[0].address,
    family: records[0].family,
  }
}

async function resolvesToPrivateAddress(hostname) {
  return !(await resolvePublicTarget(`http://${hostname}`))
}

function isNonNetworkScheme(protocol) {
  return (
    protocol === 'data:' ||
    protocol === 'about:' ||
    protocol === 'blob:'
  )
}

async function publicHttpUrlOrNull(rawUrl) {
  const target = await resolvePublicTarget(rawUrl)
  return target ? target.url : null
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
function requestPinnedUrl(
  url,
  { address, family, headers, signal }
) {
  const parsed = new URL(url)
  const client = parsed.protocol === 'https:' ? https : http
  const requestHeaders = Object.fromEntries(
    new Headers(headers || {}).entries()
  )

  return new Promise((resolve, reject) => {
    const request = client.request(
      parsed,
      {
        headers: requestHeaders,
        signal,
        lookup: (_hostname, _options, callback) => {
          callback(null, address, family)
        },
      },
      (incoming) => {
        const responseHeaders = new Headers()
        for (const [name, value] of Object.entries(
          incoming.headers
        )) {
          if (Array.isArray(value)) {
            for (const item of value) {
              responseHeaders.append(name, item)
            }
          } else if (value !== undefined) {
            responseHeaders.set(name, value)
          }
        }
        const status = incoming.statusCode || 500
        const body = [101, 204, 205, 304].includes(status)
          ? null
          : Readable.toWeb(incoming)
        resolve(
          new Response(body, {
            status,
            statusText: incoming.statusMessage,
            headers: responseHeaders,
          })
        )
      }
    )
    request.on('error', reject)
    request.end()
  })
}

async function fetchPublicUrlOnce(
  rawUrl,
  { headers, signal, request = requestPinnedUrl } = {}
) {
  const target = String(rawUrl)
  const resolved = await resolvePublicTarget(target)
  if (!resolved) {
    throw new Error(
      `refused to fetch non-public URL: ${target.slice(
        0,
        200
      )}`
    )
  }
  return request(resolved.url, {
    address: resolved.address,
    family: resolved.family,
    headers,
    signal,
  })
}

async function fetchPublicUrl(
  rawUrl,
  {
    headers,
    signal,
    maxRedirects = MAX_REDIRECTS,
    request = requestPinnedUrl,
  } = {}
) {
  let target = String(rawUrl)
  for (let hop = 0; hop <= maxRedirects; hop++) {
    const response = await fetchPublicUrlOnce(target, {
      headers,
      signal,
      request,
    })
    if (!REDIRECT_STATUSES.has(response.status)) {
      return response
    }
    const location = response.headers.get('location')
    if (!location) return response
    target = new URL(location, target).toString()
  }
  throw new Error(
    `too many redirects for ${String(rawUrl).slice(0, 200)}`
  )
}

async function readResponseBuffer(response, maxBytes) {
  const declaredLength = Number(
    response.headers.get('content-length')
  )
  if (
    Number.isFinite(declaredLength) &&
    declaredLength > maxBytes
  ) {
    throw new Error(
      `response body exceeds ${maxBytes} bytes`
    )
  }
  if (!response.body) {
    throw new Error('response body is missing')
  }

  const chunks = []
  let total = 0
  for await (const chunk of response.body) {
    const buffer = Buffer.from(chunk)
    total += buffer.length
    if (total > maxBytes) {
      await response.body.cancel().catch(() => {})
      throw new Error(
        `response body exceeds ${maxBytes} bytes`
      )
    }
    chunks.push(buffer)
  }
  return Buffer.concat(chunks, total)
}

module.exports = {
  isPrivateIpv4,
  isPrivateIpv6,
  ipv4FromMappedIpv6,
  isPrivateHost,
  isNonNetworkScheme,
  resolvesToPrivateAddress,
  resolvePublicTarget,
  publicHttpUrlOrNull,
  assertPublicHttpUrl,
  fetchPublicUrl,
  requestPinnedUrl,
  fetchPublicUrlOnce,
  readResponseBuffer,
  MAX_REDIRECTS,
}
