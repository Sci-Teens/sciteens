const admin = require('firebase-admin')
const { Resend } = require('resend')
const {
  addNewsletterContact,
  addTransactionalContact,
} = require('../lib/resend')
const {
  createNewsletterToken,
  hashNewsletterValue,
  newsletterLocale,
  normalizeNewsletterEmail,
} = require('../lib/newsletter')

const PAGE_SIZE = 100
const SITE_URL = 'https://sciteens.org'
const RESEND_CONTACT_DELAY_MS = 1000

function wait(milliseconds) {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds)
  })
}

async function syncWithRetry(sync) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (await sync()) return true
    if (attempt < 2) {
      await wait(RESEND_CONTACT_DELAY_MS * (attempt + 1))
    }
  }
  return false
}

function parseArgs(values) {
  const options = {
    dryRun: false,
    project: process.env.GCP_PROJECT_ID || null,
  }
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (value === '--') continue
    if (value === '--dry-run') {
      options.dryRun = true
      continue
    }
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
    'Use: pnpm newsletter:sync -- --project <id> [--dry-run]',
    '',
    'The command adds website accounts to the Transactional list.',
    'The command adds confirmed newsletter subscribers to the Newsletter list.',
    'The first sync creates tokens for unmarked newsletter subscribers.',
    'Use --dry-run to count records without changing Resend or Firestore.',
  ].join('\n')
}

function newsletterUnsubscribeUrl(
  subscriber,
  token,
  locale
) {
  const prefix = locale === 'en' ? '' : `/${locale}`
  return `${SITE_URL}${prefix}/newsletter/unsubscribe?${new URLSearchParams(
    {
      subscriber,
      token,
    }
  ).toString()}`
}

async function pageThrough(query, visit) {
  let cursor = null
  let visited = 0
  for (;;) {
    let page = query
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(PAGE_SIZE)
    if (cursor) page = page.startAfter(cursor)
    const snapshot = await page.get()
    if (snapshot.empty) return visited
    for (const doc of snapshot.docs) {
      await visit(doc)
      visited += 1
    }
    cursor = snapshot.docs.at(-1)
  }
}

async function run() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }

  const app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId: options.project,
  })
  const db = admin.firestore(app)
  const apiKey = process.env.RESEND_APIKEY
  if (!options.dryRun && !apiKey) {
    throw new Error(
      'Set RESEND_APIKEY before you sync contacts.'
    )
  }
  const resend = apiKey ? new Resend(apiKey) : null
  let transactional = 0
  let newsletter = 0

  await pageThrough(
    db.collection('emails'),
    async (doc) => {
      const email = normalizeNewsletterEmail(
        doc.data().email
      )
      if (!email) return
      if (!options.dryRun) {
        const synced = await syncWithRetry(() =>
          addTransactionalContact({ email }, resend)
        )
        if (!synced) {
          throw new Error(
            `Cannot sync transactional contact ${doc.id}.`
          )
        }
      }
      transactional += 1
      if (!options.dryRun) {
        await wait(RESEND_CONTACT_DELAY_MS)
      }
    }
  )

  await pageThrough(
    db
      .collection('newsletter-subscribers')
      .where('status', '==', 'subscribed'),
    async (doc) => {
      const data = doc.data()
      const email = normalizeNewsletterEmail(data.email)
      if (!email) return
      if (!options.dryRun) {
        const needsTokenMigration =
          !data.resendNewsletterSyncedAt
        const token = needsTokenMigration
          ? createNewsletterToken()
          : null
        const unsubscribeUrl = token
          ? newsletterUnsubscribeUrl(
              doc.id,
              token,
              newsletterLocale(data.locale)
            )
          : null
        const subscribed = await syncWithRetry(() =>
          addNewsletterContact(
            {
              email,
              ...(unsubscribeUrl && {
                properties: {
                  newsletter_unsubscribe_url:
                    unsubscribeUrl,
                },
              }),
            },
            resend
          )
        )
        if (!subscribed) {
          throw new Error(
            `Cannot sync newsletter subscriber ${doc.id}.`
          )
        }
        if (token) {
          await doc.ref.update({
            previousUnsubscribeTokenHash:
              data.unsubscribeTokenHash ||
              admin.firestore.FieldValue.delete(),
            unsubscribeTokenHash:
              hashNewsletterValue(token),
            resendNewsletterSyncedAt:
              admin.firestore.FieldValue.serverTimestamp(),
            updatedAt:
              admin.firestore.FieldValue.serverTimestamp(),
          })
        }
      }
      newsletter += 1
      if (!options.dryRun) {
        await wait(RESEND_CONTACT_DELAY_MS)
      }
    }
  )

  console.log(
    `Processed ${transactional} transactional contacts.`
  )
  console.log(
    `Processed ${newsletter} newsletter contacts.`
  )
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
