const fs = require('node:fs/promises')
const path = require('node:path')
const admin = require('firebase-admin')
const { render } = require('@react-email/render')
const {
  monthlyNewsletterTemplate,
} = require('../lib/emailTemplates')
const {
  normalizeMonthlyNewsletter,
  MAX_OPPORTUNITIES,
} = require('../lib/monthlyNewsletter')
const {
  createNewsletterBroadcast,
} = require('../lib/resend')

function usage() {
  return [
    'Use: pnpm newsletter:create -- --input <file> [options]',
    '',
    'Required JSON fields:',
    'name, subject, preview, title, opening, featuredArticle, featuredProject.',
    'Each feature needs title, description, and an HTTPS href.',
    '',
    'Options:',
    '--project <id>              Google Cloud project id.',
    '--send                      Send the Resend broadcast now.',
    '--scheduled-at <ISO date>   Schedule the broadcast. Use with --send.',
    '--dry-run                   Render HTML. Do not create a broadcast.',
    '--output <file>             Set the HTML preview path.',
    '',
    `The script selects up to ${MAX_OPPORTUNITIES} opportunities that close in the Instagram deadline window.`,
    'Set opportunities in JSON to bypass the Firestore query.',
  ].join('\n')
}

function parseArgs(values) {
  const options = {
    dryRun: false,
    input: null,
    output: null,
    project: process.env.GCP_PROJECT_ID || null,
    scheduledAt: null,
    send: false,
  }

  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]
    if (value === '--') continue
    if (value === '--help' || value === '-h') {
      options.help = true
      continue
    }
    if (value === '--dry-run' || value === '--send') {
      options[
        value
          .slice(2)
          .replace(/-([a-z])/g, (_, letter) =>
            letter.toUpperCase()
          )
      ] = true
      continue
    }
    if (
      value === '--input' ||
      value === '--output' ||
      value === '--project' ||
      value === '--scheduled-at'
    ) {
      const next = values[index + 1]
      if (!next || next.startsWith('--')) {
        throw new Error(`${value} requires a value.`)
      }
      const key = value
        .slice(2)
        .replace(/-([a-z])/g, (_, letter) =>
          letter.toUpperCase()
        )
      options[key] = next
      index += 1
      continue
    }
    throw new Error(`Unknown option: ${value}`)
  }

  if (!options.help && !options.input) {
    throw new Error('--input is required.')
  }
  if (options.scheduledAt && !options.send) {
    throw new Error('--scheduled-at requires --send.')
  }
  if (options.scheduledAt) {
    const scheduledAt = new Date(options.scheduledAt)
    if (
      Number.isNaN(scheduledAt.getTime()) ||
      scheduledAt <= new Date()
    ) {
      throw new Error(
        '--scheduled-at must be a future ISO 8601 date.'
      )
    }
    options.scheduledAt = scheduledAt.toISOString()
  }
  return options
}

async function readJson(file) {
  try {
    return JSON.parse(await fs.readFile(file, 'utf8'))
  } catch (error) {
    throw new Error(`Cannot read ${file}: ${error.message}`)
  }
}

async function fetchClosingOpportunities(projectId) {
  if (!projectId) {
    throw new Error(
      'Set --project or GCP_PROJECT_ID to select opportunities.'
    )
  }
  const { deadlineWindow, formatDeadline } = await import(
    '../../lib/socialDeadlinePosts.mjs'
  )
  const app = admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    projectId,
  })
  const db = admin.firestore(app)
  const { start, end } = deadlineWindow(new Date())
  const snapshot = await db
    .collection('opportunities')
    .where('deadlineStatus', '==', 'dated')
    .where(
      'applicationDeadline',
      '>=',
      admin.firestore.Timestamp.fromDate(start)
    )
    .where(
      'applicationDeadline',
      '<',
      admin.firestore.Timestamp.fromDate(end)
    )
    .orderBy('applicationDeadline', 'asc')
    .limit(MAX_OPPORTUNITIES)
    .get()

  if (snapshot.empty) {
    throw new Error(
      'No opportunities close in the newsletter deadline window.'
    )
  }

  return snapshot.docs.map((doc) => {
    const opportunity = doc.data()
    const deadline =
      opportunity.applicationDeadline?.toDate?.()
    const title = String(opportunity.name || doc.id).trim()
    const description = String(
      opportunity.about || ''
    ).trim()
    if (!deadline || !title || !description) {
      throw new Error(
        `Opportunity ${doc.id} lacks newsletter content.`
      )
    }
    return {
      title,
      description,
      deadline: formatDeadline(deadline),
      href: `https://sciteens.org/program/${encodeURIComponent(
        doc.id
      )}`,
    }
  })
}

function previewPath(options, newsletter) {
  if (options.output) return path.resolve(options.output)
  const stem = newsletter.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
  return path.resolve(
    path.dirname(options.input),
    `${stem || 'newsletter'}-preview.html`
  )
}

async function run() {
  const options = parseArgs(process.argv.slice(2))
  if (options.help) {
    console.log(usage())
    return
  }

  const inputPath = path.resolve(options.input)
  const input = await readJson(inputPath)
  const opportunities = Array.isArray(input.opportunities)
    ? input.opportunities
    : await fetchClosingOpportunities(options.project)
  const newsletter = normalizeMonthlyNewsletter({
    ...input,
    opportunities,
  })
  const react = monthlyNewsletterTemplate(newsletter)
  const output = previewPath(
    { ...options, input: inputPath },
    newsletter
  )
  await fs.mkdir(path.dirname(output), { recursive: true })
  await fs.writeFile(output, await render(react), 'utf8')
  console.log(`Wrote newsletter preview to ${output}.`)

  if (options.dryRun) return

  const apiKey = process.env.RESEND_APIKEY
  if (!apiKey) {
    throw new Error(
      'Set RESEND_APIKEY before you create a broadcast.'
    )
  }
  const result = await createNewsletterBroadcast({
    apiKey,
    name: newsletter.name,
    subject: newsletter.subject,
    react,
    send: options.send,
    scheduledAt: options.scheduledAt,
  })
  const id = result.data?.id || 'unknown'
  const status = options.send ? 'Sent' : 'Created'
  console.log(`${status} newsletter broadcast ${id}.`)
}

run().catch((error) => {
  console.error(error.message)
  process.exitCode = 1
})
