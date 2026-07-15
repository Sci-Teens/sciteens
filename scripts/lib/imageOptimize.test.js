import { describe, expect, it } from 'vitest'
import {
  GENERAL_MAX_DIMENSION,
  PHOTO_DIMENSION,
  getResizeTarget,
  isPhotoObjectPath,
  isResizeEligiblePath,
  isThumbnailObjectPath,
} from './imageOptimize'

describe('isPhotoObjectPath', () => {
  it('matches a profile display photo path', () => {
    expect(
      isPhotoObjectPath('profiles/uid1/photo/abc.jpg')
    ).toBe(true)
  })

  it('matches a project display photo path', () => {
    expect(
      isPhotoObjectPath('projects/proj1/photo/abc.jpg')
    ).toBe(true)
  })

  it('rejects a flat gallery file', () => {
    expect(isPhotoObjectPath('profiles/uid1/abc.jpg')).toBe(
      false
    )
  })
})

describe('isThumbnailObjectPath', () => {
  it('matches a PDF thumbnail path', () => {
    expect(
      isThumbnailObjectPath(
        'profiles/uid1/thumbnails/abc.png'
      )
    ).toBe(true)
  })

  it('rejects a non-thumbnail path', () => {
    expect(
      isThumbnailObjectPath('profiles/uid1/abc.jpg')
    ).toBe(false)
  })
})

describe('isResizeEligiblePath', () => {
  it('accepts a flat profile file', () => {
    expect(
      isResizeEligiblePath('profiles/uid1/abc.jpg')
    ).toBe(true)
  })

  it('accepts a profile photo subpath', () => {
    expect(
      isResizeEligiblePath('profiles/uid1/photo/abc.jpg')
    ).toBe(true)
  })

  it('accepts a flat project file', () => {
    expect(
      isResizeEligiblePath('projects/proj1/abc.jpg')
    ).toBe(true)
  })

  it('rejects a thumbnail path', () => {
    expect(
      isResizeEligiblePath(
        'projects/proj1/thumbnails/abc.png'
      )
    ).toBe(false)
  })

  it('rejects course assets', () => {
    expect(
      isResizeEligiblePath('courses/bio-101/abc.jpg')
    ).toBe(false)
  })

  it('rejects the legacy singular profilephoto prefix', () => {
    expect(
      isResizeEligiblePath('profilephoto/uid1.jpg')
    ).toBe(false)
  })

  it('rejects the legacy singular project prefix', () => {
    expect(
      isResizeEligiblePath('project/proj1/abc.jpg')
    ).toBe(false)
  })
})

describe('getResizeTarget', () => {
  it('returns a fixed square cover target for a photo path', () => {
    expect(
      getResizeTarget('profiles/uid1/photo/abc.jpg')
    ).toEqual({
      width: PHOTO_DIMENSION,
      height: PHOTO_DIMENSION,
      fit: 'cover',
    })
  })

  it('returns a bounded, non-enlarging target for a gallery path', () => {
    expect(
      getResizeTarget('profiles/uid1/abc.jpg')
    ).toEqual({
      width: GENERAL_MAX_DIMENSION,
      height: GENERAL_MAX_DIMENSION,
      fit: 'inside',
      withoutEnlargement: true,
    })
  })
})
