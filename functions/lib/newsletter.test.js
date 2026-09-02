import { describe, expect, it } from 'vitest'

const {
  createNewsletterToken,
  hashNewsletterValue,
  isNewsletterSubscriberId,
  matchesNewsletterUnsubscribeToken,
  newsletterLocale,
  normalizeNewsletterEmail,
  tokensMatch,
} = require('./newsletter')

describe('normalizeNewsletterEmail', () => {
  it('normalizes a valid email address', () => {
    expect(
      normalizeNewsletterEmail('  Student@Example.org ')
    ).toBe('student@example.org')
  })

  it.each(['', 'student@example', 'student @example.org'])(
    'rejects invalid email address %s',
    (email) => {
      expect(normalizeNewsletterEmail(email)).toBeNull()
    }
  )
})

describe('newsletter tokens', () => {
  it('creates opaque tokens that match only themselves', () => {
    const token = createNewsletterToken()

    expect(tokensMatch(token, token)).toBe(true)
    expect(tokensMatch(token, `${token}x`)).toBe(false)
  })

  it('creates a stable opaque subscriber id', () => {
    expect(hashNewsletterValue('student@example.org')).toBe(
      hashNewsletterValue('student@example.org')
    )
  })

  it('accepts only a hashed subscriber id', () => {
    expect(
      isNewsletterSubscriberId(
        hashNewsletterValue('student@example.org')
      )
    ).toBe(true)
    expect(
      isNewsletterSubscriberId('student@example.org')
    ).toBe(false)
  })

  it('keeps the prior unsubscribe token valid after a list sync', () => {
    const originalToken = createNewsletterToken()
    const migratedToken = createNewsletterToken()
    const subscriber = {
      unsubscribeTokenHash:
        hashNewsletterValue(migratedToken),
      previousUnsubscribeTokenHash:
        hashNewsletterValue(originalToken),
    }

    expect(
      matchesNewsletterUnsubscribeToken(
        subscriber,
        originalToken
      )
    ).toBe(true)
    expect(
      matchesNewsletterUnsubscribeToken(
        subscriber,
        migratedToken
      )
    ).toBe(true)
    expect(
      matchesNewsletterUnsubscribeToken(
        subscriber,
        'invalid'
      )
    ).toBe(false)
  })
})

describe('newsletterLocale', () => {
  it('uses English when the supplied locale is not supported', () => {
    expect(newsletterLocale('de')).toBe('en')
    expect(newsletterLocale('fr')).toBe('fr')
  })
})
