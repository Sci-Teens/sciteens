import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { describe, expect, it } from 'vitest'

const scriptPath = fileURLToPath(
  new URL('./scrapeOpportunities.js', import.meta.url)
)
const script = readFileSync(scriptPath, 'utf8')
const scriptRequire = createRequire(scriptPath)

function source(slug, extra = {}) {
  return {
    slug,
    url: `https://example.com/${slug}`,
    ...extra,
  }
}

function extraction(url) {
  return {
    name: 'Test Program',
    about:
      'Students study computer science in this test program.',
    location: 'Virtual',
    startDate: null,
    endDate: null,
    applicationDeadline: null,
    applicationOpensDate: null,
    deadlineStatus: 'unclear',
    gradeRangeLow: 9,
    gradeRangeHigh: 12,
    ageRangeLow: null,
    ageRangeHigh: null,
    fields: ['Computer Science'],
    eligibilityNotes: null,
    cost: 'Free',
    financialAid: 'Program is Free',
    stipend: 'Not specified',
    programType: 'Summer Program',
    durationText: '6 weeks',
    residential: 'Not applicable',
    contactEmail: null,
    applicationUrl: url,
    reasoning: 'The page does not state a deadline.',
    consultedPages: [{ url, role: 'main' }],
  }
}

async function runCli(sources, options = {}) {
  const logs = []
  const events = []
  const fetched = []
  const modelSources = []
  const records = new Map()
  const opportunities = new Map()
  const contexts = []
  const cliProcess = {
    argv: ['node', scriptPath, '--project', 'test-project'],
    env: { GCLOUD_ACCESS_TOKEN: 'test-token' },
    exitCode: undefined,
    exit(code) {
      this.exitCode = code
    },
  }
  const save = (ref, data) => {
    const target =
      ref.collection === 'opportunities'
        ? opportunities
        : records
    target.set(ref.slug, data)
  }
  const db = {
    collection(name) {
      return {
        where: () => ({
          get: async () => ({
            docs: sources.map((entry) => ({
              id: entry.slug,
              data: () => entry,
            })),
          }),
        }),
        doc(slug) {
          return {
            collection: name,
            slug,
            async get() {
              if (
                name === 'opportunities' &&
                options.sourceReadFailure === slug
              ) {
                throw new Error(
                  'The opportunity read failed.'
                )
              }
              return {
                exists: true,
                data: () =>
                  name === 'opportunities'
                    ? {
                        imageUrl:
                          'https://example.com/cover.webp',
                      }
                    : sources.find(
                        (entry) => entry.slug === slug
                      ),
              }
            },
            async update(data) {
              save(this, data)
            },
          }
        },
      }
    },
    batch() {
      const changes = []
      return {
        set: (ref, data) => changes.push([ref, data]),
        update: (ref, data) => changes.push([ref, data]),
        async commit() {
          for (const [ref, data] of changes) save(ref, data)
        },
      }
    },
  }
  const firestore = Object.assign(() => db, {
    FieldValue: {
      serverTimestamp: () => 'timestamp',
      increment: (value) => value,
    },
  })
  const browser = {
    async newContext() {
      let handler
      let currentUrl
      const frame = {}
      const context = {
        closed: false,
        async route(_pattern, callback) {
          if (options.setupFailure === 'route') {
            throw Object.assign(
              new Error('Route setup failed.'),
              {
                code: 'ERR_CONTEXT_SETUP',
              }
            )
          }
          handler = callback
        },
        async routeWebSocket() {},
        async newPage() {
          if (options.setupFailure === 'newPage') {
            throw Object.assign(
              new Error('Page setup failed.'),
              {
                code: 'ERR_CONTEXT_SETUP',
              }
            )
          }
          return page
        },
        async close() {
          context.closed = true
          events.push('context closed')
        },
      }
      async function navigate(url, isNavigationRequest) {
        let aborted = false
        await handler({
          request: () => ({
            url: () => url,
            method: () => 'GET',
            headers: () => ({
              authorization: 'Bearer header-secret',
            }),
            isNavigationRequest: () => isNavigationRequest,
            frame: () => frame,
          }),
          abort: async () => {
            aborted = true
          },
          fulfill: async () => {},
        })
        if (aborted && isNavigationRequest) {
          throw new Error(
            'page.goto: net::ERR_BLOCKED_BY_CLIENT'
          )
        }
      }
      const page = {
        mainFrame: () => frame,
        url: () => currentUrl,
        async goto(url) {
          currentUrl = url
          await navigate(url, true)
          if (options.failedSubresource) {
            await navigate(
              'https://example.com/asset.js',
              false
            )
          }
        },
        waitForTimeout: async () => {},
        content: async () =>
          '<title>Test Program</title><p>Program details.</p>',
      }
      contexts.push(context)
      return context
    },
    async close() {
      events.push('browser closed')
    },
  }
  const mocks = {
    'node:fs': { existsSync: () => false },
    playwright: {
      chromium: { launch: async () => browser },
    },
    'firebase-admin': {
      initializeApp() {},
      firestore,
      storage: () => ({ bucket: () => ({}) }),
    },
    '@google/genai': {
      FunctionCallingConfigMode: {
        ANY: 'ANY',
        AUTO: 'AUTO',
      },
      GoogleGenAI: class {
        models = {
          async generateContent({ contents }) {
            const seed =
              contents[0].parts[0].text.match(
                /Seed URL: (\S+)/
              )[1]
            modelSources.push(seed)
            return {
              functionCalls: [
                {
                  name: 'submit_extraction',
                  args: extraction(
                    options.applicationUrl || seed
                  ),
                },
              ],
            }
          },
        }
      },
    },
    './lib/programImages': {
      defaultBucketName: () => 'test-bucket',
    },
    './lib/pageContent': {
      extractPageMarkdown: () => 'Program details.',
    },
    './lib/publicUrl': {
      publicHttpUrlOrNull: async (url) => url,
      isNonNetworkScheme: () => false,
      async fetchPublicUrlOnce(url) {
        fetched.push(url)
        if (
          options.failedUrls?.includes(url) ||
          (options.failedSubresource &&
            url.endsWith('/asset.js'))
        ) {
          throw Object.assign(
            new Error(
              'Invalid IP address: undefined; https://user:url-secret@example.com/?token=query-secret; Authorization: Bearer header-secret'
            ),
            { code: 'ERR_INVALID_IP_ADDRESS' }
          )
        }
        return {
          ok: true,
          url,
          body: null,
          status: 200,
          headers: new Map(),
        }
      },
    },
  }
  mocks['./lib/publicUrl'].fetchPublicUrl =
    mocks['./lib/publicUrl'].fetchPublicUrlOnce
  const pageModule = { exports: {} }
  const pagePath = fileURLToPath(
    new URL('./lib/opportunityPage.js', import.meta.url)
  )
  runInNewContext(readFileSync(pagePath, 'utf8'), {
    module: pageModule,
    require: (name) =>
      mocks[`./lib/${name.slice(2)}`] ||
      createRequire(pagePath)(name),
    URL,
    Buffer,
    AbortController,
    setTimeout,
    clearTimeout,
  })
  mocks['./lib/opportunityPage'] = pageModule.exports
  await runInNewContext(
    script,
    {
      require: (name) => mocks[name] || scriptRequire(name),
      __dirname: fileURLToPath(
        new URL('.', import.meta.url)
      ),
      process: cliProcess,
      console: {
        log: (...args) => {
          logs.push(args.join(' '))
          if (args[0]?.startsWith('\nDone:'))
            events.push('summary')
        },
        error: (...args) => logs.push(args.join(' ')),
      },
      URL,
      Buffer,
      AbortController,
      setTimeout,
      clearTimeout,
    },
    { filename: scriptPath }
  )
  return {
    status: cliProcess.exitCode || 0,
    output: logs.join('\n'),
    events,
    fetched,
    modelSources,
    records,
    opportunities,
    contexts,
  }
}

describe('scraper CLI failure handling', () => {
  it('finishes a mixed batch, saves partial results, and fails after browser cleanup', async () => {
    const sources = [
      'failed',
      'second',
      'third',
      'fourth',
    ].map((slug) => source(slug))
    const result = await runCli(sources, {
      failedUrls: [sources[0].url],
    })

    expect(result.status).toBe(1)
    expect([...result.records.keys()].sort()).toEqual(
      sources.map((entry) => entry.slug).sort()
    )
    expect([...result.opportunities.keys()].sort()).toEqual(
      ['fourth', 'second', 'third']
    )
    expect(result.records.get('failed')).toMatchObject({
      lastStatus: 'fetch_failed',
      lastError: expect.stringContaining(
        'ERR_INVALID_IP_ADDRESS'
      ),
      consecutiveFailures: 1,
    })
    expect(result.output).toContain('Page fetch failed')
    expect(result.output).not.toMatch(
      /provenance|applicationUrl|url-secret|query-secret|header-secret|Authorization/
    )
    expect(result.modelSources).not.toContain(
      sources[0].url
    )
    expect(result.events.slice(-2)).toEqual([
      'browser closed',
      'summary',
    ])
    expect(
      result.contexts.every((context) => context.closed)
    ).toBe(true)
  })

  it('exits zero for successful sources despite a failed subresource', async () => {
    const result = await runCli(
      [source('first'), source('second')],
      {
        failedSubresource: true,
      }
    )

    expect(result.status).toBe(0)
    expect([...result.opportunities.keys()].sort()).toEqual(
      ['first', 'second']
    )
    expect(
      [...result.records.values()].map(
        (record) => record.lastStatus
      )
    ).toEqual(['ok', 'ok'])
    expect(result.output).not.toContain(
      'ERR_INVALID_IP_ADDRESS'
    )
    expect(result.events.slice(-2)).toEqual([
      'browser closed',
      'summary',
    ])
    expect(
      result.contexts.every((context) => context.closed)
    ).toBe(true)
  })

  it('reports the transport failure when every page from history fails', async () => {
    const entry = source('history', {
      consultedPages: [
        {
          url: 'https://example.com/apply',
          role: 'deadline',
        },
      ],
    })
    const result = await runCli([entry], {
      failedUrls: [entry.url, entry.consultedPages[0].url],
    })

    expect(result.status).toBe(1)
    expect(new Set(result.fetched)).toEqual(
      new Set([entry.url, entry.consultedPages[0].url])
    )
    expect(
      result.records.get('history').lastError
    ).toContain('ERR_INVALID_IP_ADDRESS')
    expect(result.modelSources).toEqual([])
    expect(
      result.contexts.every((context) => context.closed)
    ).toBe(true)
  })

  it('uses a successful history page when the seed fetch fails', async () => {
    const applicationUrl = 'https://example.com/apply'
    const entry = source('history', {
      consultedPages: [
        { url: applicationUrl, role: 'deadline' },
      ],
    })
    const result = await runCli([entry], {
      failedUrls: [entry.url],
      applicationUrl,
    })

    expect(result.status).toBe(0)
    expect(
      result.opportunities.get('history').applicationUrl
    ).toBe(applicationUrl)
    expect(result.records.get('history').lastStatus).toBe(
      'ok'
    )
  })

  it('continues the batch after a source throws outside extraction', async () => {
    const result = await runCli(
      ['failed', 'second', 'third', 'fourth'].map((slug) =>
        source(slug)
      ),
      { sourceReadFailure: 'failed' }
    )

    expect(result.status).toBe(1)
    expect(result.records.get('failed').lastStatus).toBe(
      'fetch_failed'
    )
    expect([...result.opportunities.keys()].sort()).toEqual(
      ['fourth', 'second', 'third']
    )
    expect(result.events.slice(-2)).toEqual([
      'browser closed',
      'summary',
    ])
    expect(
      result.contexts.every((context) => context.closed)
    ).toBe(true)
  })

  it.each(['route', 'newPage'])(
    'closes contexts when %s setup fails',
    async (setupFailure) => {
      const result = await runCli([source('failed')], {
        setupFailure,
      })

      expect(result.status).toBe(1)
      expect(
        result.records.get('failed').lastError
      ).toContain('ERR_CONTEXT_SETUP')
      expect(
        result.contexts.every((context) => context.closed)
      ).toBe(true)
      expect(result.events.slice(-2)).toEqual([
        'browser closed',
        'summary',
      ])
    }
  )
})
