const path = require('path')

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'hi', 'fr'],
    // Off because `/` would otherwise answer either a prerendered 200 or a
    // 307 to /es, /fr or /hi purely from Accept-Language. Measured against
    // the production server: that 200 carries s-maxage=31536000 and
    // `Vary: Accept-Encoding`, naming nothing it actually varies on, so any
    // shared cache may reuse it for a request in another language. That much
    // is a response defect regardless of what sits in front. Firebase Hosting
    // keys on the url and, per its docs, caches a backend response when
    // Cache-Control opts in, which s-maxage does — but that specific
    // behaviour is documented, not measured, so the cutover list verifies it
    // on the Hosting url before DNS moves. `Vary: Accept-Language` is not the
    // fix: it cannot reach the 307, which Next emits in router-server before
    // custom headers apply, and it would shard the busiest url in the site
    // across an unbounded header space. Locale comes from the url prefix.
    localeDetection: false,
  },
  localePath: path.resolve('./public/locales'),
  // Off by default; e2e/i18n-smoke.spec.js sets
  // NEXT_PUBLIC_I18NEXT_DEBUG=true so a missing key logs a warning
  // instead of silently rendering the raw key.
  debug: process.env.NEXT_PUBLIC_I18NEXT_DEBUG === 'true',
}
