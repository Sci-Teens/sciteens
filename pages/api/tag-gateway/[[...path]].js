import { GA_GATEWAY_PATH } from '../../../lib/tagGateway'

export const config = {
  api: { bodyParser: false, responseLimit: '2mb' },
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'private, no-store')
  const measurementId =
    process.env.NEXT_PUBLIC_FB_MEASUREMENT_ID

  if (
    process.env.NEXT_PUBLIC_GA_GATEWAY_ENABLED !== 'true' ||
    !/^G-[A-Z0-9]+$/.test(measurementId || '')
  ) {
    return void res.status(404).end()
  }

  if (!['GET', 'HEAD', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, HEAD, POST')
    return void res.status(405).end()
  }

  const path = req.query.path || []
  if (
    !Array.isArray(path) ||
    path.some((part) => !/^[a-zA-Z0-9_-]+$/.test(part))
  ) {
    return void res.status(400).end()
  }

  const search = req.url.includes('?')
    ? req.url.slice(req.url.indexOf('?'))
    : ''
  const url = `https://${measurementId.toLowerCase()}.fps.goog${GA_GATEWAY_PATH}/${path.join(
    '/'
  )}${search}`
  const headers = {}
  for (const name of ['content-type', 'user-agent']) {
    if (req.headers[name]) headers[name] = req.headers[name]
  }
  const country = req.headers['x-country-code']
  if (
    typeof country === 'string' &&
    /^[A-Z]{2}$/.test(country)
  ) {
    headers['X-Forwarded-Country'] = country
  }

  // Authentication cookies must never leave our origin.
  const cookies = (req.headers.cookie || '')
    .split(';')
    .map((cookie) => cookie.trim())
    .filter((cookie) => /^_ga(?:_[A-Z0-9]+)?=/.test(cookie))
    .join('; ')
  if (cookies) headers.cookie = cookies

  let body
  if (req.method === 'POST') {
    const chunks = []
    let size = 0
    for await (const chunk of req) {
      size += Buffer.byteLength(chunk)
      if (size > 64 * 1024)
        return void res.status(413).end()
      chunks.push(Buffer.from(chunk))
    }
    body = Buffer.concat(chunks)
  }

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      body,
      redirect: 'manual',
      signal: AbortSignal.timeout(5000),
    })
    if (upstream.status >= 300 && upstream.status < 400) {
      return void res.status(502).end()
    }
    const contentType = upstream.headers.get('content-type')
    if (contentType) {
      res.setHeader('Content-Type', contentType)
    }
    return void res
      .status(upstream.status)
      .end(Buffer.from(await upstream.arrayBuffer()))
  } catch {
    return void res.status(502).end()
  }
}
