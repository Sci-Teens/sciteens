const path = require('path')

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'hi', 'fr'],
    // Off because Firebase Hosting caches on the URL alone. With detection on,
    // `/` answers either a prerendered 200 or a 307 to /es, /fr or /hi purely
    // from Accept-Language, and the 200 carries s-maxage=31536000 with no
    // Vary, so the first visitor at an edge POP pins the language for everyone
    // behind it. Vary: Accept-Language cannot fix it: the redirect is emitted
    // in Next's router before custom headers apply, and it would shard the
    // busiest url in the site across an unbounded header space. Locale comes
    // from the url prefix instead.
    localeDetection: false,
  },
  localePath: path.resolve('./public/locales'),
  // Off by default; e2e/i18n-smoke.spec.js sets
  // NEXT_PUBLIC_I18NEXT_DEBUG=true so a missing key logs a warning
  // instead of silently rendering the raw key.
  debug: process.env.NEXT_PUBLIC_I18NEXT_DEBUG === 'true',
}
