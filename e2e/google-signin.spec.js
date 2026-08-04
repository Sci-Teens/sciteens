// Google sign-in is the only flow that leaves the app for another origin
// and comes back, and the only one that routes to the signed-in user's
// own profile. Both branches of providerSignIn are covered: no profile
// doc yet -> /signup/finish, profile doc present -> /profile/<slug>.
//
// Driven at a phone viewport because that is where the reported bug
// showed up. Headless Chromium never freezes the opener tab, so it cannot
// reproduce the popup poller losing its race with the auth event
// (firebase-js-sdk#7807) — that recovery path is unit-tested in
// context/helpers.test.js. What this locks in is the routing either side
// of it, through the real SDK and the real router.
//
// Waits are generous because this is the only spec that reaches
// /signup/finish, /profile/<slug> and /project/<id>, and `next dev`
// compiles each of them on first visit while other workers are running.
const { test, expect } = require('@playwright/test')
const {
  adminApp,
  uniqueSuffix,
} = require('./support/admin')
const { waitForHydration } = require('./support/ui')

test.use({ viewport: { width: 390, height: 844 } })

async function signInWithGoogle(page, { email, display }) {
  const [popup] = await Promise.all([
    page.waitForEvent('popup'),
    page.getByRole('button', { name: /Google/i }).click(),
  ])
  await popup.waitForLoadState('domcontentloaded')

  const known = popup
    .locator('li.js-reuse-account')
    .filter({ hasText: email })
  if (await known.count()) {
    await known.first().click()
  } else {
    await popup.locator('#add-account-button').click()
    await popup.locator('#email-input').fill(email)
    await popup.locator('#display-name-input').fill(display)
    await popup.locator('#sign-in').click()
  }
  await popup.waitForEvent('close', { timeout: 60_000 })
}

// Auth persistence is IndexedDB-backed (lib/firebase.js), so dropping the
// database and reloading is a sign-out the emulator's IdP session
// survives — which is what lets the second sign-in reuse the account.
async function signOut(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) => {
        const req = indexedDB.deleteDatabase(
          'firebaseLocalStorageDb'
        )
        req.onsuccess = resolve
        req.onerror = resolve
        req.onblocked = resolve
      })
  )
  await page.evaluate(() => {
    localStorage.clear()
    sessionStorage.clear()
  })
}

test('Google sign-in routes to /signup/finish, then to the profile page', async ({
  page,
}) => {
  const suffix = uniqueSuffix()
  const email = `e2e-google-${suffix}@example.com`
  const display = 'Ada Lovelace'

  await page.goto('/signin/student')
  await waitForHydration(page, '#email')
  await signInWithGoogle(page, { email, display })

  // No profiles/<uid> doc yet, so the user has to finish signing up —
  // with the name Google handed back already filled in.
  await page.waitForURL(/\/signup\/finish/, {
    timeout: 60_000,
  })
  await expect(page.locator('#first_name')).toHaveValue(
    'Ada'
  )
  await expect(page.locator('#last_name')).toHaveValue(
    'Lovelace'
  )

  const user = await adminApp().auth().getUserByEmail(email)
  const slug = `ada-lovelace-${suffix}`
  await adminApp()
    .firestore()
    .collection('profiles')
    .doc(user.uid)
    .set({
      uid: user.uid,
      display,
      authorized: true,
      slug,
      about: '',
      fields: [],
      programs: [],
      links: [],
      joined: new Date().toISOString(),
      institution: '',
      position: '',
      subs_p: [],
      subs_e: [],
      mentor: false,
    })
  await adminApp()
    .firestore()
    .collection('profile-slugs')
    .doc(slug)
    .set({ slug })

  await signOut(page)
  await page.goto('/signin/student')
  await waitForHydration(page, '#email')
  await signInWithGoogle(page, { email, display })

  await page.waitForURL(`/profile/${slug}`, {
    timeout: 60_000,
  })
})

test('Google sign-in honours ?ref= over the profile page', async ({
  page,
}) => {
  test.skip(
    !process.env.E2E_FILTER_MODERN_PROJECT_ID,
    'global setup did not seed a fixture project'
  )
  const projectId = process.env.E2E_FILTER_MODERN_PROJECT_ID
  const suffix = uniqueSuffix()
  const email = `e2e-google-ref-${suffix}@example.com`
  const display = 'Grace Hopper'

  await page.goto('/signup/student')
  await waitForHydration(page, '#first_name')
  await signInWithGoogle(page, { email, display })
  await page.waitForURL(/\/signup\/finish/, {
    timeout: 60_000,
  })

  const user = await adminApp().auth().getUserByEmail(email)
  const slug = `grace-hopper-${suffix}`
  await adminApp()
    .firestore()
    .collection('profiles')
    .doc(user.uid)
    .set({ uid: user.uid, display, authorized: true, slug })

  await signOut(page)
  await page.goto(
    `/signin/student?ref=project|${projectId}`
  )
  await waitForHydration(page, '#email')
  await signInWithGoogle(page, { email, display })

  await page.waitForURL(`/project/${projectId}`, {
    timeout: 60_000,
  })
})
