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
  isIndexableSitemapPath,
} = require('./lib/sitemap.cjs')

const SITE_URL = 'https://sciteens.org'

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
  const [projects, profiles, opportunities] =
    await Promise.all([
      getDocs(collection(firestore, 'projects')),
      getDocs(collection(firestore, 'profiles')),
      getDocs(collection(firestore, 'opportunities')),
    ])
  const paths = [
    ...createDocumentPaths(
      projects.docs.map((document) => ({
        ...document.data(),
        id: document.id,
      })),
      'project',
      'id'
    ),
    ...createDocumentPaths(
      profiles.docs.map((document) => ({
        ...document.data(),
        id: document.id,
      })),
      'profile',
      'slug'
    ),
    ...createDocumentPaths(
      opportunities.docs.map((document) => ({
        ...document.data(),
        id: document.id,
      })),
      'program',
      'slug'
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
    return {
      changefreq: 'weekly',
      loc: path,
      priority: 0.7,
    }
  },
}
