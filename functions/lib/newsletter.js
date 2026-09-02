const crypto = require('node:crypto')

const SUPPORTED_LOCALES = new Set(['en', 'es', 'fr', 'hi'])
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function normalizeNewsletterEmail(value) {
  if (typeof value !== 'string') return null

  const email = value.trim().toLowerCase()
  if (
    email.length === 0 ||
    email.length > 254 ||
    !EMAIL_PATTERN.test(email)
  ) {
    return null
  }

  return email
}

function createNewsletterToken() {
  return crypto.randomBytes(32).toString('base64url')
}

function hashNewsletterValue(value) {
  return crypto
    .createHash('sha256')
    .update(value)
    .digest('hex')
}

function isNewsletterSubscriberId(value) {
  return (
    typeof value === 'string' &&
    /^[a-f0-9]{64}$/.test(value)
  )
}

function tokensMatch(expected, received) {
  if (
    typeof expected !== 'string' ||
    typeof received !== 'string'
  ) {
    return false
  }

  const expectedToken = Buffer.from(expected)
  const receivedToken = Buffer.from(received)
  return (
    expectedToken.length === receivedToken.length &&
    crypto.timingSafeEqual(expectedToken, receivedToken)
  )
}

function newsletterLocale(value) {
  return SUPPORTED_LOCALES.has(value) ? value : 'en'
}

module.exports = {
  createNewsletterToken,
  hashNewsletterValue,
  isNewsletterSubscriberId,
  newsletterLocale,
  normalizeNewsletterEmail,
  tokensMatch,
}
