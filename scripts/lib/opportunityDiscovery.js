'use strict'

const crypto = require('node:crypto')
const { z } = require('zod')
const { fetchPublicUrlOnce } = require('./publicUrl')

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])
const MAX_REDIRECT_HOPS = 6
const RESOLVE_TIMEOUT_MS = 12000
const MAX_SLUG_LENGTH = 60

const CandidateSchema = z.object({
  name: z.string().trim().min(3),
  sourceChunkIndex: z.number().int().nonnegative(),
  evidence: z.string().trim().min(10),
  category: z.string().trim().min(1),
})

const CandidatesSchema = z.object({
  candidates: z.array(CandidateSchema),
})

// Fetch failures and name/URL mismatches do not establish that a program
// is unsuitable. Do not persist them as global source exclusions.
const RETRYABLE_REJECT_REASONS = new Set([
  'not_this_program',
  'page_inaccessible',
  'insufficient_content',
])

const REJECT_REASONS = [
  'not_this_program',
  'page_inaccessible',
  'insufficient_content',
  'defunct',
  'not_high_school',
  'not_legitimate',
  'not_stem',
]

const VerdictSchema = z
  .object({
    verdict: z.enum(['publish', 'reject']),
    rejectReason: z.enum(REJECT_REASONS).nullable(),
    reasoning: z.string().trim().min(1),
    redFlags: z.array(z.string()),
    officialUrl: z.string().trim().url().nullable(),
  })
  .refine(
    (v) =>
      v.verdict === 'publish'
        ? v.rejectReason === null
        : v.rejectReason !== null,
    {
      message:
        'rejectReason must be null for publish and set for reject',
    }
  )

function isRetryableReject(verdict) {
  return (
    verdict.verdict === 'reject' &&
    RETRYABLE_REJECT_REASONS.has(verdict.rejectReason)
  )
}

const TRACKING_PARAMS = new Set([
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_term',
  'utm_content',
  'utm_id',
  'utm_source_platform',
  'utm_creative_format',
  'utm_marketing_tactic',
  'gclid',
  'dclid',
  'fbclid',
  'msclkid',
  'mc_cid',
  'mc_eid',
])

function normalizeUrl(url) {
  try {
    const u = new URL(url)
    for (const key of [...u.searchParams.keys()]) {
      if (TRACKING_PARAMS.has(key.toLowerCase())) {
        u.searchParams.delete(key)
      }
    }
    // Sort parameter names, but preserve the order of repeated values.
    u.searchParams.sort()
    return (
      u.host.toLowerCase().replace(/^www\./, '') +
      u.pathname.replace(/\/+$/, '') +
      u.search
    )
  } catch {
    return String(url)
  }
}

function hostOf(url) {
  try {
    return new URL(url).hostname
      .toLowerCase()
      .replace(/^www\./, '')
  } catch {
    return ''
  }
}

function slugify(name) {
  return String(name)
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-+$/g, '')
}

function uniqueSlug(name, url, taken) {
  const base = slugify(name) || 'program'
  if (!taken.has(base)) return base
  const hash = crypto
    .createHash('sha1')
    .update(normalizeUrl(url))
    .digest('hex')
    .slice(0, 8)
  return `${base.slice(0, MAX_SLUG_LENGTH - 9)}-${hash}`
}

function significantWords(name) {
  return String(name)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 4)
}

// A candidate is only kept if some evidence snippet backed by its chosen
// chunk actually contains the program's name. Code-side backstop against
// the model pairing a name with a different program's source.
function chunkSupportsName(supportTexts, name) {
  const words = significantWords(name)
  if (words.length === 0) return false
  const needed = Math.max(1, Math.ceil(words.length / 2))
  return supportTexts.some((text) => {
    const lower = String(text).toLowerCase()
    const hits = words.filter((w) =>
      lower.includes(w)
    ).length
    return hits >= needed
  })
}

function buildEvidence(groundingMetadata) {
  const chunks = groundingMetadata?.groundingChunks || []
  const supports =
    groundingMetadata?.groundingSupports || []
  const supportsByChunk = new Map()
  const evidenceLines = []
  supports.forEach((support, i) => {
    const text = support.segment?.text?.trim()
    const indices = support.groundingChunkIndices || []
    if (!text || indices.length === 0) return
    for (const index of indices) {
      if (!supportsByChunk.has(index)) {
        supportsByChunk.set(index, [])
      }
      supportsByChunk.get(index).push(text)
    }
    evidenceLines.push(
      `[S${i}] "${text}" -> sources: ${indices
        .map((c) => `C${c}`)
        .join(', ')}`
    )
  })
  const chunkLines = chunks.map(
    (chunk, i) =>
      `[C${i}] ${chunk.web?.title || '(untitled)'}`
  )
  return {
    chunks,
    supportsByChunk,
    evidenceLines,
    chunkLines,
  }
}

// Search grounding returns opaque vertexaisearch.cloud.google.com
// redirect links, not the program's real page. Follow the chain through
// the pinned, private-address-guarded request so dedup and verification
// see the true destination.
async function resolveFinalUrl(url, { request } = {}) {
  let target = String(url)
  for (let hop = 0; hop <= MAX_REDIRECT_HOPS; hop++) {
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(),
      RESOLVE_TIMEOUT_MS
    )
    let response
    try {
      response = await fetchPublicUrlOnce(target, {
        signal: controller.signal,
        headers: {
          'User-Agent':
            'Mozilla/5.0 (compatible; SciTeensOpportunityDiscovery/1.0; +https://sciteens.org)',
        },
        ...(request ? { request } : {}),
      })
    } catch (err) {
      clearTimeout(timer)
      return {
        ok: false,
        error: String(
          err && err.message ? err.message : err
        ),
      }
    }
    clearTimeout(timer)
    try {
      await response.body?.cancel?.()
    } catch {
      // body already consumed or absent
    }
    if (!REDIRECT_STATUSES.has(response.status)) {
      return {
        ok:
          response.status >= 200 &&
          response.status < 300 &&
          new URL(target).protocol === 'https:',
        url: target,
        status: response.status,
      }
    }
    const location = response.headers.get('location')
    if (!location) {
      return {
        ok: false,
        error: 'redirect without location',
      }
    }
    try {
      target = new URL(location, target).toString()
    } catch {
      return {
        ok: false,
        error: 'The redirect URL is invalid.',
      }
    }
  }
  return { ok: false, error: 'too many redirects' }
}

module.exports = {
  CandidatesSchema,
  REJECT_REASONS,
  VerdictSchema,
  buildEvidence,
  chunkSupportsName,
  hostOf,
  isRetryableReject,
  normalizeUrl,
  resolveFinalUrl,
  significantWords,
  slugify,
  uniqueSlug,
}
