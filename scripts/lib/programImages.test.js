import { describe, expect, it } from 'vitest'
import sharp from 'sharp'

import {
  buildCoverFromBuffer,
  coverDownloadUrl,
  coverObjectPath,
  defaultBucketName,
  extForContentType,
  extForFilename,
  fitForRatio,
  measureImage,
  svgAspectRatio,
  toCoverWebp,
  uploadCoverWebp,
} from './programImages.js'

function solidPng(width, height) {
  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 10, g: 120, b: 90 },
    },
  })
    .png()
    .toBuffer()
}

function noisyPng(width, height) {
  const pixels = Buffer.alloc(width * height * 3)
  for (let i = 0; i < pixels.length; i++) {
    pixels[i] = (i * 2654435761) % 251
  }
  return sharp(pixels, {
    raw: { width, height, channels: 3 },
  })
    .png()
    .toBuffer()
}

const WIDE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 100"><rect width="400" height="100" fill="#0a7"/></svg>'

describe('object paths and urls', () => {
  it('stores one webp cover per slug', () => {
    expect(coverObjectPath('mit-primes')).toBe(
      'opportunities/mit-primes/cover.webp'
    )
  })

  it('percent-encodes the object path in the download url', () => {
    expect(
      coverDownloadUrl(
        'b.appspot.com',
        'opportunities/x/cover.webp'
      )
    ).toBe(
      'https://firebasestorage.googleapis.com/v0/b/b.appspot.com/o/opportunities%2Fx%2Fcover.webp?alt=media'
    )
  })

  it('defaults to the appspot bucket for the project', () => {
    expect(defaultBucketName('directed-relic-266701')).toBe(
      'directed-relic-266701.appspot.com'
    )
  })
})

describe('extension detection', () => {
  it('maps content types', () => {
    expect(extForContentType('image/png')).toBe('png')
    expect(extForContentType('image/svg+xml')).toBe('svg')
    expect(extForContentType('image/webp')).toBe('webp')
    expect(
      extForContentType('application/octet-stream')
    ).toBe('jpg')
  })

  it('normalises jpeg filenames to jpg', () => {
    expect(extForFilename('rsi.JPEG')).toBe('jpg')
    expect(extForFilename('logo.svg')).toBe('svg')
    expect(extForFilename('noext')).toBe('jpg')
  })
})

describe('fit selection', () => {
  it('letterboxes wide wordmarks and crops near-square photos', () => {
    expect(fitForRatio(4)).toBe('contain')
    expect(fitForRatio(0.25)).toBe('contain')
    expect(fitForRatio(1)).toBe('cover')
    expect(fitForRatio(1.5)).toBe('cover')
  })

  it('reads the aspect ratio from an svg viewBox', () => {
    expect(svgAspectRatio(WIDE_SVG)).toBe(4)
    expect(svgAspectRatio('<svg></svg>')).toBe(1)
  })
})

describe('conversion to webp', () => {
  it('re-encodes a png as webp', async () => {
    const webp = await toCoverWebp(
      await solidPng(300, 300),
      'png'
    )
    const meta = await sharp(webp).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width).toBe(300)
  })

  it('never enlarges a small logo', async () => {
    const webp = await toCoverWebp(
      await solidPng(120, 120),
      'png'
    )
    const meta = await sharp(webp).metadata()
    expect(meta.width).toBe(120)
    expect(meta.height).toBe(120)
  })

  it('caps an oversized image at the max dimension', async () => {
    const webp = await toCoverWebp(
      await solidPng(4000, 2000),
      'jpg'
    )
    const meta = await sharp(webp).metadata()
    expect(meta.width).toBe(1536)
    expect(meta.height).toBe(768)
  })

  it('rasterises svg to webp keeping the aspect ratio', async () => {
    const webp = await toCoverWebp(
      Buffer.from(WIDE_SVG),
      'svg'
    )
    const meta = await sharp(webp).metadata()
    expect(meta.format).toBe('webp')
    expect(meta.width / meta.height).toBeCloseTo(4, 1)
  })
})

describe('measureImage', () => {
  it('reads raster dimensions', async () => {
    const measurement = await measureImage(
      await solidPng(200, 100),
      'png'
    )
    expect(measurement).toMatchObject({
      width: 200,
      height: 100,
    })
    expect(measurement.ratio).toBe(2)
  })

  it('uses the viewBox for svg without rasterising', async () => {
    const measurement = await measureImage(
      Buffer.from(WIDE_SVG),
      'svg'
    )
    expect(measurement.width).toBeNull()
    expect(measurement.ratio).toBe(4)
  })
})

describe('buildCoverFromBuffer', () => {
  it('rejects an image below the card dimension floor', async () => {
    await expect(
      buildCoverFromBuffer(await noisyPng(40, 40), 'png')
    ).rejects.toThrow(/would look blurry/)
  })

  it('accepts a small image when the gate is skipped', async () => {
    const built = await buildCoverFromBuffer(
      await noisyPng(40, 40),
      'png',
      { skipDimensionGate: true }
    )
    expect(built.imageFit).toBe('cover')
    expect(
      (await sharp(built.webp).metadata()).format
    ).toBe('webp')
  })

  it('rejects a placeholder-sized payload even when the gate is skipped', async () => {
    await expect(
      buildCoverFromBuffer(Buffer.from('tiny'), 'png', {
        skipDimensionGate: true,
      })
    ).rejects.toThrow(/likely a placeholder/)
  })

  it('reports contain for a wide wordmark', async () => {
    const built = await buildCoverFromBuffer(
      await solidPng(800, 100),
      'png'
    )
    expect(built.imageFit).toBe('contain')
  })
})

describe('uploadCoverWebp', () => {
  it('saves one webp object and returns its download url', async () => {
    const saved = []
    const bucket = {
      name: 'directed-relic-266701.appspot.com',
      file: (objectPath) => ({
        save: async (buffer, options) => {
          saved.push({ objectPath, buffer, options })
        },
      }),
    }
    const url = await uploadCoverWebp(
      bucket,
      'rsi',
      Buffer.from('webp-bytes')
    )
    expect(saved).toHaveLength(1)
    expect(saved[0].objectPath).toBe(
      'opportunities/rsi/cover.webp'
    )
    expect(saved[0].options.contentType).toBe('image/webp')
    expect(saved[0].options.metadata.cacheControl).toBe(
      'public, max-age=604800'
    )
    expect(url).toContain(
      'opportunities%2Frsi%2Fcover.webp'
    )
  })
})
