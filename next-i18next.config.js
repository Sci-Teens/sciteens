const path = require('path')

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'hi', 'fr'],
  },
  localePath: path.resolve('./public/locales'),
  // Off by default; e2e/i18n-smoke.spec.js sets
  // NEXT_PUBLIC_I18NEXT_DEBUG=true so a missing key logs a warning
  // instead of silently rendering the raw key.
  debug: process.env.NEXT_PUBLIC_I18NEXT_DEBUG === 'true',
}
