// Shared by the build-time pipeline (lib/markdown.mjs) and the render sink
// (components/MarkdownContent.js). Dependency-free so the renderer can
// re-check a url without pulling the markdown parser into the client bundle.

// Must stay in step with frame-src in next.config.js#headers(), or an
// accepted embed renders as a blank frame.
const EMBED_SRC_HOSTS = [
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'w.soundcloud.com',
  'open.spotify.com',
]

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:']

// Refused rather than rewritten: script-src still carries 'unsafe-inline' for
// Next's bootstrap, so a javascript: url reaching the DOM executes
// same-origin.
export function isSafeContentUrl(value) {
  if (typeof value !== 'string' || !value) return false
  // Protocol-relative reads like a path but inherits https.
  if (value.startsWith('//')) return false
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
  return (
    parsed.protocol === 'https:' &&
    EMBED_SRC_HOSTS.includes(parsed.hostname.toLowerCase())
  )
}
