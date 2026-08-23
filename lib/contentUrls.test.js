import { describe, expect, it } from 'vitest'

import {
  EMBED_SRC_HOSTS,
  isAllowedEmbedUrl,
  isSafeContentUrl,
} from './contentUrls.mjs'

// This is the only thing standing between a pull-requested markdown file and
// an href, an <img src> or an <iframe src>, so the bypasses are asserted
// rather than assumed.
describe('isSafeContentUrl', () => {
  it.each([
    '/content/media/cover.webp',
    '/article/tldr-science-sleep',
    '#section',
    'https://example.org/paper.pdf',
    'http://example.org/paper.pdf',
    'mailto:hello@sciteens.org',
  ])('accepts %s', (url) => {
    expect(isSafeContentUrl(url)).toBe(true)
  })

  // A browser resolves both of these to a foreign authority even though they
  // start with a slash and read like a repository path.
  it.each(['//evil.example', '/\\evil.example'])(
    'rejects the authority that hides in %s',
    (url) => {
      expect(
        new URL(url, 'https://sciteens.org/article/x')
          .origin
      ).toBe('https://evil.example')
      expect(isSafeContentUrl(url)).toBe(false)
    }
  )

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'blob:https://sciteens.org/abc',
    'vbscript:msgbox(1)',
    'file:///etc/passwd',
    'relative/path',
    '',
    null,
    undefined,
    42,
  ])('rejects %s', (url) => {
    expect(isSafeContentUrl(url)).toBe(false)
  })
})

describe('isAllowedEmbedUrl', () => {
  it.each(EMBED_SRC_HOSTS)(
    'accepts %s over https',
    (host) => {
      expect(
        isAllowedEmbedUrl(`https://${host}/embed/abc`)
      ).toBe(true)
    }
  )

  it('accepts a host regardless of case', () => {
    expect(
      isAllowedEmbedUrl('https://WWW.YouTube.com/embed/abc')
    ).toBe(true)
  })

  it.each([
    // Userinfo, not a host: the authority is evil.example.
    'https://www.youtube.com@evil.example/embed/abc',
    'https://evil.example/embed/abc',
    // Suffix and subdomain matches are both refused.
    'https://notwww.youtube.com/embed/abc',
    'https://www.youtube.com.evil.example/embed/abc',
    // http is not https.
    'http://www.youtube.com/embed/abc',
    'javascript:alert(1)',
    '/content/media/cover.webp',
  ])('rejects %s', (url) => {
    expect(isAllowedEmbedUrl(url)).toBe(false)
  })
})

// An embed the CSP does not allow renders as a blank frame, and a feature the
// Permissions-Policy does not delegate silently drops, so the three lists have
// to name the same hosts.
describe('csp and permissions-policy stay in step', () => {
  const headers = require('../next.config.js').headers
  async function headerValue(key) {
    const groups = await headers()
    for (const group of groups) {
      const found = group.headers.find(
        (header) => header.key === key
      )
      if (found) return found.value
    }
    return null
  }

  it('allows every embed host in frame-src', async () => {
    const csp = await headerValue('Content-Security-Policy')
    const frameSrc = csp
      .split(';')
      .map((part) => part.trim())
      .find((part) => part.startsWith('frame-src'))
    for (const host of EMBED_SRC_HOSTS)
      expect(frameSrc).toContain(`https://${host}`)
  })

  it('delegates fullscreen and playback to every embed host', async () => {
    const policy = await headerValue('Permissions-Policy')
    for (const feature of [
      'fullscreen',
      'encrypted-media',
      'picture-in-picture',
      'autoplay',
    ]) {
      const directive = policy
        .split(', ')
        .find((part) => part.startsWith(`${feature}=`))
      expect(directive, feature).toBeDefined()
      for (const host of EMBED_SRC_HOSTS)
        expect(directive, feature).toContain(
          `"https://${host}"`
        )
    }
  })

  it('keeps sensitive features scoped to self', async () => {
    const policy = await headerValue('Permissions-Policy')
    for (const feature of [
      'camera',
      'microphone',
      'geolocation',
      'payment',
      'usb',
    ])
      expect(policy).toContain(`${feature}=(self)`)
  })
})
