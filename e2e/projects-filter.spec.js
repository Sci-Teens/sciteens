// For one seeded lowercase legacy
// project and one Title-Case project, /projects?field=X returns a
// non-empty, translated-badge result for both. Fixtures are seeded
// once in e2e/global-setup.js to avoid racing project-flow.spec.js.
const { test, expect } = require('@playwright/test')

// The list is virtualized and paginated behind a "Load more" button —
// click it until the target shows up or there's nothing left to load.
async function loadUntilVisible(
  page,
  locator,
  { maxAttempts = 20 } = {}
) {
  const loadMore = page.getByRole('button', {
    name: /Load more/i,
  })
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (await locator.isVisible()) return
    if (!(await loadMore.isVisible())) break
    await loadMore.click()
    await page.waitForTimeout(250)
  }
  await expect(locator).toBeVisible({ timeout: 5_000 })
}

test.describe('projects field filtering', () => {
  test('finds both legacy-lowercase and Title-Case Biology projects', async ({
    page,
  }) => {
    test.skip(
      !process.env.E2E_FILTER_LEGACY_PROJECT_ID ||
        !process.env.E2E_FILTER_MODERN_PROJECT_ID,
      'global setup did not seed filter fixtures'
    )

    await page.goto('/projects?field=Biology')

    const legacyLink = page.getByRole('link', {
      name: 'E2E Legacy Biology Project',
    })
    const modernLink = page.getByRole('link', {
      name: 'E2E Modern Biology Project',
    })

    await loadUntilVisible(page, legacyLink)
    await loadUntilVisible(page, modernLink)

    // Both cards show the same translated badge regardless of storage
    // casing (getFieldLabel's case-insensitive fallback).
    const legacyCard = legacyLink.locator('xpath=..')
    const modernCard = modernLink.locator('xpath=..')
    await expect(
      legacyCard.getByText('Biology', { exact: true })
    ).toBeVisible()
    await expect(
      modernCard.getByText('Biology', { exact: true })
    ).toBeVisible()

    // Never the "no results" empty state.
    await expect(
      page.getByText(
        "Sorry, we couldn't find any searches related to"
      )
    ).toHaveCount(0)
  })
})
