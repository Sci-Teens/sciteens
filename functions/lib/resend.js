const { Resend } = require('resend')
const {
  defineSecret,
} = require('firebase-functions/params')
const admin = require('firebase-admin')
const crypto = require('node:crypto')
const {
  EMAIL_CATEGORY_VALUES,
  CATEGORY_AUDIENCE_NAMES,
} = require('./emailCategories')

// functions.config() was removed in firebase-functions v7, so credentials
// are a Secret Manager param instead. Secrets are only readable at
// invocation time (after being bound via `.runWith({ secrets: [...] })`
// on each export that needs them), so the client is built lazily rather
// than at module load.
const resendApiKey = defineSecret('RESEND_APIKEY')
let resendClient
function getResend() {
  if (!resendClient) {
    resendClient = new Resend(resendApiKey.value())
  }
  return resendClient
}

// Legacy single Resend audience holding every contact, regardless of
// category. Kept alongside the per-category audiences below (added in
// addContact) so any existing Resend-side segments/broadcasts built
// against this id keep working.
const CONTACTS_AUDIENCE_ID =
  '8c384f39-b01c-4cc8-a97e-1c9660c85225'

const FROM = 'SciTeens <noreply@sciteens.org>'
const SITE_URL = 'https://sciteens.com'
// Firebase Functions v1 HTTPS triggers deploy to us-central1 by default
// (no .region() call on any export in index.js) under the
// directed-relic-266701 project (see .firebaserc). Update both if
// either changes.
const FUNCTIONS_BASE_URL =
  'https://us-central1-directed-relic-266701.cloudfunctions.net'

// category -> Resend audience id, populated lazily so no audience uuid
// needs to be hardcoded/pre-created by hand.
const audienceIdCache = new Map()

// Best-effort: finds (or creates) the Resend audience for a category.
// Never throws — a Resend outage must not block Firestore-gated sends.
async function getOrCreateAudience(category) {
  if (audienceIdCache.has(category)) {
    return audienceIdCache.get(category)
  }
  const name = CATEGORY_AUDIENCE_NAMES[category]
  if (!name) return null
  try {
    const list = await getResend().audiences.list()
    const audiences = list?.data?.data || list?.data || []
    const found = audiences.find((a) => a.name === name)
    if (found) {
      audienceIdCache.set(category, found.id)
      return found.id
    }
    const created = await getResend().audiences.create({
      name,
    })
    if (created.error || !created.data) {
      console.log(
        'resend getOrCreateAudience error:',
        category,
        created.error
      )
      return null
    }
    audienceIdCache.set(category, created.data.id)
    return created.data.id
  } catch (err) {
    console.log(
      'resend getOrCreateAudience error:',
      category,
      err
    )
    return null
  }
}

// Adds (or upserts) a contact to the all-contacts audience, plus every
// category audience listed in `categories` (defaults to all of them —
// every user starts subscribed to everything until they unsubscribe,
// matching profiles/{uid}.emailSubscriptions' default). Never throws on
// failure — email delivery/list membership is best-effort and must not
// block the write that triggered it.
async function addContact({
  email,
  firstName,
  lastName,
  categories = EMAIL_CATEGORY_VALUES,
}) {
  try {
    const result = await getResend().contacts.create({
      audienceId: CONTACTS_AUDIENCE_ID,
      email,
      firstName,
      lastName,
      unsubscribed: false,
    })
    if (result.error) {
      console.log('resend addContact error:', result.error)
    }
    await Promise.all(
      categories.map(async (category) => {
        const audienceId = await getOrCreateAudience(
          category
        )
        if (!audienceId) return
        const categoryResult =
          await getResend().contacts.create({
            audienceId,
            email,
            firstName,
            lastName,
            unsubscribed: false,
          })
        if (categoryResult.error) {
          console.log(
            'resend addContact category error:',
            category,
            categoryResult.error
          )
        }
      })
    )
    return result
  } catch (err) {
    console.log('resend addContact error:', err)
  }
}

// Mirrors a category's subscribed/unsubscribed state into the matching
// Resend audience. Best-effort — the Firestore write in setSubscription
// is the source of truth sendEmail() gates on; this just keeps the
// Resend dashboard accurate for manual broadcasts.
async function setResendCategorySubscription({
  email,
  category,
  unsubscribed,
}) {
  const audienceId = await getOrCreateAudience(category)
  if (!audienceId) return
  try {
    const result = await getResend().contacts.update({
      audienceId,
      email,
      unsubscribed,
    })
    if (result.error) {
      console.log(
        'resend setResendCategorySubscription error:',
        category,
        result.error
      )
    }
  } catch (err) {
    console.log(
      'resend setResendCategorySubscription error:',
      category,
      err
    )
  }
}

// Opaque, unguessable per-user token proving an unsubscribe link came
// from an email we actually sent — no shared secret to provision or
// keep in sync across the Functions/Next runtimes, just a Firestore
// read both sides already do. Lazily created on first use so existing
// users (from before this field existed) get one on their next email.
async function getUnsubscribeToken(uid) {
  const ref = admin
    .firestore()
    .collection('emails')
    .doc(uid)
  const snap = await ref.get()
  const existing =
    snap.exists && snap.data().unsubscribeToken
  if (existing) return existing
  const token = crypto.randomUUID()
  await ref.set(
    { unsubscribeToken: token },
    { merge: true }
  )
  return token
}

async function verifyUnsubscribeToken(uid, token) {
  if (!uid || !token || typeof token !== 'string') {
    return false
  }
  const snap = await admin
    .firestore()
    .collection('emails')
    .doc(uid)
    .get()
  const expected =
    snap.exists && snap.data().unsubscribeToken
  if (!expected) return false
  const a = Buffer.from(token)
  const b = Buffer.from(expected)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

// Two links sharing the same token: `pageUrl` (the branded /unsubscribe
// page, used in the email body — lets the recipient see/manage every
// category) and `actionUrl` (the bare Cloud Function endpoint, used as
// the List-Unsubscribe header target so mail clients' native "Unsubscribe"
// one-click button — RFC 8058 — hits it directly with no page render).
async function buildUnsubscribeLinks(uid, category) {
  const token = await getUnsubscribeToken(uid)
  const params = new URLSearchParams({
    uid,
    category,
    token,
  })
  return {
    pageUrl: `${SITE_URL}/unsubscribe?${params.toString()}`,
    actionUrl: `${FUNCTIONS_BASE_URL}/unsubscribe?${params.toString()}`,
  }
}

// profiles/{uid}.emailSubscriptions is the source of truth sendEmail()
// gates on. A missing map, or a missing category key within it, means
// "still subscribed" — this must never flip an existing user to
// unsubscribed just because the field didn't exist before this feature.
async function getSubscriptions(uid) {
  const snap = await admin
    .firestore()
    .collection('profiles')
    .doc(uid)
    .get()
  const stored =
    (snap.exists && snap.data().emailSubscriptions) || {}
  const subscriptions = {}
  for (const category of EMAIL_CATEGORY_VALUES) {
    subscriptions[category] = stored[category] !== false
  }
  return subscriptions
}

async function isSubscribed(uid, category) {
  const snap = await admin
    .firestore()
    .collection('profiles')
    .doc(uid)
    .get()
  const stored =
    snap.exists && snap.data().emailSubscriptions
  return !(stored && stored[category] === false)
}

async function setSubscription(uid, category, subscribed) {
  await admin
    .firestore()
    .collection('profiles')
    .doc(uid)
    .set(
      { emailSubscriptions: { [category]: subscribed } },
      { merge: true }
    )
}

// `category`/`uid` (when both given) gate the send on
// profiles/{uid}.emailSubscriptions — an unsubscribed recipient is
// skipped before ever calling Resend. `unsubscribeActionUrl` (from
// buildUnsubscribeLinks) is attached as List-Unsubscribe headers when
// present; transactional callers omit all three and behave exactly as
// before.
async function sendEmail({
  to,
  toName,
  subject,
  html,
  category,
  uid,
  unsubscribeActionUrl,
}) {
  if (category && uid) {
    const subscribed = await isSubscribed(uid, category)
    if (!subscribed) {
      console.log(
        `Skipping ${category} email to uid ${uid}: unsubscribed`
      )
      return { skipped: true }
    }
  }
  return getResend().emails.send({
    from: FROM,
    to: toName ? `${toName} <${to}>` : to,
    subject,
    html,
    ...(unsubscribeActionUrl && {
      headers: {
        'List-Unsubscribe': `<${unsubscribeActionUrl}>`,
        'List-Unsubscribe-Post':
          'List-Unsubscribe=One-Click',
      },
    }),
  })
}

module.exports = {
  resendApiKey,
  sendEmail,
  addContact,
  CONTACTS_AUDIENCE_ID,
  buildUnsubscribeLinks,
  verifyUnsubscribeToken,
  getSubscriptions,
  setSubscription,
  setResendCategorySubscription,
}
