#!/usr/bin/env node
'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const sharp = require('sharp')

const GENERIC_BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const HAND_FOUND_LOGO_URLS = {
  'bu-rise': {
    url: 'https://www.bu.edu/cdn/images/logos/masterplate112x50.png',
  },
  'jhu-cty': {
    url: 'https://cty.jhu.edu/themes/custom/barrio_sass_cty/logo.png',
    headers: { 'User-Agent': GENERIC_BROWSER_UA },
  },
  'nj-gset': {
    url: 'https://gset.rutgers.edu/sites/default/files/inline-images/RU_SIG_SE_CMYK_K.png',
  },
  cosmos: {
    url: 'https://cosmos-ucop.ucdavis.edu/Contents/i/cosmos-logo.png',
  },
  'all-star-code': {
    url: 'https://allstarcode.org/wp-content/themes/all-star-code/assets/img/logo.svg',
  },
  'first-robotics': {
    url: 'https://www.firstinspires.org/hubfs/web/design/first-web/Branding/Primaries/Logo%20Primary.svg',
  },
}

const PROGRAM_IMAGE_DIR = path.join(
  __dirname,
  '..',
  'public',
  'assets',
  'programs'
)
const PROGRAM_IMAGE_URL_DIR = '/assets/programs'
const USER_AGENT =
  'Mozilla/5.0 (compatible; SciTeensImageFetcher/1.0; +https://sciteens.org)'
const TIMEOUT_MS = 12000
const MIN_BYTES = 500
const MIN_DIMENSION = 96
const CONTAIN_ABOVE_RATIO = 1.8
const RETRY_DELAY_MS = 1500
const BETWEEN_SOURCES_DELAY_MS = 300

function programImagePathWithoutExt(slug) {
  return path.join(PROGRAM_IMAGE_DIR, slug)
}

function programImageUrl(filename) {
  return `${PROGRAM_IMAGE_URL_DIR}/${filename}`
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithTimeout(url, opts = {}) {
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(),
    TIMEOUT_MS
  )
  try {
    return await fetch(url, {
      redirect: 'follow',
      ...opts,
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        ...opts.headers,
      },
    })
  } finally {
    clearTimeout(timer)
  }
}

function extractMetaContent(html, property) {
  const patterns = [
    new RegExp(
      `<meta[^>]+(?:property|name)=["']${property}["'][^>]*content=["']([^"']+)["']`,
      'i'
    ),
    new RegExp(
      `<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${property}["']`,
      'i'
    ),
  ]
  for (const re of patterns) {
    const match = html.match(re)
    if (match) return match[1]
  }
  return null
}

async function getOgImageUrl(pageUrl) {
  const res = await fetchWithTimeout(pageUrl)
  if (!res.ok)
    throw new Error(`page fetch HTTP ${res.status}`)
  const html = await res.text()
  const found =
    extractMetaContent(html, 'og:image') ||
    extractMetaContent(html, 'twitter:image')
  if (!found) return null
  return new URL(found, pageUrl).toString()
}

function faviconFallbackUrl(pageUrl) {
  const domain = new URL(pageUrl).hostname
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=256`
}

function extForContentType(contentType) {
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('svg')) return 'svg'
  return 'jpg'
}

function svgAspectRatio(svgText) {
  const match = svgText.match(/viewBox=["']([^"']+)["']/)
  if (!match) return 1
  const parts = match[1].split(/\s+/).map(Number)
  if (parts.length !== 4 || !parts[3]) return 1
  return parts[2] / parts[3]
}

function fitForRatio(ratio) {
  return ratio > CONTAIN_ABOVE_RATIO ||
    ratio < 1 / CONTAIN_ABOVE_RATIO
    ? 'contain'
    : 'cover'
}

async function downloadImage(
  imageUrl,
  destPathNoExt,
  { skipDimensionGate = false, headers } = {}
) {
  const res = await fetchWithTimeout(imageUrl, { headers })
  if (!res.ok)
    throw new Error(`image fetch HTTP ${res.status}`)
  const contentType = res.headers.get('content-type') || ''
  const buffer = Buffer.from(await res.arrayBuffer())
  if (buffer.length < MIN_BYTES) {
    throw new Error(
      `image too small (${buffer.length}b), likely a placeholder`
    )
  }
  const ext = extForContentType(contentType)
  let fit = 'cover'
  if (ext === 'svg') {
    fit = fitForRatio(
      svgAspectRatio(buffer.toString('utf8'))
    )
  } else {
    const { width, height } = await sharp(buffer).metadata()
    if (
      !skipDimensionGate &&
      ((width || 0) < MIN_DIMENSION ||
        (height || 0) < MIN_DIMENSION)
    ) {
      throw new Error(
        `image too small (${width}x${height}), would look blurry at card size`
      )
    }
    fit = fitForRatio((width || 1) / (height || 1))
  }
  const dest = `${destPathNoExt}.${ext}`
  fs.writeFileSync(dest, buffer)
  return { filename: path.basename(dest), fit }
}

async function tryHandFoundLogo(slug) {
  const logo = HAND_FOUND_LOGO_URLS[slug]
  if (!logo) return null
  const { filename, fit } = await downloadImage(
    logo.url,
    programImagePathWithoutExt(slug),
    {
      skipDimensionGate: true,
      headers: logo.headers,
    }
  )
  return { filename, fit, source: 'manual override' }
}

async function tryOgImage(slug, pageUrl) {
  const ogImageUrl = await getOgImageUrl(pageUrl).catch(
    () => null
  )
  if (!ogImageUrl) return null
  try {
    const { filename, fit } = await downloadImage(
      ogImageUrl,
      programImagePathWithoutExt(slug)
    )
    return { filename, fit, source: 'og:image' }
  } catch {
    return null
  }
}

async function downloadFavicon(slug, pageUrl) {
  const { filename, fit } = await downloadImage(
    faviconFallbackUrl(pageUrl),
    programImagePathWithoutExt(slug)
  )
  return { filename, fit, source: 'favicon fallback' }
}

async function attemptOnce(slug, url) {
  return (
    (await tryHandFoundLogo(slug)) ||
    (await tryOgImage(slug, url)) ||
    (await downloadFavicon(slug, url))
  )
}

async function attemptWithOneRetry(slug, url) {
  try {
    return await attemptOnce(slug, url)
  } catch {
    await delay(RETRY_DELAY_MS)
    return await attemptOnce(slug, url)
  }
}

function loadEnvLocal(repoRoot) {
  const envPath = path.join(repoRoot, '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const rawLine of fs
    .readFileSync(envPath, 'utf8')
    .split('\n')) {
    const line = rawLine.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq === -1) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    const quoted =
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    if (quoted) value = value.slice(1, -1)
    if (!(key in process.env)) process.env[key] = value
  }
}

function resolveCredential(admin) {
  const adcEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS
  const adcDefaultPath = path.join(
    os.homedir(),
    '.config',
    'gcloud',
    'application_default_credentials.json'
  )
  if (
    (adcEnv && fs.existsSync(adcEnv)) ||
    fs.existsSync(adcDefaultPath)
  ) {
    return admin.credential.applicationDefault()
  }
  if (process.env.GCLOUD_ACCESS_TOKEN) {
    const token = process.env.GCLOUD_ACCESS_TOKEN
    return {
      getAccessToken: async () => ({
        access_token: token,
        expires_in: 3600,
      }),
    }
  }
  execFileSync('gcloud', ['--version'], { stdio: 'pipe' })
  return {
    getAccessToken: async () => {
      const token = execFileSync(
        'gcloud',
        ['auth', 'print-access-token'],
        {
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      )
        .toString()
        .trim()
      return { access_token: token, expires_in: 3600 }
    },
  }
}

function parseArgs(argv) {
  let project
  const requestedSlugs = []
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--project') {
      project = argv[++i]
    } else {
      requestedSlugs.push(argv[i])
    }
  }
  return { project, requestedSlugs }
}

async function loadActiveSources(db, requestedSlugs) {
  const snap = await db
    .collection('opportunity-sources')
    .where('status', '==', 'active')
    .get()
  const sources = snap.docs.map((d) => ({
    slug: d.id,
    url: d.data().url,
  }))
  if (!requestedSlugs.length) return sources
  return sources.filter((s) =>
    requestedSlugs.includes(s.slug)
  )
}

async function partitionByOpportunityDoc(db, sources) {
  const opportunities = await db
    .collection('opportunities')
    .get()
  const slugsWithDoc = new Set(
    opportunities.docs.map((d) => d.id)
  )
  return {
    withOpportunityDoc: sources.filter((s) =>
      slugsWithDoc.has(s.slug)
    ),
    withoutOpportunityDoc: sources.filter(
      (s) => !slugsWithDoc.has(s.slug)
    ),
  }
}

async function writeImageFields(db, slug, image) {
  await db
    .collection('opportunities')
    .doc(slug)
    .set(
      {
        imageUrl: programImageUrl(image.filename),
        imageFit: image.fit,
      },
      { merge: true }
    )
}

async function main() {
  const repoRoot = path.resolve(__dirname, '..')
  loadEnvLocal(repoRoot)
  fs.mkdirSync(PROGRAM_IMAGE_DIR, { recursive: true })

  const { project: projectArg, requestedSlugs } = parseArgs(
    process.argv.slice(2)
  )
  const project =
    projectArg || process.env.NEXT_PUBLIC_FB_PROJECT_ID
  if (!project)
    throw new Error(
      'No project id: pass --project <id> or set NEXT_PUBLIC_FB_PROJECT_ID.'
    )

  const admin = require('firebase-admin')
  admin.initializeApp({
    credential: resolveCredential(admin),
    projectId: project,
  })
  const db = admin.firestore()

  const requestedSources = await loadActiveSources(
    db,
    requestedSlugs
  )
  const { withOpportunityDoc, withoutOpportunityDoc } =
    await partitionByOpportunityDoc(db, requestedSources)
  if (withoutOpportunityDoc.length) {
    const skippedSlugs = withoutOpportunityDoc
      .map((s) => s.slug)
      .join(', ')
    console.log(
      `Skipping ${withoutOpportunityDoc.length} source(s) with no opportunities doc yet: ${skippedSlugs}`
    )
  }

  console.log(
    `Fetching images for ${withOpportunityDoc.length} source(s)...`
  )

  let succeeded = 0
  const failures = []

  for (const { slug, url } of withOpportunityDoc) {
    process.stdout.write(`${slug}: `)
    try {
      const result = await attemptWithOneRetry(slug, url)
      await writeImageFields(db, slug, result)
      succeeded += 1
      console.log(
        `OK (${result.source}, ${result.fit}) -> ${result.filename}`
      )
    } catch (err) {
      failures.push({ slug, error: err.message })
      console.log(`SKIPPED (${err.message})`)
    }
    await delay(BETWEEN_SOURCES_DELAY_MS)
  }

  console.log(
    `\n${succeeded}/${withOpportunityDoc.length} images fetched and written to Firestore.`
  )
  if (failures.length) {
    console.log('\nFailed (left on icon fallback):')
    failures.forEach((f) =>
      console.log(`  ${f.slug}: ${f.error}`)
    )
  }
}

main().catch((err) => {
  console.error('fetch-opportunity-images failed:', err)
  process.exit(1)
})
