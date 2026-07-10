import { describe, expect, it } from 'vitest'
import {
  isExcludedPath,
  isDirectoryPlaceholder,
  classifyObjectOwner,
  isPhotoUrlForObject,
  buildFileRecord,
} from './fileRecordBackfill'

describe('isExcludedPath', () => {
  it('excludes anything under courses/', () => {
    expect(
      isExcludedPath('courses/intro-to-bio/syllabus.pdf')
    ).toBe(true)
  })

  it('does not exclude profiles/ or projects/', () => {
    expect(isExcludedPath('profiles/uid1/abc.png')).toBe(
      false
    )
    expect(isExcludedPath('projects/proj1/abc.pdf')).toBe(
      false
    )
  })
})

describe('isDirectoryPlaceholder', () => {
  it('flags zero-byte directory marker objects', () => {
    expect(isDirectoryPlaceholder('projects/proj1/')).toBe(
      true
    )
  })

  it('does not flag real files', () => {
    expect(
      isDirectoryPlaceholder('projects/proj1/abc.png')
    ).toBe(false)
  })
})

describe('classifyObjectOwner', () => {
  it('classifies a project object', () => {
    expect(
      classifyObjectOwner('projects/proj1/abc123.png')
    ).toEqual({ kind: 'project', ownerId: 'proj1' })
  })

  it('classifies a profile object', () => {
    expect(
      classifyObjectOwner('profiles/uid1/abc123.pdf')
    ).toEqual({ kind: 'profile', ownerId: 'uid1' })
  })

  it('excludes courses/ objects', () => {
    expect(
      classifyObjectOwner('courses/bio-101/syllabus.pdf')
    ).toEqual({ kind: null })
  })

  it('skips directory placeholder objects', () => {
    expect(classifyObjectOwner('projects/proj1/')).toEqual({
      kind: null,
    })
  })

  it('skips objects nested deeper than <prefix>/<ownerId>/<basename>', () => {
    expect(
      classifyObjectOwner(
        'projects/proj1/nested/abc123.png'
      )
    ).toEqual({ kind: null })
  })

  it('skips unrecognized top-level prefixes', () => {
    expect(
      classifyObjectOwner('programs/prog1/abc123.pdf')
    ).toEqual({ kind: null })
  })
})

describe('isPhotoUrlForObject', () => {
  const objectName = 'projects/proj1/3f8a-generated-id.png'
  const photoUrl = `https://firebasestorage.googleapis.com/v0/b/scratch.appspot.com/o/${encodeURIComponent(
    objectName
  )}?alt=media&token=abc`

  it('matches when the stored URL encodes this exact object path', () => {
    expect(isPhotoUrlForObject(photoUrl, objectName)).toBe(
      true
    )
  })

  it('does not match a different object under the same owner', () => {
    expect(
      isPhotoUrlForObject(
        photoUrl,
        'projects/proj1/other-file.png'
      )
    ).toBe(false)
  })

  it('handles a decoded-form URL as well', () => {
    const decodedUrl = `https://firebasestorage.googleapis.com/v0/b/scratch.appspot.com/o/${objectName}?alt=media`
    expect(
      isPhotoUrlForObject(decodedUrl, objectName)
    ).toBe(true)
  })

  it('returns false for missing or malformed input rather than throwing', () => {
    expect(isPhotoUrlForObject(null, objectName)).toBe(
      false
    )
    expect(isPhotoUrlForObject(photoUrl, undefined)).toBe(
      false
    )
    expect(
      isPhotoUrlForObject('%E0%A4%A', objectName)
    ).toBe(false)
  })
})

describe('buildFileRecord', () => {
  it('derives the full record shape from a Storage object descriptor', () => {
    const object = {
      name: 'projects/proj1/3f8a-generated-id.png',
      metadata: {
        contentType: 'image/png',
        size: '12345',
        timeCreated: '2024-01-15T10:30:00.000Z',
        metadata: {},
      },
    }
    const record = buildFileRecord({
      object,
      bucketName: 'scratch.appspot.com',
      isPhoto: true,
    })
    expect(record).toEqual({
      path: 'projects/proj1/3f8a-generated-id.png',
      bucket: 'scratch.appspot.com',
      name: '3f8a-generated-id.png',
      contentType: 'image/png',
      size: 12345,
      url: 'https://firebasestorage.googleapis.com/v0/b/scratch.appspot.com/o/projects%2Fproj1%2F3f8a-generated-id.png?alt=media',
      uploadedBy: null,
      isPhoto: true,
      createdAt: '2024-01-15T10:30:00.000Z',
    })
  })

  it('falls back to the basename when no originalName custom metadata exists', () => {
    const object = {
      name: 'profiles/uid1/generated-id.pdf',
      metadata: {
        contentType: 'application/pdf',
        size: 999,
        timeCreated: '2023-06-01T00:00:00.000Z',
      },
    }
    const record = buildFileRecord({
      object,
      bucketName: 'scratch.appspot.com',
      isPhoto: false,
    })
    expect(record.name).toBe('generated-id.pdf')
    expect(record.isPhoto).toBe(false)
  })

  it('prefers a preserved originalName over the basename when present', () => {
    const object = {
      name: 'profiles/uid1/generated-id.pdf',
      metadata: {
        contentType: 'application/pdf',
        size: 999,
        timeCreated: '2023-06-01T00:00:00.000Z',
        metadata: { originalName: 'My Resume.pdf' },
      },
    }
    const record = buildFileRecord({
      object,
      bucketName: 'scratch.appspot.com',
      isPhoto: false,
    })
    expect(record.name).toBe('My Resume.pdf')
  })
})
