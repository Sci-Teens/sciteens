import { describe, expect, it, vi } from 'vitest'

import {
  chooseSourceUrl,
  loadKnownSources,
  sourceDocument,
  verifyCandidate,
} from './discoverOpportunitySources.js'
import {
  isRetryableReject,
  normalizeUrl,
} from './lib/opportunityDiscovery.js'

const candidate = {
  name: 'Example Science Academy',
  url: 'https://example.org/news/academy',
  category: 'research',
  evidence:
    'Example Science Academy offers research for high school students.',
  query: 'high school research',
  queryCategory: 'research',
}

function page(finalUrl, bodyMarkdown = candidate.evidence) {
  return {
    ok: true,
    finalUrl,
    title: candidate.name,
    bodyMarkdown,
    links: [],
  }
}

function submit(overrides = {}) {
  return {
    name: 'submit_verdict',
    args: {
      verdict: 'publish',
      rejectReason: 'none',
      reasoning:
        'The page confirms the exact program and high school eligibility.',
      redFlags: [],
      officialUrl: null,
      ...overrides,
    },
  }
}

function model(...turns) {
  const generateContent = vi.fn()
  for (const calls of turns) {
    generateContent.mockResolvedValueOnce({
      functionCalls: calls,
    })
  }
  return { models: { generateContent } }
}

async function verify(genai, fetchPage) {
  return verifyCandidate({}, genai, candidate, {
    fetchPage,
  })
}

describe('verifyCandidate', () => {
  it('loads candidate evidence before the model can submit an immediate verdict', async () => {
    const finalUrl =
      'https://example.org/news/academy-current'
    const fetchPage = vi
      .fn()
      .mockResolvedValue(page(finalUrl))
    const genai = model([submit()])
    genai.models.generateContent.mockImplementationOnce(
      async ({ contents }) => {
        expect(fetchPage).toHaveBeenCalledWith(
          {},
          candidate.url
        )
        const evidence = JSON.parse(
          contents[0].parts[1].text
            .split('\n')
            .slice(1)
            .join('\n')
        )
        expect(evidence.bodyMarkdown).toBe(
          candidate.evidence
        )
        expect(evidence.finalUrl).toBe(finalUrl)
        return { functionCalls: [submit()] }
      }
    )
    const verdict = await verify(genai, fetchPage)
    expect(verdict.verdict).toBe('publish')
    expect(chooseSourceUrl(verdict)).toBe(finalUrl)
  })

  it('does not ask the model to judge an inaccessible candidate', async () => {
    const genai = model([submit()])
    const verdict = await verify(
      genai,
      vi
        .fn()
        .mockResolvedValue({ ok: false, error: 'HTTP 404' })
    )
    expect(isRetryableReject(verdict)).toBe(true)
    expect(chooseSourceUrl(verdict)).toBeNull()
    expect(
      genai.models.generateContent
    ).not.toHaveBeenCalled()
  })

  it('converts a thrown candidate fetch into a retryable rejection', async () => {
    const genai = model([submit()])
    const verdict = await verify(
      genai,
      vi
        .fn()
        .mockRejectedValue(new Error('The browser closed.'))
    )
    expect(isRetryableReject(verdict)).toBe(true)
    expect(
      genai.models.generateContent
    ).not.toHaveBeenCalled()
  })

  it.each([
    'http://example.org/program',
    'data:text/html,program',
    'file:///tmp/program.html',
  ])(
    'does not judge an unsafe final URL: %s',
    async (finalUrl) => {
      const genai = model([submit()])
      const verdict = await verify(
        genai,
        vi.fn().mockResolvedValue(page(finalUrl))
      )
      expect(isRetryableReject(verdict)).toBe(true)
      expect(chooseSourceUrl(verdict)).toBeNull()
      expect(
        genai.models.generateContent
      ).not.toHaveBeenCalled()
    }
  )

  it('rejects an official URL that the model did not fetch', async () => {
    const genai = model([
      submit({
        officialUrl: 'https://example.org/program',
      }),
    ])
    const verdict = await verify(
      genai,
      vi.fn().mockResolvedValue(page(candidate.url))
    )
    expect(isRetryableReject(verdict)).toBe(true)
    expect(chooseSourceUrl(verdict)).toBeNull()
  })

  it('rejects an official URL whose fetch failed', async () => {
    const officialUrl = 'https://example.org/program'
    const genai = model(
      [{ name: 'fetch_page', args: { url: officialUrl } }],
      [submit({ officialUrl })]
    )
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page(candidate.url))
      .mockResolvedValueOnce({
        ok: false,
        error: 'HTTP 403',
      })
    const verdict = await verify(genai, fetchPage)
    expect(isRetryableReject(verdict)).toBe(true)
    expect(chooseSourceUrl(verdict)).toBeNull()
  })

  it.each(['requested', 'final'])(
    'uses successful official-page evidence under its %s URL',
    async (urlKind) => {
      const requestedUrl = 'https://example.org/program'
      const finalUrl = 'https://example.org/program/current'
      const officialUrl =
        urlKind === 'requested' ? requestedUrl : finalUrl
      const genai = model(
        [
          {
            name: 'fetch_page',
            args: { url: requestedUrl },
          },
        ],
        [submit({ officialUrl })]
      )
      const fetchPage = vi
        .fn()
        .mockResolvedValueOnce(page(candidate.url))
        .mockResolvedValueOnce(page(finalUrl))
      const verdict = await verify(genai, fetchPage)
      expect(verdict.verdict).toBe('publish')
      expect(chooseSourceUrl(verdict)).toBe(finalUrl)
    }
  )

  it('does not replace the candidate URL with an unrelated supporting page', async () => {
    const candidateFinalUrl =
      'https://example.org/news/academy-current'
    const genai = model(
      [
        {
          name: 'fetch_page',
          args: { url: 'https://example.org/eligibility' },
        },
      ],
      [submit()]
    )
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page(candidateFinalUrl))
      .mockResolvedValueOnce(
        page('https://example.org/eligibility')
      )
    const verdict = await verify(genai, fetchPage)
    expect(chooseSourceUrl(verdict)).toBe(candidateFinalUrl)
  })

  it('does not treat a fetched query variant as evidence for another program', async () => {
    const genai = model(
      [
        {
          name: 'fetch_page',
          args: { url: 'https://example.org/program?id=1' },
        },
      ],
      [
        submit({
          officialUrl: 'https://example.org/program?id=2',
        }),
      ]
    )
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce(page(candidate.url))
      .mockResolvedValueOnce(
        page('https://example.org/program?id=1')
      )
    const verdict = await verify(genai, fetchPage)
    expect(isRetryableReject(verdict)).toBe(true)
    expect(chooseSourceUrl(verdict)).toBeNull()
  })

  it('does not persist a name mismatch as a permanent rejection', async () => {
    const verdict = await verify(
      model([
        submit({
          verdict: 'reject',
          rejectReason: 'not_this_program',
        }),
      ]),
      vi
        .fn()
        .mockResolvedValue(
          page(
            candidate.url,
            'A different academy uses this page.'
          )
        )
    )
    expect(verdict.rejectReason).toBe('not_this_program')
    expect(isRetryableReject(verdict)).toBe(true)
  })

  it('retains the judged candidate URL for a permanent rejection', async () => {
    const verdict = await verify(
      model([
        submit({
          verdict: 'reject',
          rejectReason: 'not_stem',
          officialUrl: 'https://example.org/unverified',
        }),
      ]),
      vi.fn().mockResolvedValue(page(candidate.url))
    )
    expect(isRetryableReject(verdict)).toBe(false)
    expect(chooseSourceUrl(verdict)).toBe(candidate.url)
  })
})

describe('loadKnownSources', () => {
  it('does not blacklist legacy retryable URL/name pairs but still reserves their IDs', async () => {
    const records = [
      ['mismatch', 'not_this_program'],
      ['inaccessible', 'page_inaccessible'],
      ['empty', 'insufficient_content'],
      ['unsuitable', 'not_stem'],
    ].map(([id, rejectReason]) => ({
      id,
      data: () => ({
        status: 'rejected',
        rejectReason,
        url: `https://discovery-test.example/${id}`,
        label: `Discovery test ${id}`,
      }),
    }))
    const db = {
      collection: () => ({
        get: async () => ({ docs: records }),
      }),
    }
    const known = await loadKnownSources(db)
    for (const id of [
      'mismatch',
      'inaccessible',
      'empty',
    ]) {
      expect(
        known.urls.has(
          normalizeUrl(
            `https://discovery-test.example/${id}`
          )
        )
      ).toBe(false)
      expect(known.labels).not.toContain(
        `Discovery test ${id}`
      )
      expect(known.slugs.has(id)).toBe(true)
    }
    expect(
      known.urls.has(
        normalizeUrl(
          'https://discovery-test.example/unsuitable'
        )
      )
    ).toBe(true)
    expect(known.labels).toContain(
      'Discovery test unsuitable'
    )
  })
})

describe('sourceDocument', () => {
  it('keeps discovery evidence separate from scraper verification evidence', () => {
    const verdict = {
      verdict: 'publish',
      rejectReason: null,
      reasoning: 'The institution confirms the program.',
      redFlags: ['The application cycle is closed.'],
    }
    const document = sourceDocument(
      candidate,
      verdict,
      candidate.url,
      null
    )
    expect(document.status).toBe('active')
    expect(document.discoveryReasoning).toBe(
      verdict.reasoning
    )
    expect(document.discoveryRedFlags).toEqual(
      verdict.redFlags
    )
    expect(document).not.toHaveProperty(
      'verificationReasoning'
    )
    expect(document).not.toHaveProperty(
      'verificationRedFlags'
    )
  })
})
