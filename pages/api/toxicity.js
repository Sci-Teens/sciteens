import rateLimit from '../../lib/rateLimit'

// Perspective toxicity proxy. The API key is server-side only
// (process.env.GM_API_KEY, NOT NEXT_PUBLIC_). The client calls this
// route via /api/toxicity; the key is never exposed to the browser.

const MAX_TEXT_LEN = 1000

export default async function handler(req, res) {
  // Only allow same-origin POSTs from the SciTeens site.
  res.setHeader('Vary', 'Origin')
  const allowed = (
    process.env.NEXT_PUBLIC_SITE_URL || ''
  ).replace(/\/$/, '')
  const origin = req.headers.origin
  if (origin && allowed && origin !== allowed) {
    return res
      .status(403)
      .json({ error: 'Forbidden origin' })
  }

  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res
      .status(405)
      .json({ error: 'Method not allowed' })
  }

  // Per-IP rate limit: 30 requests / 10s window.
  const ip =
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket.remoteAddress ||
    'unknown'
  if (!rateLimit(`toxicity:${ip}`, 30, 10_000)) {
    return res
      .status(429)
      .json({ error: 'Too many requests' })
  }

  const text = req.body?.text
  if (
    typeof text !== 'string' ||
    text.trim().length === 0
  ) {
    return res.status(400).json({ error: 'Missing text' })
  }
  if (text.length > MAX_TEXT_LEN) {
    return res.status(400).json({ error: 'Text too long' })
  }

  const apiKey = process.env.GM_API_KEY
  if (!apiKey) {
    return res
      .status(500)
      .json({ error: 'Toxicity service not configured' })
  }

  const postLink =
    'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=' +
    apiKey

  try {
    const response = await fetch(postLink, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        comment: { text },
        languages: ['en'],
        requestedAttributes: {
          TOXICITY: {},
          PROFANITY: {},
          INSULT: {},
        },
      }),
    })

    if (!response.ok) {
      console.error(
        'Perspective API error:',
        response.status
      )
      return res
        .status(502)
        .json({ error: 'Toxicity service unavailable' })
    }

    const data = await response.json()
    return res.status(200).json(data)
  } catch (err) {
    console.error('Toxicity handler error:', err)
    return res.status(500).json({ error: 'Internal error' })
  }
}
