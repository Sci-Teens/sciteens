import { describe, expect, it } from 'vitest'
import {
  createCropImageLoader,
  maxWidthImageLoader,
} from './prismicImageLoader'

describe('maxWidthImageLoader', () => {
  it('appends with "?" when the source has no query string', () => {
    expect(
      maxWidthImageLoader({
        src: 'https://images.prismic.io/img.jpg',
        width: 800,
      })
    ).toBe(
      'https://images.prismic.io/img.jpg?fit=max&w=800'
    )
  })

  // Regression test for the double-"?" broken-image bug: Prismic's CDN
  // URLs already carry a query string (e.g. "?auto=compress,format").
  it('appends with "&" when the source already has a query string', () => {
    expect(
      maxWidthImageLoader({
        src: 'https://images.prismic.io/img.jpg?auto=compress,format',
        width: 400,
      })
    ).toBe(
      'https://images.prismic.io/img.jpg?auto=compress,format&fit=max&w=400'
    )
  })
})

describe('createCropImageLoader', () => {
  it('scales height proportionally to the requested width, appending with "?"', () => {
    const loader = createCropImageLoader(300, 200)
    expect(
      loader({
        src: 'https://images.prismic.io/img.jpg',
        width: 600,
      })
    ).toBe(
      'https://images.prismic.io/img.jpg?fit=crop&crop=faces&w=600&h=400'
    )
  })

  it('falls back to fallbackWidth/height when width is not provided', () => {
    const loader = createCropImageLoader(300, 200)
    expect(
      loader({ src: 'https://images.prismic.io/img.jpg' })
    ).toBe(
      'https://images.prismic.io/img.jpg?fit=crop&crop=faces&w=300&h=200'
    )
  })

  it('appends with "&" when the source already has a query string', () => {
    const loader = createCropImageLoader(300, 200)
    expect(
      loader({
        src: 'https://images.prismic.io/img.jpg?auto=compress',
        width: 600,
      })
    ).toBe(
      'https://images.prismic.io/img.jpg?auto=compress&fit=crop&crop=faces&w=600&h=400'
    )
  })

  it('produces independent loaders for different fallback/height pairs', () => {
    const avatarLoader = createCropImageLoader(100, 100)
    const bannerLoader = createCropImageLoader(1200, 300)
    const src = 'https://images.prismic.io/img.jpg'
    expect(avatarLoader({ src })).toContain('w=100&h=100')
    expect(bannerLoader({ src })).toContain('w=1200&h=300')
  })

  // Regression test for the profile-picture-inflation bug: reusing
  // one loader instance across differently-sized `next/image`
  // requests (mobile srcset widths, 2x DPR, or a smaller display
  // size than the loader was tuned for) must never distort the
  // intended aspect ratio, only change resolution.
  it('keeps a square avatar crop square at every requested width', () => {
    const avatarLoader = createCropImageLoader(256, 256)
    const src = 'https://images.prismic.io/img.jpg'
    expect(avatarLoader({ src, width: 48 })).toContain(
      'w=48&h=48'
    )
    expect(avatarLoader({ src, width: 96 })).toContain(
      'w=96&h=96'
    )
    expect(avatarLoader({ src, width: 512 })).toContain(
      'w=512&h=512'
    )
  })
})
