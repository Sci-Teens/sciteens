'use strict'

const sharp = require('sharp')
const { WEBP_QUALITY } = require('./imageOptimize')

const COVER_MAX_DIMENSION = 1536
const COVER_MIN_BYTES = 500
const COVER_MIN_DIMENSION = 96
const CONTAIN_ABOVE_RATIO = 1.8
const SVG_RASTER_DENSITY = 384
const STORAGE_PREFIX = 'opportunities'
const COVER_CACHE_CONTROL = 'public, max-age=604800'

function extForContentType(contentType) {
  if (contentType.includes('png')) return 'png'
  if (contentType.includes('webp')) return 'webp'
  if (contentType.includes('gif')) return 'gif'
  if (contentType.includes('svg')) return 'svg'
  return 'jpg'
}

function extForFilename(filename) {
  const match = filename
    .toLowerCase()
    .match(/\.([a-z0-9]+)$/)
  if (!match) return 'jpg'
  const ext = match[1]
  if (ext === 'jpeg') return 'jpg'
  return ext
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

function isSvg(ext) {
  return ext === 'svg'
}

async function measureImage(buffer, ext) {
  if (isSvg(ext)) {
    const ratio = svgAspectRatio(buffer.toString('utf8'))
    return { width: null, height: null, ratio }
  }
  const { width, height } = await sharp(buffer).metadata()
  return {
    width: width || 0,
    height: height || 0,
    ratio: (width || 1) / (height || 1),
  }
}

function assertMinBytes(buffer) {
  if (buffer.length < COVER_MIN_BYTES) {
    throw new Error(
      `image too small (${buffer.length}b), likely a placeholder`
    )
  }
}

function assertDimensionsLargeEnough(measurement, ext) {
  if (isSvg(ext)) return
  if (
    measurement.width < COVER_MIN_DIMENSION ||
    measurement.height < COVER_MIN_DIMENSION
  ) {
    throw new Error(
      `image too small (${measurement.width}x${measurement.height}), would look blurry at card size`
    )
  }
}

function toCoverWebp(buffer, ext) {
  const pipeline = isSvg(ext)
    ? sharp(buffer, { density: SVG_RASTER_DENSITY })
    : sharp(buffer, { animated: false })
  return pipeline
    .resize({
      width: COVER_MAX_DIMENSION,
      height: COVER_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer()
}

function coverObjectPath(slug) {
  return `${STORAGE_PREFIX}/${slug}/cover.webp`
}

function coverDownloadUrl(bucketName, objectPath) {
  return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(
    objectPath
  )}?alt=media`
}

function defaultBucketName(projectId) {
  return `${projectId}.appspot.com`
}

async function uploadCoverWebp(bucket, slug, webpBuffer) {
  const objectPath = coverObjectPath(slug)
  await bucket.file(objectPath).save(webpBuffer, {
    contentType: 'image/webp',
    metadata: { cacheControl: COVER_CACHE_CONTROL },
  })
  return coverDownloadUrl(bucket.name, objectPath)
}

async function buildCoverFromBuffer(
  buffer,
  ext,
  { skipDimensionGate = false } = {}
) {
  assertMinBytes(buffer)
  const measurement = await measureImage(buffer, ext)
  if (!skipDimensionGate) {
    assertDimensionsLargeEnough(measurement, ext)
  }
  return {
    webp: await toCoverWebp(buffer, ext),
    imageFit: fitForRatio(measurement.ratio),
  }
}

module.exports = {
  COVER_MAX_DIMENSION,
  COVER_MIN_BYTES,
  COVER_MIN_DIMENSION,
  CONTAIN_ABOVE_RATIO,
  STORAGE_PREFIX,
  WEBP_QUALITY,
  extForContentType,
  extForFilename,
  svgAspectRatio,
  fitForRatio,
  measureImage,
  assertMinBytes,
  assertDimensionsLargeEnough,
  toCoverWebp,
  coverObjectPath,
  coverDownloadUrl,
  defaultBucketName,
  uploadCoverWebp,
  buildCoverFromBuffer,
}
