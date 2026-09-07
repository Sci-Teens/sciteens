import dns from 'node:dns/promises'
import { once } from 'node:events'
import { readFileSync } from 'node:fs'
import http from 'node:http'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { chromium } from 'playwright'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

const modulePath = fileURLToPath(
  new URL('./opportunityPage.js', import.meta.url)
)
const moduleSource = readFileSync(modulePath, 'utf8')
const moduleRequire = createRequire(modulePath)
const publicUrl = moduleRequire('./publicUrl')
const { BROWSER_LAUNCH_OPTIONS } = moduleRequire(
  './opportunityPage'
)

// Only the pinned transport uses synthetic public responses. Chromium still
// handles real documents, scripts, redirects, origins, and local connections.
function fixturePage(responses) {
  const requested = []
  const request = async (url) => {
    requested.push(url)
    const fixture = responses[url]
    if (!fixture)
      throw new Error('The synthetic response is missing.')
    const response = new Response(fixture.body || null, {
      status: fixture.status || 200,
      headers: {
        'content-type': 'text/html',
        ...fixture.headers,
      },
    })
    Object.defineProperty(response, 'url', { value: url })
    return response
  }
  const module = { exports: {} }
  runInNewContext(moduleSource, {
    module,
    require: (name) =>
      name === './publicUrl'
        ? {
            ...publicUrl,
            fetchPublicUrl: (url, options) =>
              publicUrl.fetchPublicUrl(url, {
                ...options,
                request,
              }),
            fetchPublicUrlOnce: (url, options) =>
              publicUrl.fetchPublicUrlOnce(url, {
                ...options,
                request,
              }),
          }
        : moduleRequire(name),
    URL,
    Buffer,
    AbortController,
    setTimeout,
    clearTimeout,
  })
  return { fetchPage: module.exports.fetchPage, requested }
}

let browser
let markerServer
let markerUrl
let markerRequests

beforeAll(async () => {
  markerServer = http.createServer((_request, response) => {
    markerRequests++
    response.end('<h1>PRIVATE_MARKER</h1>')
  })
  markerServer.on('upgrade', (_request, socket) => {
    markerRequests++
    socket.destroy()
  })
  markerServer.listen(0, '127.0.0.1')
  await once(markerServer, 'listening')
  markerUrl = `http://127.0.0.1:${
    markerServer.address().port
  }/marker`
  browser = await chromium.launch({
    ...BROWSER_LAUNCH_OPTIONS,
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH ||
      chromium.executablePath(),
  })
}, 20_000)

beforeEach(() => {
  markerRequests = 0
  vi.spyOn(dns, 'lookup').mockResolvedValue([
    { address: '8.8.8.8', family: 4 },
  ])
})

afterEach(() => {
  vi.restoreAllMocks()
})

afterAll(async () => {
  if (browser) await browser.close()
  if (markerServer) {
    markerServer.closeAllConnections()
    await new Promise((resolve) =>
      markerServer.close(resolve)
    )
  }
})

describe('secure opportunity browser fetch', () => {
  it('rejects an initial redirect to a private endpoint before the browser receives content', async () => {
    const { fetchPage, requested } = fixturePage({
      'https://example.org/program': {
        status: 302,
        headers: { location: markerUrl },
      },
    })
    const result = await fetchPage(
      browser,
      'https://example.org/program'
    )
    expect(result.ok).toBe(false)
    expect(JSON.stringify(result)).not.toContain(
      'PRIVATE_MARKER'
    )
    expect(markerRequests).toBe(0)
    expect(requested).toEqual([
      'https://example.org/program',
    ])
  })

  it('blocks the script navigation redirect that bypasses Playwright routing', async () => {
    const { fetchPage, requested } = fixturePage({
      'https://example.org/program': {
        body: '<h1>Public program</h1><script>location.assign("/bounce")</script>',
      },
      'https://example.org/bounce': {
        status: 302,
        headers: { location: markerUrl },
      },
    })
    const result = await fetchPage(
      browser,
      'https://example.org/program'
    )
    expect(result.ok).toBe(false)
    expect(result.error).toContain('UNSUPPORTED_REDIRECT')
    expect(JSON.stringify(result)).not.toContain(
      'PRIVATE_MARKER'
    )
    expect(requested).toContain(
      'https://example.org/bounce'
    )
    expect(markerRequests).toBe(0)
  })

  it('follows initial public redirects at the final origin and resolves relative links there', async () => {
    const { fetchPage } = fixturePage({
      'https://example.org/program': {
        status: 301,
        headers: { location: '/next' },
      },
      'https://example.org/next': {
        status: 302,
        headers: {
          location:
            'https://program.example.org/catalog/program/',
        },
      },
      'https://program.example.org/catalog/program/': {
        body: `<title>Public program</title>
          <h1 id="origin"></h1><p id="details"></p>
          <a href="apply">Apply for the program</a>
          <script>
            document.querySelector('#origin').textContent = location.origin;
            fetch('details.json').then(response => response.text()).then(text => {
              document.querySelector('#details').textContent = text;
            });
          </script>`,
      },
      'https://program.example.org/catalog/program/details.json':
        {
          body: 'Public application details from the final origin.',
          headers: { 'content-type': 'text/plain' },
        },
    })
    const result = await fetchPage(
      browser,
      'https://example.org/program'
    )
    expect(result.ok).toBe(true)
    expect(result.finalUrl).toBe(
      'https://program.example.org/catalog/program/'
    )
    expect(result.bodyMarkdown).toContain(
      'https://program.example.org'
    )
    expect(result.bodyMarkdown).toContain(
      'Public application details from the final origin.'
    )
    expect(result.links).toContainEqual({
      url: 'https://program.example.org/catalog/program/apply',
      text: 'Apply for the program',
    })
  })

  it('reports a public runtime redirect as a failure instead of a successful interrupted navigation', async () => {
    const { fetchPage, requested } = fixturePage({
      'https://example.org/program': {
        body: '<h1>Public program</h1><script>location.assign("/bounce")</script>',
      },
      'https://example.org/bounce': {
        status: 302,
        headers: {
          location: 'https://program.example.org/final',
        },
      },
    })
    const result = await fetchPage(
      browser,
      'https://example.org/program'
    )
    expect(result.ok).toBe(false)
    expect(result.error).toContain('UNSUPPORTED_REDIRECT')
    expect(requested).not.toContain(
      'https://program.example.org/final'
    )
  })

  it('blocks private redirect content from a script fetch without discarding the public document', async () => {
    const { fetchPage, requested } = fixturePage({
      'https://example.org/program': {
        body: `<h1>Public program</h1><p id="result">Public details</p>
          <script>
            fetch('/data').then(response => response.text()).then(text => {
              document.querySelector('#result').textContent = text;
            }).catch(() => {});
          </script>`,
      },
      'https://example.org/data': {
        status: 302,
        headers: { location: markerUrl },
      },
    })
    const result = await fetchPage(
      browser,
      'https://example.org/program'
    )
    expect(result.ok).toBe(true)
    expect(result.bodyMarkdown).toContain('Public details')
    expect(result.bodyMarkdown).not.toContain(
      'PRIVATE_MARKER'
    )
    expect(requested).toContain('https://example.org/data')
    expect(markerRequests).toBe(0)
  })

  it('blocks service workers and WebSocket connections outside request routing', async () => {
    const { fetchPage, requested } = fixturePage({
      'https://example.org/program': {
        body: `<h1>Public program</h1><p id="worker"></p><p id="socket"></p>
          <script>
            navigator.serviceWorker.register('/worker.js').then(registration => {
              document.querySelector('#worker').textContent = registration
                ? 'Service worker registered' : 'Service worker blocked';
            }, () => {
              document.querySelector('#worker').textContent = 'Service worker blocked';
            });
            const socket = new WebSocket(${JSON.stringify(
              markerUrl.replace('http:', 'ws:')
            )});
            socket.onclose = socket.onerror = () => {
              document.querySelector('#socket').textContent = 'WebSocket blocked';
            };
          </script>`,
      },
      'https://example.org/worker.js': {
        body: `fetch(${JSON.stringify(markerUrl)})`,
        headers: {
          'content-type': 'application/javascript',
        },
      },
    })
    const result = await fetchPage(
      browser,
      'https://example.org/program'
    )
    expect(result.ok).toBe(true)
    expect(result.bodyMarkdown).toContain(
      'Service worker blocked'
    )
    expect(result.bodyMarkdown).toContain(
      'WebSocket blocked'
    )
    expect(requested).not.toContain(
      'https://example.org/worker.js'
    )
    expect(markerRequests).toBe(0)
  })

  it('returns a sanitized failure for malformed redirect locations', async () => {
    const { fetchPage } = fixturePage({
      'https://example.org/program': {
        status: 302,
        headers: {
          location: 'https://[invalid?token=private-secret',
        },
      },
    })
    const result = await fetchPage(
      browser,
      'https://example.org/program'
    )
    expect(result.ok).toBe(false)
    expect(result.error).not.toContain('private-secret')
  })

  it('does not extract an HTTP error document as program evidence', async () => {
    const { fetchPage } = fixturePage({
      'https://example.org/program': {
        status: 404,
        body: '<h1>Not a program</h1>',
      },
    })
    const result = await fetchPage(
      browser,
      'https://example.org/program'
    )
    expect(result.ok).toBe(false)
    expect(result.error).toContain('HTTP_404')
    expect(result.bodyMarkdown).toBeUndefined()
  })
})
