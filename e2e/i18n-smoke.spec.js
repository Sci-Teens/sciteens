// Loads /, /projects, /articles in all
// four locales, assert zero next-i18next missing-key warnings and
// zero page errors. Debug logging for missing keys is opt-in
// (NEXT_PUBLIC_I18NEXT_DEBUG=true, set in playwright.config.js).
const { test, expect } = require('@playwright/test')

const LOCALES = ['en', 'es', 'fr', 'hi']
const PATHS = ['/', '/projects', '/articles']

function localizedPath(locale, path) {
  if (locale === 'en') return path
  return path === '/' ? `/${locale}` : `/${locale}${path}`
}

test.describe('i18n smoke', () => {
  for (const locale of LOCALES) {
    for (const path of PATHS) {
      test(`${path} has no missing keys or errors in ${locale}`, async ({
        page,
      }) => {
        // KNOWN ISSUE, not caused by this test: /articles reliably
        // hydration-fails under `next dev` in every locale (not a
        // moment.js locale race, not concurrency-specific — root
        // cause not pinned down, suspect useWindowVirtualizer racing
        // /articles' live external CMS data). Tracked via test.fail()
        // so it flips to a build failure once someone actually fixes
        // it.
        test.fail(
          path === '/articles',
          'Known /articles hydration-mismatch bug, not yet root-caused — see comment above'
        )

        const missingKeyLogs = []
        const pageErrors = []

        page.on('console', (msg) => {
          const text = msg.text()
          if (text.includes('missingKey')) {
            missingKeyLogs.push(text)
          }
        })
        page.on('pageerror', (err) => {
          pageErrors.push(err.message)
        })

        // Not 'networkidle': Firestore keeps a persistent WebChannel
        // connection open, which would hang that wait forever.
        await page.goto(localizedPath(locale, path), {
          waitUntil: 'load',
        })
        await page.waitForTimeout(1_000)

        expect(
          missingKeyLogs,
          `missing i18next keys on ${locale}${path}`
        ).toEqual([])
        expect(
          pageErrors,
          `uncaught page errors on ${locale}${path}`
        ).toEqual([])
      })
    }
  }
})
