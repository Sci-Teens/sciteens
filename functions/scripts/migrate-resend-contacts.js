const admin = require('firebase-admin')
const { addNewsletterContact } = require('../lib/plunk')
const {
  createNewsletterToken,
  hashNewsletterValue,
  newsletterLocale,
  normalizeNewsletterEmail,
} = require('../lib/newsletter')

const RESEND_API_URL = 'https://api.resend.com'
const PLUNK_CONTACT_DELAY_MS = 200
const SITE_URL = 'https://sciteens.org'

function wait(milliseconds) {
  return new Promise((resolve) =>
    setTimeout(resolve, milliseconds)
  )
}

function parseArgs(values) {
  const options = {
    project: process.env.GCP_PROJECT_ID || null,
  }
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (value === '--') continue
    if (value === '--project') {
      const project = values[index + 1]
      if (!project || project.startsWith('--')) {
        throw new Error('--project requires a value.')
      }
      options.project = project
      index += 1
      continue
    }
    if (value === '--help' || value === '-h') {
      options.help = true
      continue
    }
    throw new Error(`Unknown option: ${value}`)
  }
  if (!options.help && !options.project) {
    throw new Error('Set --project or GCP_PROJECT_ID.')
  }
  return options
}

function usage() {
  return [
    'Use: pnpm newsletter:migrate-resend -- --project <id>',
    '',
    'Marks every Resend contact that is not globally unsubscribed as',
    'a subscribed Plunk newsletter contact.',
    'Set RESEND_APIKEY and PLUNK_SECRET_KEY in the local shell.',
  ].join('\n')
}

async function listResendContacts(apiKey) {
  const contacts = []
  let after = null
  for (;;) {
    const query = new URLSearchParams({ limit: '100' })
    if (after) query.set('after', after)
    const response = await fetch(
      `${RESEND_API_URL}/contacts?${query.toString()}`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    )
    const body = await response.json().catch(() => null)
    if (!response.ok || !Array.isArray(body?.data)) {
      throw new Error(
        body?.message ||
          body?.error?.message ||
          `Resend contacts request failed (${response.status}).`
      )
    }
    contacts.push(...body.data)
    if (!body.has_more || body.data.length === 0)
      return contacts
    after = body.data.at(-1).id
  }
}

function newsletterUnsubscribeUrl(
  subscriber,
  token,
  locale
) {
  const prefix = locale === 'en' ? '' : `/${locale}`
  return `${SITE_URL}${prefix}/newsletter/unsubscribe?${new URLSearchParams(
    { subscriber, token }
  ).toString()}`
}

async function migrateContact(db, contact, plunkApiKey) {
  const email = normalizeNewsletterEmail(contact.email)
  if (!email || contact.unsubscribed === true)
    return 'skipped'

  const subscriber = hashNewsletterValue(email)
  const ref = db
    .collection('newsletter-subscribers')
    .doc(subscriber)
  const existing = await ref.get()
  const data = existing.exists ? existing.data() : {}
  if (data.status === 'unsubscribed') return 'skipped'

  const token = createNewsletterToken()
  const locale = newsletterLocale(data.locale)
  const contactAdded = await addNewsletterContact(
    {
      email,
      firstName: contact.first_name,
      lastName: contact.last_name,
      properties: {
        newsletter_unsubscribe_url:
          newsletterUnsubscribeUrl(
            subscriber,
            token,
            locale
          ),
      },
    },
    plunkApiKey
  )
  if (!contactAdded) {
    throw new Error(`Cannot migrate ${email} to Plunk.`)
  }
  await ref.set(
    {
      email,
      status: 'subscribed',
      locale,
      unsubscribeTokenHash: hashNewsletterValue(token),
      plunkNewsletterSyncedAt:
        admin.firestore.FieldValue.serverTimestamp(),
      resendMigratedAt:
        admin.firestore.FieldValue.serverTimestamp(),
      updatedAt:
        admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  )
  return 'migrated'
}

async function run() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }
  const resendApiKey = process.env.RESEND_APIKEY
  const plunkApiKey = process.env.PLUNK_SECRET_KEY
  if (!resendApiKey || !plunkApiKey) {
    throw new Error(
      'Set RESEND_APIKEY and PLUNK_SECRET_KEY before migrating contacts.'
    )
  }

  const app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: options.project,
  })
  const contacts = await listResendContacts(resendApiKey)
  let migrated = 0
  let skipped = 0
  for (const contact of contacts) {
    const result = await migrateContact(
      app.firestore(),
      contact,
      plunkApiKey
    )
    if (result === 'migrated') migrated += 1
    else skipped += 1
    await wait(PLUNK_CONTACT_DELAY_MS)
  }
  console.log(
    `Migrated ${migrated} Resend contacts to the newsletter.`
  )
  console.log(
    `Skipped ${skipped} invalid or unsubscribed contacts.`
  )
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
