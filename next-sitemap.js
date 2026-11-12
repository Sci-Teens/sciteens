const {
  getApp,
  getApps,
  initializeApp,
} = require('firebase/app')
const {
  collection,
  getDocs,
  getFirestore,
} = require('firebase/firestore')
const {
  createDocumentPaths,
  createArchivePaths,
  isIndexableSitemapPath,
  toLastmod,
} = require('./lib/sitemap.cjs')
const fs = require('node:fs')
const path = require('node:path')

const SITE_URL = 'https://sciteens.org'

async function contentLastmod(route) {
  const collection = route.match(
    /^\/(?:es\/|fr\/|hi\/)?opportunities\/([^/]+)$/
  )
  if (collection) {
    const { getOpportunityCollection } = await import(
      './lib/opportunityCollections.js'
    )
    const entry = getOpportunityCollection(collection[1])
    if (entry) return toLastmod(entry.updatedAt)
  }
  const match = route.match(
    /^\/(?:es\/|fr\/|hi\/)?(article|course)\/([a-z0-9.-]+)$/
  )
  if (!match) return undefined
  const file = path.join(
    __dirname,
    'content',
    `${match[1]}s`,
    `${match[2]}.md`
  )
  if (!fs.existsSync(file)) return undefined
  const { parseFrontmatter } = await import(
    './lib/markdown.mjs'
  )
  const { data } = parseFrontmatter(
    fs.readFileSync(file, 'utf8')
  )
  return toLastmod(data.updated || data.date)
}

function getFirebaseConfig() {
  const projectId = process.env.NEXT_PUBLIC_FB_PROJECT_ID
  const appId = process.env.NEXT_PUBLIC_FB_APP_ID
  const senderId =
    process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID

  return {
    apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
    appId: appId?.includes(':web:')
      ? appId
      : `1:${senderId}:web:${appId}`,
    authDomain:
      process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN ||
      `${projectId}.firebaseapp.com`,
    projectId,
  }
}

async function getDynamicPaths(config) {
  const app = getApps().length
    ? getApp()
    : initializeApp(getFirebaseConfig())
  const firestore = getFirestore(app)
  const [projects, opportunities] = await Promise.all([
    getDocs(collection(firestore, 'projects')),
    getDocs(collection(firestore, 'opportunities')),
  ])
  const projectRecords = projects.docs.map((document) => ({
    ...document.data(),
    id: document.id,
  }))
  const programPaths = createDocumentPaths(
    opportunities.docs.map((document) => ({
      ...document.data(),
      id: document.id,
    })),
    'program',
    'slug'
  )
  const articleCount = fs
    .readdirSync(path.join(__dirname, 'content/articles'))
    .filter((file) => file.endsWith('.md')).length
  const paths = [
    ...createDocumentPaths(projectRecords, 'project', 'id'),
    ...programPaths,
    ...createArchivePaths('articles', articleCount),
    ...createArchivePaths(
      'projects',
      projectRecords.filter(
        (record) => record.date !== undefined
      ).length
    ),
    ...createArchivePaths(
      'opportunities',
      programPaths.length
    ),
  ]

  return Promise.all(
    paths.map(async ({ loc, lastmod }) => {
      const field = await config.transform(config, loc)
      return lastmod ? { ...field, lastmod } : field
    })
  )
}

module.exports = {
  additionalPaths: getDynamicPaths,
  autoLastmod: false,
  generateRobotsTxt: true,
  siteUrl: SITE_URL,
  transform: async (_config, path) => {
    if (!isIndexableSitemapPath(path)) return null
    const lastmod = await contentLastmod(path)
    return {
      loc: path,
      ...(lastmod ? { lastmod } : {}),
    }
  },
}
