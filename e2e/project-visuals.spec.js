// Regression coverage for three reported Projects bugs, seeded with
// synthetic fixtures so nothing depends on real production data:
//   1. Member profile pictures: a dead picture URL must fall back to
//      the user icon, never a broken-image box with raw alt text.
//   2. Missing project photos: must fall back to a neutral icon
//      placeholder, never the stretched sciteens logo on a gray box.
//   3. Dates: the project card's date must align under the "By" label
//      at any viewport width (no hardcoded offset), and the project
//      detail page's "Started on" date must actually render (it used
//      to read a field the Firestore doc never had).
const { test, expect } = require('@playwright/test')
const {
  seedStudent,
  seedProject,
  seedProfilePicture,
} = require('./support/admin')

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
