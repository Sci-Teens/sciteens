// Loads the marketing/listing pages plus the two refreshed detail
// pages in all four locales, and asserts zero next-i18next missing-key
// warnings and zero page errors. Debug logging for missing keys is
// opt-in (NEXT_PUBLIC_I18NEXT_DEBUG=true, set in playwright.config.js).
//
// The detail pages are worth the extra 8 navigations: they carry keys
// that no listing page renders (`projects.no_files`,
// `index_profile.about_empty`, ...), so an en-only key would otherwise
// ship a raw dot path to every non-English reader.
const { test, expect } = require('@playwright/test')

const LOCALES = ['en', 'es', 'fr', 'hi']
const STATIC_PATHS = ['/', '/projects', '/articles']

function seededPaths() {
  const projectId = process.env.E2E_FILTER_MODERN_PROJECT_ID
  const profileSlug = process.env.E2E_OWNER_PROFILE_SLUG
  return [
    projectId && `/project/${projectId}`,
    profileSlug && `/profile/${profileSlug}`,
  ].filter(Boolean)
}

function localizedPath(locale, path) {
  if (locale === 'en') return path
  return path === '/' ? `/${locale}` : `/${locale}${path}`
}

test.describe('i18n smoke', () => {
  for (const locale of LOCALES) {
    for (const path of STATIC_PATHS) {
      test(`${path} has no missing keys or errors in ${locale}`, async ({
        page,
      }) => {
        await visit(page, locale, path)
      })
    }

    test(`the project and profile detail pages have no missing keys or errors in ${locale}`, async ({
      page,
    }) => {
      const paths = seededPaths()
      expect(
        paths.length,
        'global-setup did not export the seeded fixture ids'
      ).toBe(2)
      for (const path of paths) {
        await visit(page, locale, path)
      }
    })
  }
})

async function visit(page, locale, path) {
  const missingKeyLogs = []
  const pageErrors = []

  const onConsole = (msg) => {
    const text = msg.text()
    if (text.includes('missingKey'))
      missingKeyLogs.push(text)
  }
  const onPageError = (err) => pageErrors.push(err.message)
  page.on('console', onConsole)
  page.on('pageerror', onPageError)

  try {
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
  } finally {
    page.off('console', onConsole)
    page.off('pageerror', onPageError)
  }
}
