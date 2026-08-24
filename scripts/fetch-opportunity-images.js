#!/usr/bin/env node
// Fetches a cover image for each real `opportunities` doc in Firestore
// and writes it into public/assets/programs/ + the doc's imageUrl/imageFit
// fields directly. This is the local-file cascade already proven out in
// scripts/fetch-program-images.js (mock-data phase) -- same logic, just
// reading real (slug, sourceUrl) pairs from opportunity-sources instead of
// a hardcoded list, and writing the result to Firestore instead of a JS
// manifest file.
//
// Deliberately NOT Firebase Storage: this repo's scrapeOpportunities.js
// already has a Storage-based image pipeline ready for when this project
// moves onto real production infrastructure, but that needs a Storage
// bucket provisioned first. Until then, local files under public/ work
// fine for a sandbox/dev environment (just won't survive an unattended
// GitHub Actions run without a redeploy -- a limitation to revisit later,
// not now).
//
// Usage:
//   node scripts/fetch-opportunity-images.js [--project <id>] [slug ...]
'use strict'

const fs = require('node:fs')
const os = require('node:os')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const sharp = require('sharp')

const GENERIC_BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

// Hand-found direct logo URLs for sources the automated og:image/favicon
// cascade can't reach -- same list already proven out in
// scripts/fetch-program-images.js against these same sources.
const MANUAL_OVERRIDES = {
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

const OUT_DIR = path.join(
  __dirname,
  '..',
  'public',
  'assets',
  'programs'
)
const USER_AGENT =
  'Mozilla/5.0 (compatible; SciTeensImageFetcher/1.0; +https://sciteens.org)'
const TIMEOUT_MS = 12000
const MIN_BYTES = 500
const MIN_DIMENSION = 96
const CONTAIN_ABOVE_RATIO = 1.8

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

async function attemptOnce(slug, url) {
  const override = MANUAL_OVERRIDES[slug]
  if (override) {
    const { filename, fit } = await downloadImage(
      override.url,
      path.join(OUT_DIR, slug),
      {
        skipDimensionGate: true,
        headers: override.headers,
      }
    )
    return { filename, fit, source: 'manual override' }
  }

  const ogImageUrl = await getOgImageUrl(url).catch(
    () => null
  )
  if (ogImageUrl) {
    try {
      const { filename, fit } = await downloadImage(
        ogImageUrl,
        path.join(OUT_DIR, slug)
      )
      return { filename, fit, source: 'og:image' }
    } catch {
      // fall through to favicon -- a bad og:image tag shouldn't take
      // down the whole attempt when favicon might still work
    }
  }
  const { filename, fit } = await downloadImage(
    faviconFallbackUrl(url),
    path.join(OUT_DIR, slug)
  )
  return { filename, fit, source: 'favicon fallback' }
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

async function main() {
  const repoRoot = path.resolve(__dirname, '..')
  loadEnvLocal(repoRoot)
  fs.mkdirSync(OUT_DIR, { recursive: true })

  const args = process.argv.slice(2)
  let project
  const requestedSlugs = []
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--project') {
      project = args[++i]
    } else {
      requestedSlugs.push(args[i])
    }
  }
  project = project || process.env.NEXT_PUBLIC_FB_PROJECT_ID
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

  let sourcesSnap = await db
    .collection('opportunity-sources')
    .where('status', '==', 'active')
    .get()
  let sources = sourcesSnap.docs.map((d) => ({
    slug: d.id,
    url: d.data().url,
  }))
  if (requestedSlugs.length) {
    sources = sources.filter((s) =>
      requestedSlugs.includes(s.slug)
    )
  }

  // Only fetch images for sources that already have a real opportunities
  // doc -- writing imageUrl/imageFit for a slug with no doc yet (e.g. a
  // source that has never successfully scraped) would create a broken
  // partial record with an image but no name/deadline/etc.
  const existingOpps = await db
    .collection('opportunities')
    .get()
  const existingSlugs = new Set(
    existingOpps.docs.map((d) => d.id)
  )
  const skippedNoDoc = sources.filter(
    (s) => !existingSlugs.has(s.slug)
  )
  sources = sources.filter((s) => existingSlugs.has(s.slug))
  if (skippedNoDoc.length) {
    console.log(
      `Skipping ${
        skippedNoDoc.length
      } source(s) with no opportunities doc yet: ${skippedNoDoc
        .map((s) => s.slug)
        .join(', ')}`
    )
  }

  console.log(
    `Fetching images for ${sources.length} source(s)...`
  )

  let succeeded = 0
  const failures = []

  for (const { slug, url } of sources) {
    process.stdout.write(`${slug}: `)
    try {
      let result
      try {
        result = await attemptOnce(slug, url)
      } catch {
        await new Promise((resolve) =>
          setTimeout(resolve, 1500)
        )
        result = await attemptOnce(slug, url)
      }
      await db
        .collection('opportunities')
        .doc(slug)
        .set(
          {
            imageUrl: `/assets/programs/${result.filename}`,
            imageFit: result.fit,
          },
          { merge: true }
        )
      succeeded += 1
      console.log(
        `OK (${result.source}, ${result.fit}) -> ${result.filename}`
      )
    } catch (err) {
      failures.push({ slug, error: err.message })
      console.log(`SKIPPED (${err.message})`)
    }
    await new Promise((resolve) => setTimeout(resolve, 300))
  }

  console.log(
    `\n${succeeded}/${sources.length} images fetched and written to Firestore.`
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
