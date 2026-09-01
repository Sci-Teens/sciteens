import { createHash, randomUUID } from 'node:crypto'
import {
  initializeApp,
  getApps,
  applicationDefault,
} from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'
import sharp from 'sharp'

const PROJECT_ID =
  process.env.GCP_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FB_PROJECT_ID
const BUCKET_NAME =
  process.env.FIREBASE_STORAGE_BUCKET ||
  `${PROJECT_ID}.appspot.com`

const app = getApps().length
  ? getApps()[0]
  : initializeApp(
      {
        credential: applicationDefault(),
        projectId: PROJECT_ID,
      },
      'social-pipeline'
    )
export const STORAGE_PREFIX = 'social-posts'
export const MAX_COVER_BYTES = 5 * 1024 * 1024
export const COVER_CONTENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
])
const COVER_FETCH_TIMEOUT_MS = 5000
const STORAGE_CACHE_CONTROL =
  'public, max-age=31536000, immutable'

const bucket = getStorage(app).bucket(BUCKET_NAME)

export function isCanonicalOpportunityCoverUrl(url, slug) {
  if (typeof url !== 'string') return false
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  if (parsed.hostname !== 'firebasestorage.googleapis.com')
    return false
  if (parsed.searchParams.get('alt') !== 'media')
    return false
  const path = decodeURIComponent(parsed.pathname)
  return path.endsWith(
    `/o/opportunities/${slug}/cover.webp`
  )
}

export async function fetchCanonicalOpportunityCover(
  url,
  slug
) {
  if (!isCanonicalOpportunityCoverUrl(url, slug))
    return null
  const controller = new AbortController()
  const timer = setTimeout(
    () => controller.abort(),
    COVER_FETCH_TIMEOUT_MS
  )
  try {
    const response = await fetch(url, {
      signal: controller.signal,
    })
    const contentType =
      response.headers.get('content-type')?.split(';')[0] ||
      ''
    const contentLength = Number(
      response.headers.get('content-length')
    )
    if (
      !response.ok ||
      !COVER_CONTENT_TYPES.has(contentType) ||
      (Number.isFinite(contentLength) &&
        contentLength > MAX_COVER_BYTES)
    ) {
      return null
    }
    const image = Buffer.from(await response.arrayBuffer())
    if (image.length > MAX_COVER_BYTES) return null
    return sharp(image, { limitInputPixels: 50_000_000 })
      .jpeg({ quality: 86 })
      .toBuffer()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

export function hashCarousel(carousel) {
  const hash = createHash('sha256')
  hash.update(JSON.stringify(carousel))
  return hash.digest('hex').slice(0, 12)
}

export function carouselStoragePath(
  carouselId,
  version,
  slideIndex
) {
  return `${STORAGE_PREFIX}/${carouselId}/${version}/${slideIndex}.png`
}

function storageUrl(path, downloadToken) {
  return `https://firebasestorage.googleapis.com/v0/b/${BUCKET_NAME}/o/${encodeURIComponent(
    path
  )}?alt=media&token=${downloadToken}`
}

async function existingDownloadToken(file) {
  try {
    const [metadata] = await file.getMetadata()
    const tokens =
      metadata.metadata?.firebaseStorageDownloadTokens
    return tokens?.split(',')[0].trim() || null
  } catch (error) {
    if (error.code === 404) return null
    throw error
  }
}

export async function existingSlideUrl(path) {
  const downloadToken = await existingDownloadToken(
    bucket.file(path)
  )
  return downloadToken
    ? storageUrl(path, downloadToken)
    : null
}

export async function uploadSlidePng(path, png) {
  const existingUrl = await existingSlideUrl(path)
  if (existingUrl) return existingUrl

  const downloadToken = randomUUID()
  await bucket.file(path).save(png, {
    metadata: {
      cacheControl: STORAGE_CACHE_CONTROL,
      contentType: 'image/png',
      metadata: {
        firebaseStorageDownloadTokens: downloadToken,
      },
    },
    resumable: false,
    validation: 'crc32c',
  })
  return storageUrl(path, downloadToken)
}
