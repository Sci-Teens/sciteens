import { describe, expect, it, vi } from 'vitest'

import {
  CandidatesSchema,
  VerdictSchema,
  buildEvidence,
  chunkSupportsName,
  isRetryableReject,
  normalizeUrl,
  resolveFinalUrl,
  slugify,
  uniqueSlug,
} from './opportunityDiscovery.js'

describe('normalizeUrl', () => {
  it('ignores scheme, www, trailing slash, known tracking parameters and hash', () => {
    expect(normalizeUrl('https://www.Promys.org/')).toBe(
      'promys.org'
    )
    expect(
      normalizeUrl(
        'http://promys.org/apply/?utm_source=search&fbclid=123#top'
      )
    ).toBe('promys.org/apply')
  })

  it('keeps distinct programs on a query-driven endpoint', () => {
    const first = normalizeUrl(
      'https://example.org/program?id=1'
    )
    const second = normalizeUrl(
      'https://example.org/program?id=2'
    )
    expect(first).not.toBe(second)
    expect(
      uniqueSlug(
        'Academy',
        'https://example.org/program?id=1',
        new Set(['academy'])
      )
    ).not.toBe(
      uniqueSlug(
        'Academy',
        'https://example.org/program?id=2',
        new Set(['academy'])
      )
    )
  })

  it('canonicalizes parameter names without removing functional parameters', () => {
    expect(
      normalizeUrl(
        'https://example.org/program?lang=en&id=2&utm_source=email'
      )
    ).toBe(
      normalizeUrl(
        'https://example.org/program?id=2&lang=en'
      )
    )
    expect(
      normalizeUrl(
        'https://example.org/?utm=keep&ref=course'
      )
    ).toBe('example.org?ref=course&utm=keep')
    expect(
      normalizeUrl('https://example.org/?id=2&id=1')
    ).not.toBe(
      normalizeUrl('https://example.org/?id=1&id=2')
    )
    expect(
      normalizeUrl('https://example.org:8443/program')
    ).not.toBe(normalizeUrl('https://example.org/program'))
  })

  it('returns malformed input unchanged', () => {
    expect(normalizeUrl('not a url')).toBe('not a url')
  })
})

describe('slugify / uniqueSlug', () => {
  it('produces a firestore-safe id', () => {
    expect(
      slugify("Let's Get Real: Science & Careers (2027)")
    ).toBe('let-s-get-real-science-and-careers-2027')
  })

  it('caps length without a dangling hyphen', () => {
    const slug = slugify('a'.repeat(58) + ' program')
    expect(slug.length).toBeLessThanOrEqual(60)
    expect(slug.endsWith('-')).toBe(false)
  })

  it('suffixes a url hash only on collision', () => {
    const taken = new Set(['promys'])
    expect(
      uniqueSlug('PROMYS', 'https://other.org/', new Set())
    ).toBe('promys')
    const collided = uniqueSlug(
      'PROMYS',
      'https://other.org/',
      taken
    )
    expect(collided).toMatch(/^promys-[0-9a-f]{8}$/)
  })
})

describe('chunkSupportsName', () => {
  it('accepts a snippet naming at least half the significant words', () => {
    expect(
      chunkSupportsName(
        [
          'The ASPIRE Summer EV Academy at Utah State lets teens build a car.',
        ],
        'ASPIRE Summer EV Academy'
      )
    ).toBe(true)
  })

  it('rejects a snippet about a different program', () => {
    expect(
      chunkSupportsName(
        [
          'Mayo Clinic launches the Pre-College Healthcare Academy.',
        ],
        'Talcott Mountain Research Institute Summer Program'
      )
    ).toBe(false)
  })

  it('rejects names with no significant words', () => {
    expect(chunkSupportsName(['abc'], 'AI 4 U')).toBe(false)
  })
})

describe('buildEvidence', () => {
  it('maps each supported sentence to its chunks', () => {
    const { supportsByChunk, evidenceLines, chunkLines } =
      buildEvidence({
        groundingChunks: [
          { web: { title: 'usu.edu', uri: 'https://r/0' } },
          {
            web: { title: 'mayo.edu', uri: 'https://r/1' },
          },
        ],
        groundingSupports: [
          {
            segment: { text: 'ASPIRE builds EVs.' },
            groundingChunkIndices: [0],
          },
          {
            segment: { text: 'Mayo runs an academy.' },
            groundingChunkIndices: [1, 0],
          },
          {
            segment: { text: 'orphan' },
            groundingChunkIndices: [],
          },
        ],
      })
    expect(supportsByChunk.get(0)).toEqual([
      'ASPIRE builds EVs.',
      'Mayo runs an academy.',
    ])
    expect(supportsByChunk.get(1)).toEqual([
      'Mayo runs an academy.',
    ])
    expect(evidenceLines).toHaveLength(2)
    expect(evidenceLines[1]).toContain('sources: C1, C0')
    expect(chunkLines).toEqual([
      '[C0] usu.edu',
      '[C1] mayo.edu',
    ])
  })

  it('tolerates a response with no grounding at all', () => {
    const result = buildEvidence(undefined)
    expect(result.chunks).toEqual([])
    expect(result.evidenceLines).toEqual([])
  })
})

describe('schemas', () => {
  it('rejects a verdict outside the enum', () => {
    expect(
      VerdictSchema.safeParse({
        verdict: 'maybe',
        rejectReason: null,
        reasoning: 'x',
        redFlags: [],
        officialUrl: null,
      }).success
    ).toBe(false)
  })

  it('accepts a null officialUrl and rejects a non-url one', () => {
    const base = {
      verdict: 'publish',
      rejectReason: null,
      reasoning: 'ok',
      redFlags: [],
    }
    expect(
      VerdictSchema.safeParse({
        ...base,
        officialUrl: null,
      }).success
    ).toBe(true)
    expect(
      VerdictSchema.safeParse({
        ...base,
        officialUrl: 'promys',
      }).success
    ).toBe(false)
  })

  it('requires a rejectReason exactly when rejecting', () => {
    const base = {
      reasoning: 'x',
      redFlags: [],
      officialUrl: null,
    }
    expect(
      VerdictSchema.safeParse({
        ...base,
        verdict: 'reject',
        rejectReason: null,
      }).success
    ).toBe(false)
    expect(
      VerdictSchema.safeParse({
        ...base,
        verdict: 'publish',
        rejectReason: 'not_stem',
      }).success
    ).toBe(false)
    expect(
      VerdictSchema.safeParse({
        ...base,
        verdict: 'reject',
        rejectReason: 'not_stem',
      }).success
    ).toBe(true)
  })

  it('treats fetch problems and name mismatches as retryable', () => {
    const reject = (rejectReason) => ({
      verdict: 'reject',
      rejectReason,
    })
    expect(
      isRetryableReject(reject('page_inaccessible'))
    ).toBe(true)
    expect(
      isRetryableReject(reject('insufficient_content'))
    ).toBe(true)
    expect(
      isRetryableReject(reject('not_legitimate'))
    ).toBe(false)
    expect(
      isRetryableReject(reject('not_this_program'))
    ).toBe(true)
    expect(
      isRetryableReject({
        verdict: 'publish',
        rejectReason: null,
      })
    ).toBe(false)
  })

  it('rejects a candidate with a negative chunk index', () => {
    expect(
      CandidatesSchema.safeParse({
        candidates: [
          {
            name: 'PROMYS',
            sourceChunkIndex: -1,
            evidence: 'PROMYS is a six-week program.',
            category: 'research',
          },
        ],
      }).success
    ).toBe(false)
  })
})

describe('resolveFinalUrl', () => {
  function stubHops(hops) {
    let call = 0
    const request = vi.fn(async () => {
      const hop = hops[call++]
      if (!hop) throw new Error('unexpected request')
      return {
        status: hop.status,
        headers: {
          get: (name) =>
            name.toLowerCase() === 'location'
              ? hop.location || null
              : null,
        },
        body: null,
      }
    })
    return request
  }

  it('follows redirects to the final public url', async () => {
    const request = stubHops([
      {
        status: 302,
        location: 'https://example.org/program',
      },
      { status: 200 },
    ])
    await expect(
      resolveFinalUrl('https://example.com/redirect', {
        request,
      })
    ).resolves.toEqual({
      ok: true,
      url: 'https://example.org/program',
      status: 200,
    })
  })

  it('reports a dead destination as not ok', async () => {
    const request = stubHops([{ status: 404 }])
    const result = await resolveFinalUrl(
      'https://example.com/gone',
      { request }
    )
    expect(result.ok).toBe(false)
    expect(result.status).toBe(404)
  })

  it('refuses a chain that lands on a private address', async () => {
    const request = stubHops([
      { status: 302, location: 'http://169.254.169.254/' },
    ])
    const result = await resolveFinalUrl(
      'https://example.com/redirect',
      { request }
    )
    expect(result.ok).toBe(false)
  })

  it('does not accept a public HTTP destination', async () => {
    const request = stubHops([
      {
        status: 302,
        location: 'http://example.org/program',
      },
      { status: 200 },
    ])
    const result = await resolveFinalUrl(
      'https://example.com/redirect',
      { request }
    )
    expect(result.ok).toBe(false)
  })

  it('accepts an HTTP source only after an HTTPS upgrade', async () => {
    const request = stubHops([
      {
        status: 301,
        location: 'https://example.org/program',
      },
      { status: 200 },
    ])
    await expect(
      resolveFinalUrl('http://example.org/program', {
        request,
      })
    ).resolves.toMatchObject({
      ok: true,
      url: 'https://example.org/program',
    })
  })

  it('gives up after the hop budget', async () => {
    const request = stubHops(
      Array.from({ length: 10 }, () => ({
        status: 302,
        location: 'https://example.com/loop',
      }))
    )
    const result = await resolveFinalUrl(
      'https://example.com/loop',
      { request }
    )
    expect(result).toEqual({
      ok: false,
      error: 'too many redirects',
    })
  })
})
