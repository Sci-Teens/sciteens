const { render } = require('@react-email/render')
const {
  defineSecret,
} = require('firebase-functions/params')
const admin = require('firebase-admin')
const crypto = require('node:crypto')
const {
  CONTACT_AUDIENCE_NAMES,
  CONTACT_AUDIENCES,
  EMAIL_CATEGORY_VALUES,
} = require('./emailCategories')

const plunkSecretKey = defineSecret('PLUNK_SECRET_KEY')
const PLUNK_API_URL = 'https://next-api.useplunk.com'
const FROM = {
  name: 'SciTeens',
  email: 'noreply@sciteens.org',
}
const SITE_URL = 'https://sciteens.org'
const FUNCTIONS_BASE_URL =
  'https://us-central1-directed-relic-266701.cloudfunctions.net'

const segmentIdCache = new Map()

function plunkError(payload, fallback) {
  const error = payload?.error
  if (typeof error === 'string') return error
  return error?.message || fallback
}

async function plunkRequest(path, options = {}, apiKey) {
  const response = await fetch(`${PLUNK_API_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${
        apiKey || plunkSecretKey.value()
      }`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })
  const payload = await response.json().catch(() => null)
  if (!response.ok || payload?.success === false) {
    throw new Error(
      plunkError(
        payload,
        `Plunk request failed (${response.status}).`
      )
    )
  }
  return payload?.data || payload
}

async function getOrCreateSegment(audience, apiKey) {
  if (segmentIdCache.has(audience)) {
    return segmentIdCache.get(audience)
  }
  const name = CONTACT_AUDIENCE_NAMES[audience]
  if (!name) return null
  const segments = await plunkRequest(
    '/segments',
    {},
    apiKey
  )
  const list = Array.isArray(segments)
    ? segments
    : segments.data || []
  const found = list.find(
    (segment) => segment.name === name
  )
  if (found) {
    segmentIdCache.set(audience, found.id)
    return found.id
  }
  const created = await plunkRequest(
    '/segments',
    {
      method: 'POST',
      body: JSON.stringify({ name, type: 'STATIC' }),
    },
    apiKey
  )
  segmentIdCache.set(audience, created.id)
  return created.id
}

function contactData({ firstName, lastName, properties }) {
  return {
    ...(firstName && { firstName }),
    ...(lastName && { lastName }),
    ...properties,
  }
}

async function upsertContact(
  contact,
  { subscribed } = {},
  apiKey
) {
  return plunkRequest(
    '/contacts',
    {
      method: 'POST',
      body: JSON.stringify({
        email: contact.email,
        ...(typeof subscribed === 'boolean' && {
          subscribed,
        }),
        data: contactData(contact),
      }),
    },
    apiKey
  )
}

async function addContactToSegment(
  contact,
  audience,
  apiKey,
  subscribed
) {
  const segmentId = await getOrCreateSegment(
    audience,
    apiKey
  )
  if (!segmentId) return false
  try {
    await plunkRequest(
      `/segments/${segmentId}/members`,
      {
        method: 'POST',
        body: JSON.stringify({
          emails: [contact.email],
          createMissing: true,
          subscribed,
        }),
      },
      apiKey
    )
    await upsertContact(contact, { subscribed }, apiKey)
    return true
  } catch (error) {
    console.error('Plunk contact sync failed:', error)
    return false
  }
}

function addTransactionalContact(
  contact,
  apiKey,
  { subscribed = false } = {}
) {
  return addContactToSegment(
    contact,
    CONTACT_AUDIENCES.TRANSACTIONAL,
    apiKey,
    subscribed
  )
}

function addNewsletterContact(contact, apiKey) {
  return addContactToSegment(
    contact,
    CONTACT_AUDIENCES.NEWSLETTER,
    apiKey,
    true
  )
}

async function setNewsletterContactSubscription({
  email,
  unsubscribed,
}) {
  try {
    await upsertContact(
      { email },
      { subscribed: !unsubscribed }
    )
    return true
  } catch (error) {
    console.error(
      'Plunk newsletter subscription update failed:',
      error
    )
    return false
  }
}

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
  if (!uid || !token || typeof token !== 'string')
    return false
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
  return (
    a.length === b.length && crypto.timingSafeEqual(a, b)
  )
}

async function buildUnsubscribeLinks(uid, category) {
  const token = await getUnsubscribeToken(uid)
  const params = new URLSearchParams({
    uid,
    category,
    token,
  })
  return {
    pageUrl: `${SITE_URL}/unsubscribe#${params.toString()}`,
    actionUrl: `${FUNCTIONS_BASE_URL}/unsubscribe?${params.toString()}`,
  }
}

async function getSubscriptions(uid) {
  const snap = await admin
    .firestore()
    .collection('profiles')
    .doc(uid)
    .get()
  const stored =
    (snap.exists && snap.data().emailSubscriptions) || {}
  return Object.fromEntries(
    EMAIL_CATEGORY_VALUES.map((category) => [
      category,
      stored[category] !== false,
    ])
  )
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

function buildPlunkEmailPayload({
  to,
  toName,
  subject,
  html,
  unsubscribeActionUrl,
}) {
  return {
    from: FROM,
    to: toName ? { name: toName, email: to } : to,
    subject,
    body: html,
    ...(unsubscribeActionUrl && {
      headers: {
        'List-Unsubscribe': `<${unsubscribeActionUrl}>`,
        'List-Unsubscribe-Post':
          'List-Unsubscribe=One-Click',
      },
    }),
  }
}

async function sendEmail({
  to,
  toName,
  subject,
  react,
  category,
  uid,
  unsubscribeActionUrl,
}) {
  if (
    category &&
    uid &&
    !(await isSubscribed(uid, category))
  ) {
    console.log(
      `Skipping ${category} email to uid ${uid}: unsubscribed`
    )
    return { skipped: true }
  }
  const html = await render(react)
  return plunkRequest('/v1/send', {
    method: 'POST',
    body: JSON.stringify(
      buildPlunkEmailPayload({
        to,
        toName,
        subject,
        html,
        unsubscribeActionUrl,
      })
    ),
  })
}

function buildNewsletterCampaignPayload({
  segmentId,
  name,
  subject,
  html,
}) {
  return {
    name,
    subject,
    body: html,
    from: FROM.email,
    fromName: FROM.name,
    type: 'MARKETING',
    audienceType: 'SEGMENT',
    segmentId,
  }
}

async function createNewsletterCampaign({
  apiKey,
  name,
  subject,
  react,
  send = false,
  scheduledAt,
}) {
  const segmentId = await getOrCreateSegment(
    CONTACT_AUDIENCES.NEWSLETTER,
    apiKey
  )
  if (!segmentId)
    throw new Error(
      'Plunk newsletter segment is unavailable.'
    )
  const html = await render(react)
  const campaign = await plunkRequest(
    '/campaigns',
    {
      method: 'POST',
      body: JSON.stringify(
        buildNewsletterCampaignPayload({
          segmentId,
          name,
          subject,
          html,
        })
      ),
    },
    apiKey
  )
  if (send) {
    await plunkRequest(
      `/campaigns/${campaign.id}/send`,
      {
        method: 'POST',
        body: JSON.stringify(
          scheduledAt ? { scheduledFor: scheduledAt } : {}
        ),
      },
      apiKey
    )
  }
  return campaign
}

module.exports = {
  plunkSecretKey,
  sendEmail,
  buildPlunkEmailPayload,
  addTransactionalContact,
  addNewsletterContact,
  setNewsletterContactSubscription,
  createNewsletterCampaign,
  buildNewsletterCampaignPayload,
  buildUnsubscribeLinks,
  verifyUnsubscribeToken,
  getSubscriptions,
  setSubscription,
  plunkRequest,
}
