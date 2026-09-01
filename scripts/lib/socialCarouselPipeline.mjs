import { createHash, randomUUID } from 'node:crypto'
import {
  initializeApp,
  getApps,
  applicationDefault,
} from 'firebase-admin/app'
import { getStorage } from 'firebase-admin/storage'

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
const STORAGE_CACHE_CONTROL =
  'public, max-age=31536000, immutable'

const bucket = getStorage(app).bucket(BUCKET_NAME)

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
