// Runs once before the run. Seeds fixtures shared across specs so
// they don't race each other, and so projects-filter.spec.js has a
// pre-existing "legacy lowercase" doc to find.
const { chromium } = require('@playwright/test')
const {
  seedStudent,
  seedProject,
} = require('./support/admin')
const { EMULATOR_APP_PORT } = require('./support/env')

// A real browser warmup (not just fetch) forces both the server
// compile and client bundle hydration to finish before the parallel
// run starts — a plain fetch warmup left first-form-interaction
// flakiness (e.g. a submit button never leaving disabled).
async function warmRoute(page, baseUrl, path) {
  try {
    await page.goto(`${baseUrl}${path}`, {
      waitUntil: 'load',
      timeout: 60_000,
    })
    await page.waitForTimeout(300)
  } catch (e) {
    console.warn(
      `[global-setup] warmup visit to ${path} failed (non-fatal): ${e.message}`
    )
  }
}

module.exports = async function globalSetup() {
  const owner = await seedStudent({
    firstName: 'Filter',
    lastName: 'Owner',
  })

  // One legacy (pre-Title-Case) doc and one modern doc for the same
  // field, both findable by `?field=Biology` — see pages/projects.js's
  // `array-contains-any` fallback.
  const legacyProjectId = await seedProject({
    title: 'E2E Legacy Biology Project',
    abstract: 'Seeded fixture, lowercase legacy fields.',
    fields: ['biology'],
    member_uids: [owner.uid],
    member_arr: [
      {
        display: owner.displayName,
        uid: owner.uid,
        slug: owner.slug,
      },
    ],
  })
  const modernProjectId = await seedProject({
    title: 'E2E Modern Biology Project',
    abstract: 'Seeded fixture, Title Case fields.',
    fields: ['Biology'],
    member_uids: [owner.uid],
    member_arr: [
      {
        display: owner.displayName,
        uid: owner.uid,
        slug: owner.slug,
      },
    ],
  })

  const baseUrl = `http://127.0.0.1:${EMULATOR_APP_PORT}`
  const browser = await chromium.launch()
  const page = await browser.newPage()
  try {
    for (const path of [
      '/',
      '/projects',
      '/articles',
      '/signup/student',
      '/signin/student',
      '/project/create',
      `/project/${modernProjectId}`,
      `/project/${modernProjectId}/edit`,
    ]) {
      await warmRoute(page, baseUrl, path)
    }
  } finally {
    await browser.close()
  }

  // Handed to specs via process.env — Playwright forks workers after
  // globalSetup, so they inherit it.
  process.env.E2E_FILTER_LEGACY_PROJECT_ID = legacyProjectId
  process.env.E2E_FILTER_MODERN_PROJECT_ID = modernProjectId
}
