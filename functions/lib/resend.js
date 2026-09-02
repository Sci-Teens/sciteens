const { Resend } = require('resend')
const {
  defineSecret,
} = require('firebase-functions/params')
const admin = require('firebase-admin')
const crypto = require('node:crypto')
const {
  CATEGORY_AUDIENCE_NAMES,
  CONTACT_AUDIENCES,
  CONTACT_AUDIENCE_NAMES,
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

// Preserve the existing general unsubscribe target for already delivered
// emails. New contacts use the Transactional or Newsletter segment.
const CONTACTS_AUDIENCE_ID =
  '8c384f39-b01c-4cc8-a97e-1c9660c85225'

const FROM = 'SciTeens <noreply@sciteens.org>'
const SITE_URL = 'https://sciteens.org'
// Firebase Functions v1 HTTPS triggers deploy to us-central1 by default
// (no .region() call on any export in index.js) under the
// directed-relic-266701 project (see .firebaserc). Update both if
// either changes.
const FUNCTIONS_BASE_URL =
  'https://us-central1-directed-relic-266701.cloudfunctions.net'

// Existing preference categories use legacy Resend audiences.
const audienceIdCache = new Map()

// New contact lists use Resend segments. Broadcasts require a segment id.
const segmentIdCache = new Map()
let newsletterTopicId

const NEWSLETTER_TOPIC = {
  name: 'SciTeens Newsletter',
  description:
    'Monthly SciTeens stories, projects, and opportunities.',
}

function resultData(result) {
  return result?.data?.data || result?.data || []
}

// Best-effort: finds (or creates) the legacy audience used by a preference
// category. Never throws because contact syncing must not block its trigger.
async function getOrCreateAudience(
  category,
  resend = getResend()
) {
  if (audienceIdCache.has(category)) {
    return audienceIdCache.get(category)
  }
  const name = CATEGORY_AUDIENCE_NAMES[category]
  if (!name) return null
  try {
    const list = await resend.audiences.list()
    const found = resultData(list).find(
      (item) => item.name === name
    )
    if (found) {
      audienceIdCache.set(category, found.id)
      return found.id
    }
    const created = await resend.audiences.create({ name })
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

async function getOrCreateSegment(
  audience,
  resend = getResend()
) {
  if (segmentIdCache.has(audience)) {
    return segmentIdCache.get(audience)
  }
  const name = CONTACT_AUDIENCE_NAMES[audience]
  if (!name) return null
  try {
    const list = await resend.segments.list()
    const found = resultData(list).find(
      (item) => item.name === name
    )
    if (found) {
      segmentIdCache.set(audience, found.id)
      return found.id
    }
    const created = await resend.segments.create({ name })
    if (created.error || !created.data) {
      console.log(
        'resend getOrCreateSegment error:',
        audience,
        created.error
      )
      return null
    }
    segmentIdCache.set(audience, created.data.id)
    return created.data.id
  } catch (err) {
    console.log(
      'resend getOrCreateSegment error:',
      audience,
      err
    )
    return null
  }
}

async function getOrCreateNewsletterTopic(
  resend = getResend()
) {
  if (newsletterTopicId) return newsletterTopicId
  try {
    const list = await resend.topics.list()
    const found = resultData(list).find(
      (item) => item.name === NEWSLETTER_TOPIC.name
    )
    if (found) {
      newsletterTopicId = found.id
      return newsletterTopicId
    }
    const created = await resend.topics.create({
      name: NEWSLETTER_TOPIC.name,
      description: NEWSLETTER_TOPIC.description,
      defaultSubscription: 'opt_out',
      visibility: 'private',
    })
    if (created.error || !created.data) {
      console.log(
        'resend getOrCreateNewsletterTopic error:',
        created.error
      )
      return null
    }
    newsletterTopicId = created.data.id
    return newsletterTopicId
  } catch (err) {
    console.log(
      'resend getOrCreateNewsletterTopic error:',
      err
    )
    return null
  }
}

async function ensureContact(
  { email, firstName, lastName, properties },
  resend
) {
  try {
    const existing = await resend.contacts.get({ email })
    if (existing.data) {
      const changes = {
        email,
        ...(firstName && { firstName }),
        ...(lastName && { lastName }),
        ...(properties && { properties }),
      }
      if (Object.keys(changes).length > 1) {
        const updated = await resend.contacts.update(
          changes
        )
        if (updated.error) {
          console.log(
            'Resend contact update failed:',
            updated.error
          )
          return false
        }
      }
      return true
    }

    const created = await resend.contacts.create({
      email,
      firstName,
      lastName,
      properties,
    })
    if (created.error) {
      console.log(
        'Resend contact creation failed:',
        created.error
      )
      return false
    }
    return true
  } catch (err) {
    console.log('Resend contact creation failed:', err)
    return false
  }
}

async function addContactToSegment(
  contact,
  audience,
  resend = getResend()
) {
  const segmentId = await getOrCreateSegment(
    audience,
    resend
  )
  if (!segmentId) return false
  if (!(await ensureContact(contact, resend))) return false
  try {
    const memberships = await resend.contacts.segments.list(
      {
        email: contact.email,
      }
    )
    if (
      !memberships.error &&
      resultData(memberships).some(
        (segment) => segment.id === segmentId
      )
    ) {
      return true
    }
    const result = await resend.contacts.segments.add({
      email: contact.email,
      segmentId,
    })
    if (result.error) {
      console.log(
        'Resend segment membership update failed:',
        audience,
        result.error
      )
      return false
    }
    return true
  } catch (err) {
    console.log(
      'Resend segment membership update failed:',
      audience,
      err
    )
    return false
  }
}

function addTransactionalContact(
  contact,
  resend = getResend()
) {
  return addContactToSegment(
    contact,
    CONTACT_AUDIENCES.TRANSACTIONAL,
    resend
  )
}

async function addNewsletterContact(
  contact,
  resend = getResend()
) {
  const [joinedSegment, topicId] = await Promise.all([
    addContactToSegment(
      contact,
      CONTACT_AUDIENCES.NEWSLETTER,
      resend
    ),
    getOrCreateNewsletterTopic(resend),
  ])
  if (!joinedSegment || !topicId) return false
  try {
    const result = await resend.contacts.topics.update({
      email: contact.email,
      topics: [{ id: topicId, subscription: 'opt_in' }],
    })
    if (result.error) {
      console.log(
        'Resend newsletter topic update failed:',
        result.error
      )
      return false
    }
    return true
  } catch (err) {
    console.log(
      'Resend newsletter topic update failed:',
      err
    )
    return false
  }
}

async function setNewsletterContactSubscription({
  email,
  unsubscribed,
}) {
  const topicId = await getOrCreateNewsletterTopic()
  if (!topicId) return false
  try {
    const result = await getResend().contacts.topics.update(
      {
        email,
        topics: [
          {
            id: topicId,
            subscription: unsubscribed
              ? 'opt_out'
              : 'opt_in',
          },
        ],
      }
    )
    if (result.error) {
      console.log(
        'Resend newsletter topic update failed:',
        result.error
      )
      return false
    }
    return true
  } catch (err) {
    console.log(
      'Resend newsletter topic update failed:',
      err
    )
    return false
  }
}

// Mirrors a category's subscribed/unsubscribed state into its Resend
// audience. A general unsubscribe also opts the contact out of the legacy
// all-contacts audience, which can receive manual newsletter broadcasts.
async function setResendCategorySubscription({
  email,
  category,
  unsubscribed,
}) {
  const categoryAudienceId = await getOrCreateAudience(
    category
  )
  const audienceIds = categoryAudienceId
    ? [categoryAudienceId]
    : []

  if (category === 'general') {
    audienceIds.push(CONTACTS_AUDIENCE_ID)
  }

  await Promise.all(
    audienceIds.map(async (audienceId) => {
      try {
        const result = await getResend().contacts.update({
          audienceId,
          email,
          unsubscribed,
        })
        if (result.error) {
          console.log(
            'Resend subscription update failed:',
            category,
            result.error
          )
        }
      } catch (err) {
        console.log(
          'Resend subscription update failed:',
          category,
          err
        )
      }
    })
  )
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
function assertEmailSent(result) {
  if (result.error) {
    console.error('Resend email send error:', result.error)
    throw new Error(
      `Resend rejected the email: ${
        result.error.message || 'unknown error'
      }`
    )
  }
  return result
}

function buildResendEmailPayload({
  to,
  toName,
  subject,
  react,
  unsubscribeActionUrl,
}) {
  return {
    from: FROM,
    to: toName ? `${toName} <${to}>` : to,
    subject,
    react,
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
  if (category && uid) {
    const subscribed = await isSubscribed(uid, category)
    if (!subscribed) {
      console.log(
        `Skipping ${category} email to uid ${uid}: unsubscribed`
      )
      return { skipped: true }
    }
  }
  const result = await getResend().emails.send(
    buildResendEmailPayload({
      to,
      toName,
      subject,
      react,
      unsubscribeActionUrl,
    })
  )
  return assertEmailSent(result)
}

function buildNewsletterBroadcastPayload({
  segmentId,
  topicId,
  name,
  subject,
  react,
  send,
  scheduledAt,
}) {
  return {
    segmentId,
    topicId,
    from: FROM,
    name,
    subject,
    react,
    ...(send && { send: true }),
    ...(scheduledAt && { scheduledAt }),
  }
}

function assertBroadcastCreated(result) {
  if (result.error) {
    console.error(
      'Resend newsletter broadcast error:',
      result.error
    )
    throw new Error(
      `Resend rejected the newsletter broadcast: ${
        result.error.message || 'unknown error'
      }`
    )
  }
  return result
}

async function createNewsletterBroadcast({
  apiKey,
  name,
  subject,
  react,
  send = false,
  scheduledAt,
}) {
  const resend = new Resend(apiKey)
  const [segmentId, topicId] = await Promise.all([
    getOrCreateSegment(
      CONTACT_AUDIENCES.NEWSLETTER,
      resend
    ),
    getOrCreateNewsletterTopic(resend),
  ])
  if (!segmentId || !topicId) {
    throw new Error(
      'Resend newsletter list is unavailable.'
    )
  }
  const result = await resend.broadcasts.create(
    buildNewsletterBroadcastPayload({
      segmentId,
      topicId,
      name,
      subject,
      react,
      send,
      scheduledAt,
    })
  )
  return assertBroadcastCreated(result)
}

module.exports = {
  resendApiKey,
  sendEmail,
  assertEmailSent,
  buildResendEmailPayload,
  addTransactionalContact,
  addNewsletterContact,
  setNewsletterContactSubscription,
  createNewsletterBroadcast,
  assertBroadcastCreated,
  buildNewsletterBroadcastPayload,
  CONTACTS_AUDIENCE_ID,
  buildUnsubscribeLinks,
  verifyUnsubscribeToken,
  getSubscriptions,
  setSubscription,
  setResendCategorySubscription,
}
