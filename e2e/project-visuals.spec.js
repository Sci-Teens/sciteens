// Regression coverage for reported Projects bugs, seeded with
// synthetic fixtures so nothing depends on real production data:
//   1. Member profile pictures: a dead picture URL must fall back to
//      the user icon, never a broken-image box with raw alt text.
//   2. Missing project photos: must fall back to a neutral icon
//      placeholder, never the stretched sciteens logo on a gray box.
//   3. Dates: the project card's date must align under the "By" label
//      at any viewport width (no hardcoded offset), and the project
//      detail page's "Started on" date must actually render (it used
//      to read a field the Firestore doc never had).
//   4. A missing project photo must render nothing immediately, not an
//      indefinite loading skeleton (the hero used to be gated behind an
//      unrelated, slow Storage file listing instead of the Firestore
//      project_photo field that's already available at first paint).
//   5. Buttons/links inside the detail page's `prose` article (Edit,
//      member name, field tags) must never render underlined:
//      `@tailwindcss/typography`'s `a` styles beat a plain
//      `no-underline` utility class here, so these need `not-prose`.
//   6. The detail page's field tags must resolve the same Title-Case
//      label as the listing page instead of a raw (possibly legacy
//      lowercase) Firestore value.
const { test, expect } = require('@playwright/test')
const {
  seedStudent,
  seedProject,
  seedProfilePicture,
} = require('./support/admin')

const PASSWORD = 'SciTeens!23'

async function signIn(page, { email, password }) {
  await page.goto('/signin/student')
  await page.locator('#email').fill(email)
  await page.locator('#password').fill(password)
  await page
    .getByRole('button', { name: 'Sign In', exact: true })
    .click()
}
test.describe('project visuals', () => {
  let brokenPhotoMember
  let missingPhotoMember
  let datedProjectId

  test.beforeAll(async () => {
    brokenPhotoMember = await seedStudent({
      firstName: 'Broken',
      lastName: 'Picture',
    })
    missingPhotoMember = await seedStudent({
      firstName: 'NoPic',
      lastName: 'Member',
    })
    await seedProfilePicture(
      brokenPhotoMember.uid,
      'https://storage.googleapis.com/sciteens-e2e-fixtures/definitely-dead-image.jpg'
    )
    // missingPhotoMember intentionally gets no profile-pictures doc.

    const sharedMembers = {
      member_arr: [
        {
          uid: brokenPhotoMember.uid,
          display: brokenPhotoMember.displayName,
          slug: brokenPhotoMember.slug,
        },
        {
          uid: missingPhotoMember.uid,
          display: missingPhotoMember.displayName,
          slug: missingPhotoMember.slug,
        },
      ],
      member_uids: [
        brokenPhotoMember.uid,
        missingPhotoMember.uid,
      ],
    }

    await seedProject({
      title: 'Broken Photo Project',
      abstract: 'Has a project_photo URL that 404s.',
      project_photo:
        'https://storage.googleapis.com/sciteens-e2e-fixtures/definitely-dead-photo.jpg',
      fields: ['biology'],
      ...sharedMembers,
    })

    await seedProject({
      title: 'No Photo Project',
      abstract: 'Has no project_photo at all.',
      fields: ['biology'],
      ...sharedMembers,
    })

    datedProjectId = await seedProject({
      title: 'Dated Project',
      abstract: 'Has a start date that must render.',
      start: '2024-03-15T12:00:00.000Z',
      fields: ['biology'],
      member_arr: [],
      member_uids: [],
    })
  })

  test('project cards show icon placeholders instead of broken images or the stretched logo', async ({
    page,
  }) => {
    await page.goto('/projects')

    const brokenCard = page
      .getByRole('link', { name: 'Broken Photo Project' })
      .locator('..')
    const noPhotoCard = page
      .getByRole('link', { name: 'No Photo Project' })
      .locator('..')

    await expect(
      page.getByText('Broken Photo Project')
    ).toBeVisible()
    await expect(
      page.getByText('No Photo Project')
    ).toBeVisible()

    // Neither card's thumbnail should ever request the sciteens logo
    // asset as a "missing image" filler.
    await expect(
      page.locator('img[src*="sciteens_initials"]')
    ).toHaveCount(0)

    await expect(async () => {
      const hasBrokenImg = await brokenCard
        .locator('img[alt="Broken Photo Project"]')
        .count()
      expect(hasBrokenImg).toBe(0)
    }).toPass({ timeout: 5000 })

    // The photo-less project must render an icon, not an <img>.
    await expect(noPhotoCard.locator('img')).toHaveCount(0)
    await expect(
      noPhotoCard.locator('svg')
    ).not.toHaveCount(0)
  })

  test('member profile pictures fall back to a user icon, never raw alt text', async ({
    page,
  }) => {
    await page.goto('/projects')

    const card = page
      .getByRole('link', { name: 'Broken Photo Project' })
      .locator('..')

    // Both members' avatars render as <svg> icons: the broken-URL
    // member because its picture 404s, the no-doc member because it
    // never had one.
    await expect(async () => {
      const avatarImgs = await card
        .locator('img[alt="Profile"]')
        .count()
      expect(avatarImgs).toBe(0)
    }).toPass({ timeout: 5000 })
  })

  test('the date aligns under the "By" label at mobile and desktop widths', async ({
    page,
  }) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1280, height: 900 },
    ]) {
      await page.setViewportSize(viewport)
      await page.goto('/projects')

      const card = page
        .getByRole('link', {
          name: 'Broken Photo Project',
        })
        .locator('..')
      const byLabel = card.getByText('By', {
        exact: false,
      })
      const dateNode = card
        .locator('div.grid > div.col-start-2')
        .first()

      await expect(byLabel.first()).toBeVisible()
      await expect(dateNode).toBeVisible()

      const byBox = await byLabel.first().boundingBox()
      const dateBox = await dateNode.boundingBox()

      expect(byBox).not.toBeNull()
      expect(dateBox).not.toBeNull()
      // Same grid column -> same left edge, regardless of viewport
      // (a few px of tolerance absorbs subpixel grid-track rounding;
      // the old hardcoded `ml-10` offset used to be tens of px wrong).
      expect(
        Math.abs(byBox.x - dateBox.x)
      ).toBeLessThanOrEqual(4)
    }
  })

  test('the project detail page renders the start date', async ({
    page,
  }) => {
    await page.goto(`/project/${datedProjectId}`)

    await expect(
      page.getByText('Mar 15, 2024')
    ).toBeVisible()
  })
})

test.describe('project detail page prose/typography fixes', () => {
  let owner
  let ownedProjectId
  let legacyFieldProjectId
  let noPhotoProjectId

  test.beforeAll(async () => {
    owner = await seedStudent({
      firstName: 'Owner',
      lastName: 'Underline',
      password: PASSWORD,
    })
    ownedProjectId = await seedProject({
      title: 'Underline Regression Project',
      abstract: 'Checking button/link styling.',
      fields: ['Biology'],
      member_arr: [
        {
          uid: owner.uid,
          display: owner.displayName,
          slug: owner.slug,
        },
      ],
      member_uids: [owner.uid],
    })
    // Real historical projects store `fields` lowercase (pre-dates the
    // Title Case FIELD_NAMES dict) — no UI path can produce this.
    legacyFieldProjectId = await seedProject({
      title: 'Legacy Field Casing Project',
      abstract: 'Has lowercase legacy field casing.',
      fields: ['biology'],
      member_arr: [],
      member_uids: [],
    })
    noPhotoProjectId = await seedProject({
      title: 'No Photo Instant Project',
      abstract: 'Has no project_photo at all.',
      fields: [],
      member_arr: [],
      member_uids: [],
    })
  })

  test('Edit, member, and field-tag links on the detail page are never underlined', async ({
    page,
  }) => {
    await signIn(page, {
      email: owner.email,
      password: PASSWORD,
    })
    await page.goto(`/project/${ownedProjectId}`)

    const edit = page.getByRole('link', {
      name: 'Edit',
      exact: true,
    })
    const member = page.getByRole('link', {
      name: owner.displayName,
    })
    const tag = page.getByRole('link', {
      name: 'Biology',
      exact: true,
    })

    await expect(edit).toBeVisible()
    await expect(member).toBeVisible()
    await expect(tag).toBeVisible()

    for (const locator of [edit, member, tag]) {
      const textDecoration = await locator.evaluate(
        (el) => getComputedStyle(el).textDecorationLine
      )
      expect(textDecoration).toBe('none')
    }
  })

  test('the detail page resolves the same Title-Case field label as the listing page for legacy lowercase data', async ({
    page,
  }) => {
    await page.goto(`/project/${legacyFieldProjectId}`)

    const tag = page.getByRole('link', {
      name: 'Biology',
      exact: true,
    })
    await expect(tag).toBeVisible()
    expect(await tag.textContent()).toBe('Biology')
  })

  test('a project with no photo renders nothing immediately, never an indefinite loading skeleton', async ({
    page,
  }) => {
    // Simulates a slow/unreachable Storage backend: if the hero image
    // were still gated behind the file-listing effect, this would hang
    // the pulsing skeleton indefinitely instead of resolving from
    // Firestore's project_photo field.
    await page.route(
      '**/storage/v1/b/**',
      () => new Promise(() => {})
    )

    await page.goto(`/project/${noPhotoProjectId}`, {
      waitUntil: 'domcontentloaded',
    })
    await expect(
      page.getByText('No Photo Instant Project')
    ).toBeVisible()

    await expect(
      page.locator('.animate-pulse')
    ).toHaveCount(0)
    await expect(
      page.locator('img[alt*="Photo"]')
    ).toHaveCount(0)
  })
})
