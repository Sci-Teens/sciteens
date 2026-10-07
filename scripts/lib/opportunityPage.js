'use strict'

const cheerio = require('cheerio')
const { extractPageMarkdown } = require('./pageContent')
const {
  createRequestRunner,
  retryableError,
} = require('./requestRetry')
const {
  fetchPublicUrl,
  fetchPublicUrlOnce,
  isNonNetworkScheme,
  publicHttpUrlOrNull,
  readResponseBuffer,
} = require('./publicUrl')

const MAX_PAGE_RESOURCE_BYTES = 15 * 1024 * 1024
const PAGE_RESOURCE_TIMEOUT_MS = 12_000
const BROWSER_LAUNCH_OPTIONS = {
  headless: true,
  args: [
    '--disable-quic',
    '--force-webrtc-ip-handling-policy=disable_non_proxied_udp',
  ],
}

function extractPageContent(html, baseUrl) {
  const $ = cheerio.load(html)
  const title = $('title').first().text().trim()
  const ogImage =
    $('meta[property="og:image"]').attr('content') || ''
  const bodyMarkdown = extractPageMarkdown(html, baseUrl)
  const links = []
  const seen = new Set()
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href')
    const text = $(el).text().replace(/\s+/g, ' ').trim()
    if (!href || !text) return
    let abs
    try {
      abs = new URL(href, baseUrl).toString()
    } catch {
      return
    }
    if (seen.has(abs)) return
    seen.add(abs)
    links.push({ url: abs, text: text.slice(0, 80) })
  })
  return {
    title,
    ogImage,
    bodyMarkdown,
    links: links.slice(0, 60),
  }
}

function pageFetchFailure(error) {
  const code = error?.code || error?.cause?.code
  const reason =
    typeof code === 'string' &&
    /^[A-Z][A-Z0-9_]{1,63}$/.test(code)
      ? code
      : error?.name === 'TimeoutError' ||
        error?.name === 'AbortError'
      ? error.name
      : 'transport error'
  return `Page fetch failed (${reason}).`
}

function responseError(status, retryAfter) {
  const error = new Error(
    'The page response is not supported.'
  )
  error.code =
    status >= 300 && status < 400
      ? 'UNSUPPORTED_REDIRECT'
      : `HTTP_${status}`
  error.status = status
  error.retryAfter = retryAfter
  return error
}

async function browserResponse(response) {
  // Chromium can follow a fulfilled redirect without another route callback.
  // Only the initial document can redirect, before it enters the browser.
  if (response.status >= 300 && response.status < 400) {
    await response.body?.cancel()
    throw responseError(response.status)
  }
  const body = response.body
    ? await readResponseBuffer(
        response,
        MAX_PAGE_RESOURCE_BYTES
      )
    : Buffer.alloc(0)
  const headers = Object.fromEntries(
    response.headers.entries()
  )
  delete headers['content-length']
  delete headers['transfer-encoding']
  return { status: response.status, headers, body }
}

async function fetchPageOnce(browser, url) {
  const safeUrl = await publicHttpUrlOrNull(url)
  if (!safeUrl) {
    return {
      ok: false,
      error: 'Refused to fetch a non-public URL.',
    }
  }
  const userAgent = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${browser.version()} Safari/537.36`
  let context
  let navigationFailure
  const controllers = new Set()
  try {
    const controller = new AbortController()
    const timer = setTimeout(
      () => controller.abort(),
      PAGE_RESOURCE_TIMEOUT_MS
    )
    let initialResponse
    let finalUrl
    try {
      // Follow each initial redirect through the pinned transport. Navigate to
      // the final URL, not the original origin with the final document's body.
      const response = await fetchPublicUrl(safeUrl, {
        headers: {
          'user-agent': userAgent,
          accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'accept-language': 'en-US,en;q=0.9',
          'accept-encoding': 'identity',
        },
        signal: controller.signal,
      })
      if (!response.ok) {
        await response.body?.cancel()
        throw responseError(
          response.status,
          response.headers.get('retry-after')
        )
      }
      finalUrl = await publicHttpUrlOrNull(response.url)
      if (!finalUrl) {
        await response.body?.cancel()
        throw new Error(
          'Refused to fetch a non-public URL.'
        )
      }
      initialResponse = await browserResponse(response)
    } finally {
      controller.abort()
      clearTimeout(timer)
    }

    // Offline mode blocks requests that do not pass through route fulfillment.
    // Service workers and WebSockets have separate browser network paths.
    context = await browser.newContext({
      userAgent,
      locale: 'en-US',
      offline: true,
      serviceWorkers: 'block',
      acceptDownloads: false,
      // WebRTC TCP must use a proxy too. No endpoint can listen on port zero.
      proxy: {
        server: 'http://127.0.0.1:0',
        bypass: '<-loopback>',
      },
    })
    await context.routeWebSocket('**/*', (socket) =>
      socket.close()
    )
    const page = await context.newPage()
    await context.route('**/*', async (route) => {
      const request = route.request()
      const requestUrl = request.url()
      const isMainNavigation =
        request.isNavigationRequest() &&
        request.frame() === page.mainFrame()
      let parsed
      try {
        parsed = new URL(requestUrl)
      } catch {
        if (isMainNavigation) {
          navigationFailure =
            'Refused to fetch a non-public URL.'
        }
        return route.abort('blockedbyclient')
      }
      if (isNonNetworkScheme(parsed.protocol)) {
        return route.continue()
      }
      if (request.method() !== 'GET') {
        if (isMainNavigation) {
          navigationFailure =
            'Refused to fetch a non-GET request.'
        }
        return route.abort('blockedbyclient')
      }
      if (
        isMainNavigation &&
        requestUrl === finalUrl &&
        initialResponse
      ) {
        const response = initialResponse
        initialResponse = null
        return route.fulfill(response)
      }
      const resourceController = new AbortController()
      controllers.add(resourceController)
      const resourceTimer = setTimeout(
        () => resourceController.abort(),
        PAGE_RESOURCE_TIMEOUT_MS
      )
      try {
        const headers = {
          ...request.headers(),
          'accept-encoding': 'identity',
        }
        delete headers.host
        delete headers['content-length']
        const response = await fetchPublicUrlOnce(
          requestUrl,
          {
            headers,
            signal: resourceController.signal,
          }
        )
        if (isMainNavigation && !response.ok) {
          await response.body?.cancel()
          throw responseError(response.status)
        }
        return await route.fulfill(
          await browserResponse(response)
        )
      } catch (error) {
        if (isMainNavigation) {
          navigationFailure = pageFetchFailure(error)
        }
        await route.abort('blockedbyclient')
      } finally {
        resourceController.abort()
        clearTimeout(resourceTimer)
        controllers.delete(resourceController)
      }
    })
    await page.goto(finalUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 20000,
    })
    await page.waitForTimeout(1500)
    if (navigationFailure) {
      return { ok: false, error: navigationFailure }
    }
    const extractedUrl = await publicHttpUrlOrNull(
      page.url()
    )
    if (!extractedUrl) {
      return {
        ok: false,
        error: 'Refused to extract a non-public URL.',
      }
    }
    const html = await page.content()
    return {
      ok: true,
      finalUrl: extractedUrl,
      ...extractPageContent(html, extractedUrl),
    }
  } catch (error) {
    return {
      ok: false,
      error: navigationFailure || pageFetchFailure(error),
      retryStatus: error.status,
      retryCode: error.code || error.cause?.code,
      retryName: error.name,
      retryAfter: error.retryAfter,
    }
  } finally {
    for (const controller of controllers) controller.abort()
    if (context) await context.close()
  }
}

const pageRunners = new WeakMap()

async function fetchPage(browser, url) {
  const safeUrl = await publicHttpUrlOrNull(url)
  if (!safeUrl)
    return {
      ok: false,
      error: 'Refused to fetch a non-public URL.',
    }
  let hosts = pageRunners.get(browser)
  if (!hosts) {
    hosts = new Map()
    pageRunners.set(browser, hosts)
  }
  const host = new URL(safeUrl).hostname
  if (!hosts.has(host)) {
    hosts.set(
      host,
      createRequestRunner({
        label: `Website ${host}`,
        maxAttempts: 3,
      })
    )
  }
  try {
    return await hosts.get(host)(async () => {
      const result = await fetchPageOnce(browser, safeUrl)
      if (!result.ok) {
        const error = Object.assign(
          new Error(result.error),
          {
            status: result.retryStatus,
            code: result.retryCode,
            name: result.retryName,
            retryAfter: result.retryAfter,
            pageResult: result,
          }
        )
        if (retryableError(error)) throw error
      }
      return result
    })
  } catch (error) {
    if (!error.pageResult) throw error
    return {
      ...error.pageResult,
      retryExhausted: error.retryExhausted,
    }
  }
}

module.exports = { BROWSER_LAUNCH_OPTIONS, fetchPage }
