// Exercises resolveRefPath end to end through the real router. Second
// scenario uses sign-in, not a second signup: the Auth Emulator's
// reCAPTCHA mock only auto-resolves once per emulator lifetime
// (firebase-js-sdk#4126), and sign-in has no reCAPTCHA gate but shares
// the same redirect pattern.
const { test, expect } = require('@playwright/test')
const {
  uniqueSuffix,
  seedStudent,
} = require('./support/admin')
const { waitForHydration } = require('./support/ui')

const PASSWORD = 'SciTeens!23'

test.describe('resolveRefPath redirect end to end', () => {
  test('student signup with no ?ref= redirects home', async ({
    page,
  }) => {
    await page.goto('/signup/student')
    await waitForHydration(page, '#first_name')
    await page.locator('#first_name').fill('Ada')
    await page.locator('#last_name').fill('Lovelace')
    await page
      .locator('#email')
      .fill(`e2e-signup-${uniqueSuffix()}@example.com`)
    await page.locator('#password').fill(PASSWORD)
    // BirthdayField is a Popover+Calendar, not a native date
    // input; open it, navigate to January 2000 via the
    // dropdowns, click day 1.
    await page.locator('#birthday').click()
    await page
      .getByRole('combobox', { name: 'Choose the Year' })
      .selectOption('2000')
    await page
      .getByRole('combobox', { name: 'Choose the Month' })
      .selectOption({ label: 'Jan' })
    await page
      .getByRole('button', { name: /January 1st, 2000/ })
      .click()
    await page
      .getByRole('checkbox', {
        name: 'I have read and accept',
      })
      .click()

    const submit = page.getByRole('button', {
      name: 'Create Account',
    })
    // Gated on form validity plus the emulator-faked reCAPTCHA
    // resolving (lib/firebase.js's
    // appVerificationDisabledForTesting).
    await expect(submit).toBeEnabled({ timeout: 15_000 })
    await submit.click()

    await page.waitForURL('/', { timeout: 15_000 })
  })

  test('student sign-in with ?ref=project|<id> redirects to /project/<id>', async ({
    page,
  }) => {
    test.skip(
      !process.env.E2E_FILTER_MODERN_PROJECT_ID,
      'global setup did not seed a fixture project'
    )
    const projectId =
      process.env.E2E_FILTER_MODERN_PROJECT_ID
    const student = await seedStudent()

    await page.goto(
      `/signin/student?ref=project|${projectId}`
    )
    await waitForHydration(page, '#email')
    await page.locator('#email').fill(student.email)
    await page.locator('#password').fill(student.password)
    const submit = page.getByRole('button', {
      name: 'Sign In',
      exact: true,
    })
    await expect(submit).toBeEnabled({ timeout: 15_000 })
    await submit.click()

    await page.waitForURL(`/project/${projectId}`, {
      timeout: 15_000,
    })
  })
})
