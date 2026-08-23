// Shared by the build-time pipeline (lib/markdown.mjs) and the render sink
// (components/MarkdownContent.js). Dependency-free so the renderer can
// re-check a url without pulling the markdown parser into the client bundle.

// Must stay in step with EMBED_SRC_HOSTS in next.config.js, which feeds both
// frame-src and Permissions-Policy. lib/contentUrls.test.js asserts it.
export const EMBED_SRC_HOSTS = [
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'w.soundcloud.com',
  'open.spotify.com',
]

const SAFE_PROTOCOLS = ['http:', 'https:', 'mailto:']

// Any base works; only whether the input keeps this origin matters.
const LOCAL_BASE = 'https://local.invalid/'
const LOCAL_ORIGIN = 'https://local.invalid'

// Refused rather than rewritten: script-src still carries 'unsafe-inline' for
// Next's bootstrap, so a javascript: url reaching the DOM executes
// same-origin.
export function isSafeContentUrl(value) {
  if (typeof value !== 'string' || !value) return false
  if (value.startsWith('#')) return true
  // Parsed rather than string-matched: the browser reads both `//host` and
  // `/\host` as an authority, so neither is the local path it looks like.
  if (value.startsWith('/')) {
    try {
      return (
        new URL(value, LOCAL_BASE).origin === LOCAL_ORIGIN
      )
    } catch {
      return false
    }
  }
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
