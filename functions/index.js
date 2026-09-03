const crypto = require('node:crypto')
// Firebase
const functions = require('firebase-functions/v1')
const {
  defineSecret,
} = require('firebase-functions/params')
const admin = require('firebase-admin')
admin.initializeApp()

// Meilisearch — self-hosted replacement for the Algolia Firebase Extension
// (see functions/search.js, infra/meilisearch/). MEILI_HOST is a plain
// non-secret env var (functions/.env); the master key is Secret Manager,
// like the other third-party credentials below.
const {
  indexProject,
  deleteProjectFromIndex,
} = require('./search')
const meiliMasterKey = defineSecret('MEILI_MASTER_KEY')

// Google
const vision = require('@google-cloud/vision')

// Resend
const {
  resendApiKey,
  sendEmail,
  addTransactionalContact,
  addNewsletterContact,
  buildUnsubscribeLinks,
  verifyUnsubscribeToken,
  getSubscriptions,
  setSubscription,
  setResendCategorySubscription,
  setNewsletterContactSubscription,
} = require('./lib/resend')
const {
  verifyEmailTemplate,
  welcomeTemplate,
  newFeedbackTemplate,
  upcomingProgramTemplate,
  projectUpdateTemplate,
  newsletterConfirmationTemplate,
  newsletterWelcomeTemplate,
} = require('./lib/emailTemplates')
const {
  EMAIL_CATEGORIES,
  EMAIL_CATEGORY_VALUES,
} = require('./lib/emailCategories')
const {
  createNewsletterToken,
  hashNewsletterValue,
  isNewsletterSubscriberId,
  matchesNewsletterUnsubscribeToken,
  newsletterLocale,
  normalizeNewsletterEmail,
  tokensMatch,
} = require('./lib/newsletter')

// Ceiling on how many addresses one project-invite document may fan
// out to. firestore.rules enforces the same bound at write time.
const MAX_PROJECT_INVITES = 10
const PROJECT_INVITE_RATE_WINDOW = 60 * 60 * 1000
const MAX_PROJECT_INVITES_PER_WINDOW = 20
const PROJECT_INVITE_TOKEN_WINDOW = 7 * 24 * 60 * 60 * 1000

async function reserveProjectInviteQuota(
  requestedBy,
  projectId,
  count
) {
  const now = Date.now()
  const db = admin.firestore()
  const projectRef = db
    .collection('projects')
    .doc(projectId)
  const rateRef = db
    .collection('project-invite-rate-limits')
    .doc(hashNewsletterValue(requestedBy))

  return db.runTransaction(async (transaction) => {
    const [projectSnapshot, rateSnapshot] =
      await Promise.all([
        transaction.get(projectRef),
        transaction.get(rateRef),
      ])
    const members = projectSnapshot.exists
      ? projectSnapshot.data().member_uids
      : []
    if (
      !Array.isArray(members) ||
      !members.includes(requestedBy)
    ) {
      return false
    }

    const data = rateSnapshot.exists
      ? rateSnapshot.data()
      : {}
    const windowStartedAt =
      typeof data.windowStartedAt === 'number'
        ? data.windowStartedAt
        : 0
    const currentCount =
      typeof data.count === 'number' ? data.count : 0
    const inCurrentWindow =
      now - windowStartedAt < PROJECT_INVITE_RATE_WINDOW
    const nextCount = inCurrentWindow
      ? currentCount + count
      : count
    if (nextCount > MAX_PROJECT_INVITES_PER_WINDOW) {
      return false
    }

    transaction.set(rateRef, {
      windowStartedAt: inCurrentWindow
        ? windowStartedAt
        : now,
      count: nextCount,
      expiresAt: new Date(now + PROJECT_INVITE_RATE_WINDOW),
      updatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    })
    return true
  })
}

const DISCUSSION_EMAIL_RATE_WINDOW = 60 * 60 * 1000
const MAX_DISCUSSION_EMAILS_PER_WINDOW = 5

async function reserveDiscussionEmailQuota(
  senderUid,
  recipientUid
) {
  const now = Date.now()
  const collection = admin
    .firestore()
    .collection('discussion-email-rate-limits')
  const refs = [
    collection.doc(
      `sender-${hashNewsletterValue(senderUid)}`
    ),
    collection.doc(
      `recipient-${hashNewsletterValue(recipientUid)}`
    ),
  ]
  return admin
    .firestore()
    .runTransaction(async (transaction) => {
      const snapshots = await Promise.all(
        refs.map((ref) => transaction.get(ref))
      )
      const states = snapshots.map((snapshot) => {
        const data = snapshot.exists ? snapshot.data() : {}
        const windowStartedAt =
          typeof data.windowStartedAt === 'number'
            ? data.windowStartedAt
            : 0
        const count =
          typeof data.count === 'number' ? data.count : 0
        return {
          count,
          windowStartedAt,
          inCurrentWindow:
            now - windowStartedAt <
            DISCUSSION_EMAIL_RATE_WINDOW,
        }
      })
      if (
        states.some(
          (state) =>
            state.inCurrentWindow &&
            state.count >= MAX_DISCUSSION_EMAILS_PER_WINDOW
        )
      ) {
        return false
      }
      refs.forEach((ref, index) => {
        const state = states[index]
        transaction.set(ref, {
          windowStartedAt: state.inCurrentWindow
            ? state.windowStartedAt
            : now,
          count: state.inCurrentWindow
            ? state.count + 1
            : 1,
          expiresAt: new Date(
            now + DISCUSSION_EMAIL_RATE_WINDOW
          ),
          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        })
      })
      return true
    })
}

function projectInviteTokenParts(value) {
  if (typeof value !== 'string') return null
  const match = value.match(
    /^([a-f0-9]{64})\.([A-Za-z0-9_-]{20,})$/
  )
  return match ? { id: match[1], secret: match[2] } : null
}

const NEWSLETTER_SITE_URL = 'https://sciteens.org'
const NEWSLETTER_FUNCTION_URL =
  'https://us-central1-directed-relic-266701.cloudfunctions.net/newsletter'
const NEWSLETTER_ORIGINS = [
  'https://sciteens.org',
  'http://localhost:3000',
]
const NEWSLETTER_CONFIRMATION_WINDOW = 24 * 60 * 60 * 1000
const NEWSLETTER_GLOBAL_RATE_LIMIT = 100
const NEWSLETTER_RATE_WINDOW = 15 * 60 * 1000
const NEWSLETTER_EMAIL_RATE_WINDOW = 60 * 60 * 1000
const SIGNUP_EMAIL_RATE_WINDOW = 24 * 60 * 60 * 1000
const SIGNUP_EMAIL_LEASE_WINDOW = 5 * 60 * 1000

function newsletterPage(locale, page, status = '') {
  const prefix = locale === 'en' ? '' : `/${locale}`
  const url = `${NEWSLETTER_SITE_URL}${prefix}/newsletter/${page}`
  return status ? `${url}?status=${status}` : url
}

function newsletterConfirmationLink(
  subscriber,
  confirmationToken,
  unsubscribeToken,
  locale
) {
  const link = newsletterLink(
    'confirm',
    subscriber,
    confirmationToken,
    locale
  )
  return `${link}&unsubscribeToken=${encodeURIComponent(
    unsubscribeToken
  )}`
}

function newsletterUnsubscribePage(
  locale,
  subscriber,
  token
) {
  return `${newsletterPage(
    locale,
    'unsubscribe'
  )}#${new URLSearchParams({
    subscriber,
    token,
  }).toString()}`
}

function newsletterLink(action, subscriber, token, locale) {
  return `${NEWSLETTER_FUNCTION_URL}?${new URLSearchParams({
    action,
    subscriber,
    token,
    locale,
  }).toString()}`
}

async function isNewsletterRateLimited(
  key,
  maximum,
  windowMs
) {
  const now = Date.now()
  const ref = admin
    .firestore()
    .collection('newsletter-rate-limits')
    .doc(key)

  return admin
    .firestore()
    .runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref)
      const data = snapshot.exists ? snapshot.data() : {}
      const startedAt =
        typeof data.windowStartedAt === 'number'
          ? data.windowStartedAt
          : 0
      const count =
        typeof data.count === 'number' ? data.count : 0

      if (now - startedAt >= windowMs) {
        transaction.set(ref, {
          windowStartedAt: now,
          count: 1,
          expiresAt: new Date(now + windowMs),
          updatedAt:
            admin.firestore.FieldValue.serverTimestamp(),
        })
        return false
      }

      if (count >= maximum) return true

      transaction.update(ref, {
        count: count + 1,
        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      })
      return false
    })
}

async function reserveSignupEmailDelivery(email, uid) {
  const now = Date.now()
  const ref = admin
    .firestore()
    .collection('signup-email-deliveries')
    .doc(hashNewsletterValue(email))
  const status = await admin
    .firestore()
    .runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref)
      const data = snapshot.exists ? snapshot.data() : {}
      const startedAt =
        typeof data.windowStartedAt === 'number'
          ? data.windowStartedAt
          : 0
      const leaseUntil =
        typeof data.leaseUntil === 'number'
          ? data.leaseUntil
          : 0
      const active =
        now - startedAt < SIGNUP_EMAIL_RATE_WINDOW

      if (active && data.uid !== uid) return 'blocked'
      if (active && data.completed === true) {
        return 'completed'
      }
      if (active && leaseUntil > now) return 'in_progress'

      transaction.set(ref, {
        uid,
        completed: false,
        windowStartedAt: active ? startedAt : now,
        leaseUntil: now + SIGNUP_EMAIL_LEASE_WINDOW,
        expiresAt: new Date(now + SIGNUP_EMAIL_RATE_WINDOW),
        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      })
      return 'acquired'
    })
  return { status, ref }
}

function setNewsletterCors(req, res) {
  const origin = req.get('Origin')
  if (origin && !NEWSLETTER_ORIGINS.includes(origin)) {
    res
      .status(403)
      .json({ ok: false, error: 'invalid_origin' })
    return false
  }

  if (origin) {
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Vary', 'Origin')
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set('Access-Control-Allow-Headers', 'Content-Type')
  return true
}

function setProjectInviteCors(req, res) {
  const origin = req.get('Origin')
  if (origin && !NEWSLETTER_ORIGINS.includes(origin)) {
    res
      .status(403)
      .json({ ok: false, error: 'invalid_origin' })
    return false
  }
  if (origin) {
    res.set('Access-Control-Allow-Origin', origin)
    res.set('Vary', 'Origin')
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.set(
    'Access-Control-Allow-Headers',
    'Authorization, Content-Type'
  )
  return true
}

// Post to the SciTeens Slack webhook. The webhook URL is stored in
// the SLACK_WEBHOOK secret (set via
// `firebase functions:secrets:set SLACK_WEBHOOK`). Never hardcode
// the webhook — the repo is public.
const slackWebhook = defineSecret('SLACK_WEBHOOK')
async function slackPost(text) {
  try {
    const webhook = slackWebhook.value()
    if (!webhook) {
      console.warn(
        'Slack webhook not configured; skipping post'
      )
      return
    }
    // Node's built-in fetch rather than axios: one JSON POST does not
    // justify a dependency whose 0.x line carries a standing pile of
    // SSRF, proxy-credential-leak, and prototype-pollution advisories.
    const res = await fetch(webhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10000),
    })
    // fetch resolves on any status, unlike the axios call this
    // replaced. A revoked webhook answers 403/404/410, so without
    // this the alerting channel would go quiet with nothing logged.
    if (!res.ok) {
      console.error(
        'Slack post failed:',
        res.status,
        await res.text().catch(() => '')
      )
    }
  } catch (err) {
    console.error('Slack post failed:', err)
  }
}

// Slugify
let slugify

/*
    Function newProject()
    
    Handles the operations necessary to log the new project
    and notify user's subscribed to the project of its update.

*/
exports.newProject = functions
  .runWith({ secrets: [meiliMasterKey] })
  .firestore.document('projects/{projectID}')
  .onCreate((snap) => indexProject(snap.id, snap.data()))

/*
    Function updateProject()

    Keeps the Meilisearch `projects` index in sync whenever a
    project's fields are edited.
*/
exports.updateProject = functions
  .runWith({ secrets: [meiliMasterKey] })
  .firestore.document('projects/{projectID}')
  .onUpdate((change) =>
    indexProject(change.after.id, change.after.data())
  )

/*
    Function deleteProject()
    
    Handles the operations necessary when a project is deleted,
    such as removing it from the Meilisearch index.

*/

exports.deleteProject = functions
  .runWith({ secrets: [meiliMasterKey] })
  .firestore.document('projects/{projectID}')
  .onDelete(async (event, context) => {
    async function deleteCollection(
      db,
      collectionPath,
      batchSize
    ) {
      const collectionRef = db.collection(collectionPath)
      const query = collectionRef
        .orderBy('__name__')
        .limit(batchSize)

      return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject)
      })
    }

    async function deleteQueryBatch(db, query, resolve) {
      const snapshot = await query.get()

      const batchSize = snapshot.size
      if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve()
        return
      }

      // Delete documents in a batch
      const batch = db.batch()
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })
      await batch.commit()

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      process.nextTick(() => {
        deleteQueryBatch(db, query, resolve)
      })
    }
    // Delete the discussion subcollection
    await deleteCollection(
      admin.firestore(),
      `/projects/${context.params.projectID}/discussion`,
      500
    )

    // Delete the files subcollection (Firestore records pointing
    // at the project's Storage objects)
    await deleteCollection(
      admin.firestore(),
      `/projects/${context.params.projectID}/files`,
      500
    )

    // Delete the upvotes subcollection (one-doc-per-supporter records)
    await deleteCollection(
      admin.firestore(),
      `/projects/${context.params.projectID}/upvotes`,
      500
    )

    // Delete the underlying Storage objects the files subcollection
    // pointed at. Logged, not thrown, so a Storage-side failure never
    // fails the trigger — the Firestore doc is already gone by now.
    try {
      await admin
        .storage()
        .bucket()
        .deleteFiles({
          prefix: `projects/${context.params.projectID}/`,
        })
    } catch (err) {
      console.error(
        `deleteProject: failed to delete Storage objects for projects/${context.params.projectID}/`,
        err
      )
    }

    await deleteProjectFromIndex(context.params.projectID)
  })

/*
    Function deleteProfile()
    
    Handles the operations necessary when a profile is deleted,
    such as removing its files subcollection, Storage objects,
    and profile-pictures record.

*/

exports.deleteProfile = functions.firestore
  .document('profiles/{uid}')
  .onDelete(async (event, context) => {
    async function deleteCollection(
      db,
      collectionPath,
      batchSize
    ) {
      const collectionRef = db.collection(collectionPath)
      const query = collectionRef
        .orderBy('__name__')
        .limit(batchSize)

      return new Promise((resolve, reject) => {
        deleteQueryBatch(db, query, resolve).catch(reject)
      })
    }

    async function deleteQueryBatch(db, query, resolve) {
      const snapshot = await query.get()

      const batchSize = snapshot.size
      if (batchSize === 0) {
        // When there are no documents left, we are done
        resolve()
        return
      }

      // Delete documents in a batch
      const batch = db.batch()
      snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref)
      })
      await batch.commit()

      // Recurse on the next process tick, to avoid
      // exploding the stack.
      process.nextTick(() => {
        deleteQueryBatch(db, query, resolve)
      })
    }

    // Delete the files subcollection (Firestore records pointing
    // at the profile's Storage objects)
    await deleteCollection(
      admin.firestore(),
      `/profiles/${context.params.uid}/files`,
      500
    )

    // Delete the underlying Storage objects the files subcollection
    // pointed at. Logged, not thrown, so a Storage-side failure never
    // fails the trigger — the Firestore doc is already gone by now.
    try {
      await admin
        .storage()
        .bucket()
        .deleteFiles({
          prefix: `profiles/${context.params.uid}/`,
        })
    } catch (err) {
      console.error(
        `deleteProfile: failed to delete Storage objects for profiles/${context.params.uid}/`,
        err
      )
    }

    // Delete the corresponding profile-pictures record, if any
    try {
      await admin
        .firestore()
        .collection('profile-pictures')
        .doc(context.params.uid)
        .delete()
    } catch (err) {
      console.error(
        `deleteProfile: failed to delete profile-pictures/${context.params.uid}`,
        err
      )
    }

    // Delete the corresponding profiles-private record (race/gender/
    // birthday), if any
    try {
      await admin
        .firestore()
        .collection('profiles-private')
        .doc(context.params.uid)
        .delete()
    } catch (err) {
      console.error(
        `deleteProfile: failed to delete profiles-private/${context.params.uid}`,
        err
      )
    }
  })

async function sendNewUserEmails(user) {
  const verificationLink = await admin
    .auth()
    .generateEmailVerificationLink(user.email, {
      url: 'https://sciteens.org/',
      handleCodeInApp: false,
    })
  const verificationEmail = {
    to: user.email,
    toName: user.displayName || user.email,
    subject: 'Verify Email',
    react: verifyEmailTemplate({ link: verificationLink }),
  }

  const {
    pageUrl: welcomeUnsubscribeUrl,
    actionUrl: welcomeUnsubscribeAction,
  } = await buildUnsubscribeLinks(
    user.uid,
    EMAIL_CATEGORIES.GENERAL
  )
  const welcomeEmail = {
    to: user.email,
    toName: user.displayName || user.email,
    subject: 'Welcome to SciTeens!',
    react: welcomeTemplate({
      displayName: user.displayName,
      unsubscribeUrl: welcomeUnsubscribeUrl,
    }),
    category: EMAIL_CATEGORIES.GENERAL,
    uid: user.uid,
    unsubscribeActionUrl: welcomeUnsubscribeAction,
  }
  await Promise.all([
    sendEmail(verificationEmail),
    sendEmail(welcomeEmail),
  ])
}

/*
    Function newUser()

    Handles the operations necessary when a user joins
    the website
*/

exports.newUser = functions
  .runWith({
    secrets: [resendApiKey],
  })
  .auth.user()
  .onCreate(async (user) => {
    if (!user.email) {
      console.warn(
        'New user has no email. Contact and email delivery skipped.'
      )
      return 'Success!'
    }

    const writes = [
      admin
        .firestore()
        .collection('emails')
        .doc(user.uid)
        .set({
          email: user.email,
        }),
    ]
    if (user.photoURL) {
      writes.push(
        admin
          .firestore()
          .collection('profile-pictures')
          .doc(user.uid)
          .set({
            picture: user.photoURL,
          })
      )
    }
    await Promise.all(writes)

    const normalizedEmail = normalizeNewsletterEmail(
      user.email
    )
    if (!normalizedEmail) {
      console.warn('Signup email address is invalid.')
      return 'Success!'
    }
    const delivery = await reserveSignupEmailDelivery(
      normalizedEmail,
      user.uid
    )
    if (delivery.status === 'in_progress') {
      throw new Error(
        'Signup email delivery is in progress.'
      )
    }
    if (delivery.status === 'blocked') {
      console.warn(
        'Signup email delivery was rate limited.'
      )
      return 'Success!'
    }
    if (delivery.status === 'completed') return 'Success!'

    const [firstName, ...rest] = (
      user.displayName || ''
    ).split(' ')
    await addTransactionalContact({
      email: user.email,
      firstName,
      lastName: rest.join(' '),
    })
    await sendNewUserEmails(user)
    await delivery.ref.update({
      completed: true,
      leaseUntil: admin.firestore.FieldValue.delete(),
      updatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    })
    return 'Success!'
  })

exports.deleteUserArtifacts = functions.auth
  .user()
  .onDelete(async (user) => {
    const db = admin.firestore()
    const batch = db.batch()
    batch.delete(db.collection('emails').doc(user.uid))
    batch.delete(
      db.collection('profile-pictures').doc(user.uid)
    )
    await batch.commit()
  })

/*
    Function newProfile()

    Handles the operations necessary when a user joins
    the website (related to their firebase profile)
*/

exports.newProfile = functions.firestore
  .document('profiles/{profileID}')
  .onCreate(async (profile) => {
    const id = profile.id
    const data = { ...profile.data() }

    // Everyone starts subscribed to every email category.
    await admin
      .firestore()
      .collection('profiles')
      .doc(id)
      .set(
        {
          emailSubscriptions: {
            [EMAIL_CATEGORIES.GENERAL]: true,
            [EMAIL_CATEGORIES.PROGRAMS]: true,
          },
        },
        { merge: true }
      )

    switch (data.position) {
      case 'Educator':
      case 'Professional':
      case 'Researcher':
      case 'Prefer not to answer':
        await admin
          .auth()
          .setCustomUserClaims(id, { mentor: true })
        break
      default:
        break
    }
  })

/*
    Function newProgram()
    
    Handles the operations necessary to log the new program.
*/

exports.newProgram = functions.firestore
  .document('programs/{programID}')
  .onCreate((event) => {
    let id = event.id
    let data = { ...event.data() }

    // Add the minified version of the program to firebase
    return admin
      .firestore()
      .collection('programs-minified')
      .doc(id)
      .set({
        name: data.name,
        loc: data.loc,
        img: data.img,
        about: data.about,
        start: data.start,
        end: data.end,
        app: data.app,
        coord: data.coord,
        geo: data.geo,
        slug: data.slug,
        grade_h: data.grade_h,
        grade_l: data.grade_l,
        fields: data.fields,
        hits: data.hits,
      })
  })

/*
    Function deleteProgram()
    
    Handles the operations necessary when a program is deleted,
    such as removing its index from Algolia
*/
exports.deleteProgram = functions.firestore
  .document('programs/{programID}')
  .onDelete((event) => {
    let id = event.id

    // Remove the minified version of the project
    admin
      .firestore()
      .collection('programs-minified')
      .doc(id)
      .delete()
  })

/*
    Function updateProgram()

    Handles the operations necessary when a program is 
    updated, 

*/

exports.updateProgram = functions.firestore
  .document('programs/{programID}')
  .onUpdate((event) => {
    let id = event.after.id
    let data = { ...event.after.data() }
    let data_minified = {
      name: data.name,
      loc: data.loc,
      img: data.img,
      about: data.about,
      start: data.start,
      end: data.end,
      app: data.app,
      coord: data.coord,
      _geoloc: data.coord,
      geo: data.geo,
      slug: data.slug,
      grade_h: data.grade_h,
      grade_l: data.grade_l,
      fields: data.fields,
      hits: data.hits,
    }
    // Update minified version of the program
    admin
      .firestore()
      .collection('programs-minified')
      .doc(id)
      .update({
        name: data.name,
        loc: data.loc,
        img: data.img,
        about: data.about,
        start: data.start,
        end: data.end,
        app: data.app,
        coord: data.coord,
        _geoloc: data.coord,
        geo: data.geo,
        slug: data.slug,
        grade_h: data.grade_h,
        grade_l: data.grade_l,
        fields: data.fields,
        hits: data.hits,
      })
  })

/*
    Function newDiscussion()

    Handles new discussion being added to a project 

*/

exports.newDiscussion = functions
  .runWith({
    secrets: [resendApiKey],
  })
  .firestore.document(
    'projects/{projectID}/discussion/{feedbackID}'
  )
  .onCreate(async (event, context) => {
    const data = event.data()
    const replyId = data.reply_to_id
    const senderUid = data.uid
    if (
      typeof replyId !== 'string' ||
      !/^[A-Za-z0-9]{1,128}$/.test(replyId) ||
      typeof senderUid !== 'string'
    ) {
      return
    }

    const db = admin.firestore()
    const projectId = context.params.projectID
    const [projectSnapshot, originalComment] =
      await Promise.all([
        db.collection('projects').doc(projectId).get(),
        db
          .doc(
            `projects/${projectId}/discussion/${replyId}`
          )
          .get(),
      ])
    if (
      !projectSnapshot.exists ||
      !originalComment.exists
    ) {
      return
    }

    const originalUid = originalComment.data().uid
    if (
      typeof originalUid !== 'string' ||
      originalUid === senderUid ||
      !(await reserveDiscussionEmailQuota(
        senderUid,
        originalUid
      ))
    ) {
      return
    }

    const [sender, recipient] = await Promise.all([
      admin.auth().getUser(senderUid),
      admin.auth().getUser(originalUid),
    ])
    if (!recipient.email) return

    console.log(
      'Sending discussion email to user ' + originalUid
    )
    return sendEmail({
      to: recipient.email,
      toName: recipient.displayName,
      subject: 'New Feedback',
      react: newFeedbackTemplate({
        studentOrMentor:
          sender.customClaims &&
          sender.customClaims['mentor']
            ? 'mentor'
            : 'student',
        projectLink: `https://sciteens.org/project/${projectId}#${event.id}`,
      }),
      category: EMAIL_CATEGORIES.GENERAL,
      uid: originalUid,
    })
  })

/*
    Function scheduledProgramEmailer()

    Runs every day at 12:05 AM Eastern. Fetches events from the
    event-applications collection, and determines if any events have
    upcoming deadlines. If so, it informs all subscribers via email and
    then deletes.
*/
exports.scheduledProgramEmailer = functions
  .runWith({
    secrets: [resendApiKey],
  })
  .pubsub.schedule('5 0 * * *')
  .timeZone('America/New_York') // Users can choose timezone - default is America/Los_Angeles
  .onRun((context) => {
    // Fetch the current Unix Timestamp
    let date = new Date().getTime()
    admin
      .firestore()
      .collection('programs')
      .orderBy('application')
      .startAt(0)
      .endAt(date + 604800000)
      .get()
      .then((res) => {
        res.forEach((event) => {
          // Send an email to each subscriber
          let subscribers = event.data().subscribers
          let link =
            'https://sciteens.org/program/' + event.id

          subscribers.forEach((sub) => {
            // Fetch the user's email
            admin
              .auth()
              .getUser(sub)
              .then(async (user) => {
                const {
                  pageUrl: unsubscribeUrl,
                  actionUrl: unsubscribeActionUrl,
                } = await buildUnsubscribeLinks(
                  user.uid,
                  EMAIL_CATEGORIES.PROGRAMS
                )
                await sendEmail({
                  to: user.email,
                  toName: user.displayName
                    ? user.displayName
                    : user.email,
                  subject: 'Upcoming Program Application',
                  react: upcomingProgramTemplate({
                    link,
                    unsubscribeUrl,
                  }),
                  category: EMAIL_CATEGORIES.PROGRAMS,
                  uid: user.uid,
                  unsubscribeActionUrl,
                })
                // Add notification
                admin
                  .firestore()
                  .collection('notifications')
                  .doc(user.uid)
                  .update({
                    notifications:
                      admin.firestore.FieldValue.arrayUnion(
                        {
                          date: new Date().getTime(),
                          message:
                            'Upcoming program application for ' +
                            event.data().name,
                          type: 'program',
                          program_id: event.id,
                          program_slug: event.data().slug,
                          seen: false,
                        }
                      ),
                  })
              })
          })
        })
      })
    return null
  })

/*
    Function unsubscribe()

    Public HTTPS endpoint backing per-category email unsubscribe links
    (see functions/lib/resend.js#buildUnsubscribeLinks). Verifies the
    opaque per-user token stored in emails/{uid}.unsubscribeToken, then
    reads/writes profiles/{uid}.emailSubscriptions — the source of
    truth sendEmail() gates on — and best-effort mirrors the change
    into the matching Resend audience. Also serves ?action=status so
    the /unsubscribe page can render every category's current state.
*/
exports.unsubscribe = functions
  .runWith({
    secrets: [resendApiKey],
  })
  .https.onRequest(async (req, res) => {
    const allowedOrigins = [
      'https://sciteens.org',
      'http://localhost:3000',
    ]
    const origin = req.get('Origin')
    if (allowedOrigins.includes(origin)) {
      res.set('Access-Control-Allow-Origin', origin)
    }
    res.set(
      'Access-Control-Allow-Methods',
      'GET, POST, OPTIONS'
    )
    res.set('Access-Control-Allow-Headers', 'Content-Type')
    if (req.method === 'OPTIONS') {
      return res.status(204).send('')
    }

    const source =
      req.method === 'POST' &&
      req.body &&
      Object.keys(req.body).length
        ? req.body
        : req.query
    const uid =
      typeof source.uid === 'string' ? source.uid : ''
    const token =
      typeof source.token === 'string' ? source.token : ''
    const category =
      typeof source.category === 'string'
        ? source.category
        : ''
    // RFC 8058 one-click POSTs only send `List-Unsubscribe=One-Click`
    // in the body — the real intent lives in the query string
    // embedded in the List-Unsubscribe header, so default to
    // unsubscribing.
    const action =
      typeof source.action === 'string'
        ? source.action
        : 'unsubscribe'

    if (!(await verifyUnsubscribeToken(uid, token))) {
      return res
        .status(401)
        .json({ ok: false, error: 'invalid_token' })
    }

    if (action === 'status') {
      const subscriptions = await getSubscriptions(uid)
      return res
        .status(200)
        .json({ ok: true, subscriptions })
    }

    if (!EMAIL_CATEGORY_VALUES.includes(category)) {
      return res
        .status(400)
        .json({ ok: false, error: 'invalid_category' })
    }
    if (
      action !== 'subscribe' &&
      action !== 'unsubscribe'
    ) {
      return res
        .status(400)
        .json({ ok: false, error: 'invalid_action' })
    }

    const subscribed = action === 'subscribe'
    await setSubscription(uid, category, subscribed)

    const emailSnap = await admin
      .firestore()
      .collection('emails')
      .doc(uid)
      .get()
    const email = emailSnap.exists
      ? emailSnap.data().email
      : null
    if (email) {
      await setResendCategorySubscription({
        email,
        category,
        unsubscribed: !subscribed,
      })
    }

    return res
      .status(200)
      .json({ ok: true, category, subscribed })
  })

exports.newsletter = functions
  .runWith({
    secrets: [resendApiKey],
  })
  .https.onRequest(async (req, res) => {
    if (!setNewsletterCors(req, res)) return
    if (req.method === 'OPTIONS') {
      return res.status(204).send('')
    }

    const action =
      typeof req.query.action === 'string'
        ? req.query.action
        : ''
    const locale = newsletterLocale(req.query.locale)

    if (req.method === 'GET' && action === 'confirm') {
      const subscriber =
        typeof req.query.subscriber === 'string'
          ? req.query.subscriber
          : ''
      const token =
        typeof req.query.token === 'string'
          ? req.query.token
          : ''
      const unsubscribeToken =
        typeof req.query.unsubscribeToken === 'string'
          ? req.query.unsubscribeToken
          : ''
      if (!isNewsletterSubscriberId(subscriber)) {
        return res.redirect(
          303,
          newsletterPage(locale, 'confirmed', 'invalid')
        )
      }
      const ref = admin
        .firestore()
        .collection('newsletter-subscribers')
        .doc(subscriber)
      const snapshot = await ref.get()
      const data = snapshot.exists ? snapshot.data() : null
      const expiresAt =
        data?.confirmationExpiresAt?.toMillis?.() || 0
      const confirmationHash = hashNewsletterValue(token)

      if (
        data?.status === 'subscribed' &&
        tokensMatch(
          data.unsubscribeTokenHash,
          hashNewsletterValue(unsubscribeToken)
        )
      ) {
        return res.redirect(
          303,
          newsletterPage(locale, 'confirmed')
        )
      }

      if (
        !data ||
        !tokensMatch(
          data.confirmationTokenHash,
          confirmationHash
        ) ||
        !tokensMatch(
          data.unsubscribeTokenHash,
          hashNewsletterValue(unsubscribeToken)
        ) ||
        expiresAt < Date.now()
      ) {
        return res.redirect(
          303,
          newsletterPage(locale, 'confirmed', 'invalid')
        )
      }

      if (data.status !== 'subscribed') {
        const unsubscribeUrl = newsletterUnsubscribePage(
          locale,
          subscriber,
          unsubscribeToken
        )
        try {
          const contactAdded = await addNewsletterContact({
            email: data.email,
            properties: {
              newsletter_unsubscribe_url: unsubscribeUrl,
            },
          })
          if (!contactAdded) {
            throw new Error(
              'Newsletter contact setup failed.'
            )
          }
          await ref.update({
            status: 'subscribed',
            confirmedAt:
              admin.firestore.FieldValue.serverTimestamp(),
            confirmationTokenHash:
              admin.firestore.FieldValue.delete(),
            confirmationExpiresAt:
              admin.firestore.FieldValue.delete(),
            resendNewsletterSyncedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          })
        } catch (err) {
          console.error(
            'Newsletter contact setup failed:',
            err
          )
          return res.redirect(
            303,
            newsletterPage(
              locale,
              'confirmed',
              'delivery_failed'
            )
          )
        }

        try {
          await sendEmail({
            to: data.email,
            subject:
              'Your SciTeens newsletter subscription',
            react: newsletterWelcomeTemplate({
              unsubscribeUrl,
            }),
            unsubscribeActionUrl: newsletterLink(
              'unsubscribe',
              subscriber,
              unsubscribeToken,
              locale
            ),
          })
        } catch (err) {
          console.error(
            'Newsletter welcome email failed:',
            err
          )
        }
      }

      return res.redirect(
        303,
        newsletterPage(locale, 'confirmed')
      )
    }

    if (req.method === 'GET' && action === 'unsubscribe') {
      const subscriber =
        typeof req.query.subscriber === 'string'
          ? req.query.subscriber
          : ''
      const token =
        typeof req.query.token === 'string'
          ? req.query.token
          : ''
      return res.redirect(
        303,
        newsletterUnsubscribePage(locale, subscriber, token)
      )
    }

    if (req.method !== 'POST') {
      return res
        .status(405)
        .json({ ok: false, error: 'method_not_allowed' })
    }

    if (action === 'unsubscribe') {
      const subscriber =
        typeof req.query.subscriber === 'string'
          ? req.query.subscriber
          : ''
      const token =
        typeof req.query.token === 'string'
          ? req.query.token
          : ''
      if (!isNewsletterSubscriberId(subscriber)) {
        return res
          .status(401)
          .json({ ok: false, error: 'invalid_token' })
      }
      const ref = admin
        .firestore()
        .collection('newsletter-subscribers')
        .doc(subscriber)
      const snapshot = await ref.get()
      const data = snapshot.exists ? snapshot.data() : null

      if (!matchesNewsletterUnsubscribeToken(data, token)) {
        return res
          .status(401)
          .json({ ok: false, error: 'invalid_token' })
      }

      await ref.update({
        status: 'unsubscribed',
        unsubscribedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      })
      await setNewsletterContactSubscription({
        email: data.email,
        unsubscribed: true,
      })
      return res.status(200).json({ ok: true })
    }

    const contentLength = req.get('Content-Length')
    if (
      contentLength &&
      (!Number.isSafeInteger(Number(contentLength)) ||
        Number(contentLength) > 1024)
    ) {
      return res
        .status(413)
        .json({ ok: false, error: 'payload_too_large' })
    }

    if (
      !req.body ||
      typeof req.body !== 'object' ||
      Array.isArray(req.body)
    ) {
      return res
        .status(400)
        .json({ ok: false, error: 'invalid_request' })
    }

    const email = normalizeNewsletterEmail(req.body.email)
    if (!email) {
      return res
        .status(400)
        .json({ ok: false, error: 'invalid_email' })
    }
    if (
      typeof req.body.website === 'string' &&
      req.body.website.length > 0
    ) {
      return res.status(202).json({ ok: true })
    }

    const globalLimited = await isNewsletterRateLimited(
      'global-signup',
      NEWSLETTER_GLOBAL_RATE_LIMIT,
      NEWSLETTER_RATE_WINDOW
    )
    if (globalLimited) {
      return res
        .status(429)
        .json({ ok: false, error: 'rate_limited' })
    }

    const emailLimited = await isNewsletterRateLimited(
      `email-${hashNewsletterValue(email)}`,
      3,
      NEWSLETTER_EMAIL_RATE_WINDOW
    )
    if (emailLimited) {
      return res
        .status(429)
        .json({ ok: false, error: 'rate_limited' })
    }

    const subscriber = hashNewsletterValue(email)
    const confirmationToken = createNewsletterToken()
    const unsubscribeToken = createNewsletterToken()
    const subscriberLocale = newsletterLocale(
      req.body.locale
    )
    const ref = admin
      .firestore()
      .collection('newsletter-subscribers')
      .doc(subscriber)
    const existing = await ref.get()

    if (
      existing.exists &&
      existing.data().status === 'subscribed'
    ) {
      return res.status(200).json({ ok: true })
    }

    await ref.set(
      {
        email,
        status: 'pending',
        locale: subscriberLocale,
        confirmationTokenHash: hashNewsletterValue(
          confirmationToken
        ),
        confirmationExpiresAt: new Date(
          Date.now() + NEWSLETTER_CONFIRMATION_WINDOW
        ),
        unsubscribeTokenHash: hashNewsletterValue(
          unsubscribeToken
        ),
        updatedAt:
          admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    )

    try {
      await sendEmail({
        to: email,
        subject:
          'Confirm your SciTeens newsletter subscription',
        react: newsletterConfirmationTemplate({
          link: newsletterConfirmationLink(
            subscriber,
            confirmationToken,
            unsubscribeToken,
            subscriberLocale
          ),
        }),
      })
    } catch (err) {
      console.error(
        'Newsletter confirmation email failed:',
        err
      )
      return res
        .status(503)
        .json({ ok: false, error: 'delivery_failed' })
    }

    return res.status(200).json({ ok: true })
  })

/*
    Function fileUpload()

    Runs every time a file is uploaded. Scans images and PDFs
    for inappropriate content (adult, violent, spoof, or racy)
    via Cloud Vision SafeSearch, and deletes the file if any is
    detected.

    Images use the synchronous safeSearchDetection endpoint.
    PDFs use batchAnnotateFiles (files:annotate), which runs
    SAFE_SEARCH_DETECTION on up to 5 pages per file and returns
    per-page results inline. If any scanned page is flagged, the
    entire file is deleted.
*/

const sharp = require('sharp')
const {
  isResizeEligiblePath,
  getResizeTarget,
  WEBP_QUALITY,
} = require('./lib/imageOptimize')

// Resizes/recompresses an image object in place to WebP, per the
// target dimensions from lib/imageOptimize.js. Overwrites the SAME
// object path with `.save()` rather than deleting + re-uploading
// under a new name, preserving (or minting, if absent) the object's
// `firebaseStorageDownloadTokens` metadata — that's what keeps the
// download URL the client already captured (it calls
// `getDownloadURL()` right after `uploadBytes()`, before this trigger
// has necessarily run) valid after the bytes underneath it change.
// The `optimized: 'true'` custom-metadata flag it sets is what the
// top of onFinalize below checks to avoid reprocessing its own
// overwrite in an infinite trigger loop.
async function optimizeImageObject(object) {
  const bucket = admin.storage().bucket(object.bucket)
  const file = bucket.file(object.name)

  const [buffer] = await file.download()
  const target = getResizeTarget(object.name)
  const webpBuffer = await sharp(buffer)
    .resize(target)
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()

  const [freshMetadata] = await file.getMetadata()
  const existingTokens =
    freshMetadata.metadata?.firebaseStorageDownloadTokens
  const token = existingTokens
    ? existingTokens.split(',')[0]
    : crypto.randomUUID()

  await file.save(webpBuffer, {
    contentType: 'image/webp',
    metadata: {
      cacheControl: freshMetadata.cacheControl,
      metadata: {
        ...freshMetadata.metadata,
        optimized: 'true',
        firebaseStorageDownloadTokens: token,
      },
    },
  })

  console.log(
    `Optimized ${object.name}: ${buffer.length}B -> ${webpBuffer.length}B`
  )
}

exports.fileUpload = functions.storage
  .object()
  .onFinalize(async (object) => {
    // Client metadata is untrusted. Every generation must pass
    // SafeSearch before the optimized marker can suppress another
    // resize.

    const contentType = object.contentType
    if (!contentType) {
      return console.log('No content type')
    }

    const isImage = contentType.startsWith('image/')
    const isPdf = contentType === 'application/pdf'
    if (!isImage && !isPdf) {
      return console.log(
        'Unsupported type for SafeSearch: ' + contentType
      )
    }

    // Likelihood levels the API may return, ordered from least to
    // most likely. Anything above VERY_UNLIKELY is treated as a hit.
    const SAFE_STRINGS = ['UNLIKELY', 'VERY_UNLIKELY']

    function isSafe(annotation) {
      return (
        SAFE_STRINGS.indexOf(annotation.adult) >= 0 &&
        SAFE_STRINGS.indexOf(annotation.spoof) >= 0 &&
        SAFE_STRINGS.indexOf(annotation.violence) >= 0 &&
        SAFE_STRINGS.indexOf(annotation.racy) >= 0
      )
    }

    const visionClient = new vision.ImageAnnotatorClient()
    let safe = false

    if (isImage) {
      const [data] = await visionClient.safeSearchDetection(
        `gs://${object.bucket}/${object.name}`
      )
      safe = isSafe(data.safeSearchAnnotation)
    } else {
      // files:annotate (synchronous) requires inline file content
      // rather than a GCS URI, so download the object first.
      const [file] = await admin
        .storage()
        .bucket(object.bucket)
        .file(object.name)
        .download()

      // batchAnnotateFiles scans up to 5 pages per file; if any
      // page is flagged, the whole file is rejected. PDFs uploaded
      // through the client are capped at 8MB by storage.rules, so
      // this covers the vast majority of documents.
      const [result] =
        await visionClient.batchAnnotateFiles({
          requests: [
            {
              inputConfig: {
                mimeType: 'application/pdf',
                content: file,
              },
              features: [{ type: 'SAFE_SEARCH_DETECTION' }],
              pages: [1, 2, 3, 4, 5],
            },
          ],
        })

      const pageResponses = result.responses[0].responses
      safe = pageResponses.every(
        (page) =>
          page.safeSearchAnnotation &&
          isSafe(page.safeSearchAnnotation)
      )
    }

    if (!safe) {
      console.log(
        'Offensive content found in ' +
          object.name +
          '. Deleting...'
      )
      return admin
        .storage()
        .bucket(object.bucket)
        .file(object.name)
        .delete()
    }

    console.log(
      'No offensive content found for ' + object.name
    )
    if (object.metadata?.optimized === 'true') {
      return console.log(
        'Skipping resize for an already-optimized object ' +
          object.name
      )
    }
    // Resize/recompress eligible images in place (see
    // lib/imageOptimize.js). profiles/{uid}/... and
    // projects/{projectId}/... don't need makePublic() or a
    // Firestore write here — the client already wrote the file
    // record + display-photo pointer fields itself right after
    // upload (see pages/profile/[slug]/edit.js,
    // pages/project/create.js, pages/project/[id]/edit.js), keyed to
    // the download-token URL optimizeImageObject() preserves above.
    // A resize failure is logged, not thrown — the unoptimized
    // original stays live rather than the upload silently vanishing.
    if (isImage && isResizeEligiblePath(object.name)) {
      try {
        await optimizeImageObject(object)
      } catch (err) {
        console.error(
          'Failed to optimize image ' +
            object.name +
            ': ' +
            err
        )
      }
      return
    }

    // File passed moderation. Make it public and update the
    // corresponding Firestore record based on the upload path.
    // NOTE: profilephoto/ and project/ are legacy singular prefixes
    // from the original implementation; current client uploads use
    // profiles/ and projects/ (plural) per storage.rules. Only
    // courses/ matches today.
    if (object.name.startsWith('profilephoto/')) {
      let uid = object.name.split('/')[1].split('.')[0]
      return admin
        .storage()
        .bucket(object.bucket)
        .file(object.name)
        .makePublic()
        .then(() => {
          return admin
            .firestore()
            .collection('profile-pictures')
            .doc(uid)
            .set({ picture: object.mediaLink })
        })
        .then(() => {
          console.log(
            'Set the profile photo for user ' + uid
          )
        })
        .catch((err) => {
          console.error(
            'Error setting profile photo: ' + err
          )
        })
    } else if (object.name.startsWith('project/')) {
      let projectId = object.name.split('/')[1]
      return admin
        .storage()
        .bucket(object.bucket)
        .file(object.name)
        .makePublic()
        .then(() => {
          return admin
            .firestore()
            .collection('projects')
            .doc(projectId)
            .update({ photo: object.mediaLink })
        })
        .then(() => {
          console.log(
            'Successfully set project photo for project ' +
              projectId
          )
        })
        .catch((err) => {
          console.error(
            'Unsuccessfully set project photo for project ' +
              projectId +
              ': ' +
              err
          )
        })
    } else if (object.name.startsWith('courses/')) {
      let courseId = object.name.split('/')[1]
      return admin
        .storage()
        .bucket(object.bucket)
        .file(object.name)
        .makePublic()
        .then(() => {
          return admin
            .firestore()
            .collection('courses')
            .doc(courseId)
            .update({ photo: object.mediaLink })
        })
        .then(() => {
          console.log(
            'Set the course photo for course ' + courseId
          )
        })
        .catch((err) => {
          console.error(
            'Error setting course photo: ' + err
          )
        })
    }
  })

exports.acceptProjectInvite = functions.https.onRequest(
  async (req, res) => {
    if (!setProjectInviteCors(req, res)) return
    if (req.method === 'OPTIONS') {
      return res.status(204).send('')
    }
    if (req.method !== 'POST') {
      return res
        .status(405)
        .json({ ok: false, error: 'method_not_allowed' })
    }

    const authorization = req.get('Authorization') || ''
    const idToken = authorization.startsWith('Bearer ')
      ? authorization.slice(7)
      : ''
    let identity
    try {
      identity = await admin.auth().verifyIdToken(idToken)
    } catch {
      return res
        .status(401)
        .json({ ok: false, error: 'invalid_identity' })
    }

    const token = req.body?.token
    const tokenParts = projectInviteTokenParts(token)
    const email = normalizeNewsletterEmail(identity.email)
    if (
      !tokenParts ||
      !email ||
      identity.email_verified !== true
    ) {
      return res
        .status(401)
        .json({ ok: false, error: 'invalid_identity' })
    }

    try {
      const projectId = await admin
        .firestore()
        .runTransaction(async (transaction) => {
          const db = admin.firestore()
          const inviteRef = db
            .collection('project-invite-tokens')
            .doc(tokenParts.id)
          const inviteSnapshot = await transaction.get(
            inviteRef
          )
          if (!inviteSnapshot.exists) {
            throw new Error('invalid_invite')
          }
          const invite = inviteSnapshot.data()
          const expiresAt = invite.expiresAt?.toMillis
            ? invite.expiresAt.toMillis()
            : new Date(invite.expiresAt).getTime()
          if (
            !Number.isFinite(expiresAt) ||
            expiresAt <= Date.now() ||
            !tokensMatch(
              invite.tokenHash,
              hashNewsletterValue(tokenParts.secret)
            ) ||
            !tokensMatch(
              invite.emailHash,
              hashNewsletterValue(email)
            )
          ) {
            throw new Error('invalid_invite')
          }

          const projectRef = db
            .collection('projects')
            .doc(invite.projectId)
          const profileRef = db
            .collection('profiles')
            .doc(identity.uid)
          const [projectSnapshot, profileSnapshot] =
            await Promise.all([
              transaction.get(projectRef),
              transaction.get(profileRef),
            ])
          if (
            !projectSnapshot.exists ||
            !profileSnapshot.exists
          ) {
            throw new Error('invalid_invite')
          }

          const memberUids =
            projectSnapshot.data().member_uids || []
          if (!memberUids.includes(identity.uid)) {
            const profile = profileSnapshot.data()
            transaction.update(projectRef, {
              member_uids:
                admin.firestore.FieldValue.arrayUnion(
                  identity.uid
                ),
              member_arr:
                admin.firestore.FieldValue.arrayUnion({
                  uid: identity.uid,
                  display: profile.display || '',
                  slug: profile.slug || '',
                }),
            })
          }
          transaction.delete(inviteRef)
          return invite.projectId
        })

      return res.status(200).json({ ok: true, projectId })
    } catch {
      return res
        .status(401)
        .json({ ok: false, error: 'invalid_invite' })
    }
  }
)

exports.newProjectInvite = functions
  .runWith({
    secrets: [resendApiKey],
  })
  .firestore.document('project-invites/{projectID}')
  .onCreate(async (event) => {
    const projectId = event.id
    const data = event.data()
    const requestedBy =
      typeof data.requestedBy === 'string'
        ? data.requestedBy
        : ''
    const title = String(data.title ?? '').slice(0, 200)
    const raw = data.emails
    const emails = [
      ...new Set(
        (Array.isArray(raw) ? raw : [])
          .map(normalizeNewsletterEmail)
          .filter(Boolean)
      ),
    ].slice(0, MAX_PROJECT_INVITES)
    const requestRef = admin
      .firestore()
      .collection('project-invites')
      .doc(projectId)

    try {
      if (
        emails.length === 0 ||
        !(await reserveProjectInviteQuota(
          requestedBy,
          projectId,
          emails.length
        ))
      ) {
        console.warn(
          `Rejected a project invitation request for ${projectId}`
        )
        return
      }

      await Promise.all(
        emails.map(async (email) => {
          const inviteId = hashNewsletterValue(
            `${projectId}\0${email}`
          )
          const secret = createNewsletterToken()
          await admin
            .firestore()
            .collection('project-invite-tokens')
            .doc(inviteId)
            .set({
              projectId,
              emailHash: hashNewsletterValue(email),
              tokenHash: hashNewsletterValue(secret),
              expiresAt: new Date(
                Date.now() + PROJECT_INVITE_TOKEN_WINDOW
              ),
              updatedAt:
                admin.firestore.FieldValue.serverTimestamp(),
            })

          await sendEmail({
            to: email,
            subject: 'Project Invitation',
            react: projectUpdateTemplate({
              projectName: title,
              projectLink: `${NEWSLETTER_SITE_URL}/project/invite#${encodeURIComponent(
                `${inviteId}.${secret}`
              )}`,
            }),
          })
        })
      )
    } finally {
      await requestRef.delete()
    }
  })

/*
    Function updateUserStats()

    Runs once every week at 12:05 AM Eastern on Sunday. Counts
    the total number of mentors and students on the platform at 
    any given time. 
*/
exports.updateUserStats = functions
  .runWith({ secrets: [slackWebhook] })
  .pubsub.schedule('0 0 * * 0')
  .timeZone('America/New_York')
  .onRun(async (context) => {
    // Fetch all users on the platform
    var mentors = 0
    var students = 0
    var ethnicities = []
    var genders = []
    var races = []

    await admin
      .auth()
      .listUsers()
      .then(async (res) => {
        res.users.forEach(async (user) => {
          console.log('Checking user ' + user.uid)
          // Determine if the user is a mentor
          if (
            user.customClaims &&
            user.customClaims['mentor']
          ) {
            mentors += 1
          } else {
            students += 1
          }

          await admin
            .firestore()
            .collection('profiles-private')
            .doc(user.uid)
            .get()
            .then((student) => {
              if (student.data()?.race) {
                races.push(student.data().race)
              }

              if (student.data()?.ethnicity) {
                ethnicities.push(student.data().ethnicity)
              }

              if (student.data()?.gender) {
                genders.push(student.data().gender)
              }
            })
        })
      })
      .then(async () => {
        // Update firebase to store the user counts
        await Promise.all([
          admin
            .firestore()
            .collection('statistics')
            .doc('mentors')
            .update({
              count: mentors,
            }),
          admin
            .firestore()
            .collection('statistics')
            .doc('students')
            .update({
              count: students,
            }),
          slackPost(
            `Weekly Update: There are ${students} students and ${mentors} mentors!`
          ),
        ])
      })
      .then(() => {
        // Count occurences for gender, races, and ethnicities
        counts_gender = {}
        counts_ethnicity = {}
        counts_race = {}

        for (const g of genders) {
          counts_gender[g] = counts_gender[g]
            ? counts_gender[g] + 1
            : 1
        }

        for (const r of races) {
          counts_race[r] = counts_race[r]
            ? counts_race[r] + 1
            : 1
        }

        for (const e of ethnicities) {
          counts_ethnicity[e] = counts_ethnicity[e]
            ? counts_ethnicity[e] + 1
            : 1
        }
      })
      .then(async () => {
        await Promise.all([
          admin
            .firestore()
            .collection('statistics')
            .doc('ethnicity')
            .update({
              count: counts_ethnicity,
            }),
          admin
            .firestore()
            .collection('statistics')
            .doc('race')
            .update({
              count: counts_race,
            }),
          admin
            .firestore()
            .collection('statistics')
            .doc('gender')
            .update({
              count: counts_gender,
            }),
        ])
      })
      .then(async () => {
        await slackPost(
          `Weekly Update: Here are the demographic breakdowns.\nEthnicity:${JSON.stringify(
            counts_ethnicity,
            null,
            2
          )}\nGender:${JSON.stringify(
            counts_gender,
            null,
            2
          )}\nRace:${JSON.stringify(counts_race, null, 2)}`
        )
      })
  })
