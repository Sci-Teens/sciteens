// Pure url allowlists shared by the build-time markdown pipeline
// (lib/markdown.mjs) and the client renderer (components/MarkdownContent.js).
//
// Deliberately dependency-free so the renderer can re-check a url at render
// time without pulling unified and the whole markdown parser into the client
// bundle.

// Origins allowed to appear in an <iframe src>. Must stay in step with the
// frame-src list in next.config.js#headers(), or an accepted embed renders as
// a blank frame.
export const EMBED_SRC_HOSTS = [
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'w.soundcloud.com',
  'open.spotify.com',
]

// Protocols a link or image may use. Everything else (javascript:, data:,
// vbscript:) is refused rather than rewritten, so a hand-edited markdown file
// cannot introduce a scripting sink through an href. script-src still carries
// 'unsafe-inline' for Next's bootstrap, so a javascript: url that reached the
// DOM would execute same-origin.
const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:']

export function isSafeContentUrl(value) {
  if (typeof value !== 'string' || !value) return false
  // Protocol-relative ("//evil.test") is rejected: it inherits https and
  // reads like a path.
  if (value.startsWith('//')) return false
  // Our own assets and routes, and in-page anchors.
  if (value.startsWith('/') || value.startsWith('#'))
    return true
  try {
    return SAFE_PROTOCOLS.includes(new URL(value).protocol)
  } catch {
    return false
  }
}

export function isAllowedEmbedUrl(value) {
  if (typeof value !== 'string' || !value) return false
  let parsed
  try {
    parsed = new URL(value)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  return EMBED_SRC_HOSTS.includes(
    parsed.hostname.toLowerCase()
  )
}
