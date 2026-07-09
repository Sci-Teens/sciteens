// Creates a project, adds a member by email, edits it, confirms field
// checkboxes reflect saved state.
//
// KNOWN BUG (pre-existing): member-by-email is non-functional —
// `validateEmail()` queries the `emails` collection client-side, but
// firestore.rules denies all reads on it (verified: permission-denied),
// so every lookup reports "not found" regardless of registration. Real
// fix needs a Cloud Function (avoids an email-enumeration oracle).
// This test asserts the actual current behavior.
const { test, expect } = require('@playwright/test')
const {
  seedStudent,
  getProject,
  getProjectInvite,
  setProjectFields,
} = require('./support/admin')

const PASSWORD = 'SciTeens!23'

async function signIn(page, { email, password }, ref) {
  await page.goto(
    ref
      ? `/signin/student?ref=${encodeURIComponent(ref)}`
      : '/signin/student'
  )
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page
    .getByRole('button', {
      name: 'Sign In',
      exact: true,
    })
    .click()
}

test.describe('project create -> invite -> edit', () => {
  test('field checkboxes survive create + edit; member-by-email lookup is (currently) always a miss', async ({
    page,
  }) => {
    const owner = await seedStudent({
      firstName: 'Owner',
      lastName: 'PFlow',
      password: PASSWORD,
    })
    const invitee = await seedStudent({
      firstName: 'Invitee',
      lastName: 'PFlow',
    })

    await signIn(page, owner, 'project|create')
    await page.waitForURL('/project/create', {
      timeout: 15_000,
    })

    const title = `E2E Project ${Date.now()}`
    await page.locator('#title').fill(title)
    await page.locator('#start-date').fill('2026-01-01')
    await page.locator('#end-date').fill('2026-06-01')
    await page
      .locator('#abstract')
      .fill('An e2e-created project abstract.')

    const fieldsCheckbox = page.getByRole('checkbox', {
      name: 'Biology',
    })
    await fieldsCheckbox.click()
    await expect(fieldsCheckbox).toBeChecked()

    await page.locator('#member').fill(invitee.email)
    // Current, correct-per-rules behavior (see file header), not a
    // flake.
    await expect(
      page.getByText('We could not find that address')
    ).toBeVisible({ timeout: 5_000 })

    await page
      .getByRole('button', { name: 'Create' })
      .click()
    // `(?!create)` excludes /project/create itself, which `[^/]+`
    // alone also matches and raced the real redirect.
    await page.waitForURL(/\/project\/(?!create)[^/]+$/, {
      timeout: 15_000,
    })
    const projectId = page
      .url()
      .split('/project/')[1]
      .split(/[/?#]/)[0]

    // `read: if false` in firestore.rules — only the admin SDK can
    // verify this.
    const invite = await getProjectInvite(projectId)
    expect(invite?.emails).toEqual([])

    const created = await getProject(projectId)
    expect(created.fields).toEqual(['Biology'])
    expect(created.member_uids).toEqual([owner.uid])

    // Simulates a pre-migration doc (real historical projects store
    // `fields` lowercase); no UI path can produce this anymore.
    await setProjectFields(projectId, ['biology'])

    await page.goto(`/project/${projectId}/edit`)
    await expect(page.locator('#title')).toHaveValue(
      title,
      { timeout: 15_000 }
    )
    await expect(
      page.getByRole('checkbox', { name: 'Biology' })
    ).toBeChecked()
  })
})
