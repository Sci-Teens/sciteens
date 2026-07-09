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

const PASSWORD = 'SciTeens!23'

test.describe('resolveRefPath redirect end to end', () => {
  test('student signup with no ?ref= redirects home', async ({
    page,
  }) => {
    await page.goto('/signup/student')
    await page.locator('#first_name').fill('Ada')
    await page.locator('#last_name').fill('Lovelace')
    await page
      .locator('#email')
      .fill(`e2e-signup-${uniqueSuffix()}@example.com`)
    await page.locator('#password').fill(PASSWORD)
    await page.locator('#birthday').fill('2000-01-01')
    await page
      .getByRole('checkbox', {
        name: 'I have read and accept',
      })
      .click()

    const submit = page.getByRole('button', {
      name: 'Create Account',
    })
    // Gated on form validity plus the emulator-faked reCAPTCHA
    // resolving (lib/firebase.js's appVerificationDisabledForTesting).
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
    await page.locator('#email').fill(student.email)
    await page.locator('#password').fill(student.password)
    await page
      .getByRole('button', {
        name: 'Sign In',
        exact: true,
      })
      .click()

    await page.waitForURL(`/project/${projectId}`, {
      timeout: 15_000,
    })
  })
})
