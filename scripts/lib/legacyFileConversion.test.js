import { describe, expect, it } from 'vitest'
import {
  LEGACY_MIME_EXTENSIONS,
  CURRENT_ALLOWED_MIME_TYPES,
  isLegacyOfficeMimeType,
  isAllowedMimeType,
  isExcludedPath,
  classifyObject,
  deriveConvertedObjectPath,
  deriveLocalConvertedFilename,
  buildSofficeConvertArgv,
  deriveConvertedDisplayName,
  buildConvertedFileRecord,
} from './legacyFileConversion'

describe('isLegacyOfficeMimeType', () => {
  it('accepts all four legacy Office content types', () => {
    for (const mime of Object.keys(
      LEGACY_MIME_EXTENSIONS
    )) {
      expect(isLegacyOfficeMimeType(mime)).toBe(true)
    }
  })

  it('rejects images, pdf, and unrelated types', () => {
    expect(isLegacyOfficeMimeType('image/png')).toBe(false)
    expect(isLegacyOfficeMimeType('application/pdf')).toBe(
      false
    )
    expect(isLegacyOfficeMimeType('application/zip')).toBe(
      false
    )
    expect(isLegacyOfficeMimeType(undefined)).toBe(false)
  })
})

describe('isAllowedMimeType', () => {
  it('accepts the current post-restriction allowlist', () => {
    for (const mime of CURRENT_ALLOWED_MIME_TYPES) {
      expect(isAllowedMimeType(mime)).toBe(true)
    }
  })

  it('rejects legacy Office types', () => {
    expect(isAllowedMimeType('application/msword')).toBe(
      false
    )
  })
})

describe('isExcludedPath', () => {
  it('excludes anything under courses/', () => {
    expect(
      isExcludedPath('courses/intro-to-bio/slides.pptx')
    ).toBe(true)
  })

  it('does not exclude profiles/ or projects/', () => {
    expect(
      isExcludedPath('profiles/uid123/resume.doc')
    ).toBe(false)
    expect(
      isExcludedPath('projects/proj123/report.docx')
    ).toBe(false)
  })
})

describe('classifyObject', () => {
  it('routes a legacy .doc under projects/ to convert', () => {
    expect(
      classifyObject({
        path: 'projects/abc123/report.doc',
        contentType: 'application/msword',
      })
    ).toEqual({
      action: 'convert',
      sourceExtension: 'doc',
    })
  })

  it('routes a legacy .pptx under profiles/ to convert', () => {
    expect(
      classifyObject({
        path: 'profiles/uid1/slides.pptx',
        contentType:
          'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      })
    ).toEqual({
      action: 'convert',
      sourceExtension: 'pptx',
    })
  })

  it('skips images and PDFs as already-allowed', () => {
    expect(
      classifyObject({
        path: 'profiles/uid1/avatar.png',
        contentType: 'image/png',
      })
    ).toEqual({ action: 'skip-allowed' })
    expect(
      classifyObject({
        path: 'projects/p1/paper.pdf',
        contentType: 'application/pdf',
      })
    ).toEqual({ action: 'skip-allowed' })
  })

  it('flags an unexpected non-image/non-pdf type as unknown, not a guess-convert', () => {
    expect(
      classifyObject({
        path: 'projects/p1/archive.zip',
        contentType: 'application/zip',
      })
    ).toEqual({ action: 'skip-unknown' })
  })

  it('excludes courses/ objects even when the content type is a legacy Office type', () => {
    expect(
      classifyObject({
        path: 'courses/intro-to-bio/slides.pptx',
        contentType: 'application/vnd.ms-powerpoint',
      })
    ).toEqual({ action: 'excluded' })
  })

  it('trusts a .pptx extension when content type is a generic octet-stream (matches production)', () => {
    expect(
      classifyObject({
        path: 'projects/p1/Fluid Dynamics Presentation.pptx',
        contentType: 'application/octet-stream',
      })
    ).toEqual({
      action: 'convert',
      sourceExtension: 'pptx',
    })
  })

  it('trusts a .doc/.docx/.ppt extension when content type is missing entirely', () => {
    expect(
      classifyObject({
        path: 'profiles/u1/report.doc',
        contentType: undefined,
      })
    ).toEqual({ action: 'convert', sourceExtension: 'doc' })
    expect(
      classifyObject({
        path: 'profiles/u1/report.docx',
        contentType: '',
      })
    ).toEqual({
      action: 'convert',
      sourceExtension: 'docx',
    })
    expect(
      classifyObject({
        path: 'projects/p1/old.ppt',
        contentType: 'application/octet-stream',
      })
    ).toEqual({ action: 'convert', sourceExtension: 'ppt' })
  })

  it('does not let a legacy-looking extension override an already-allowed content type', () => {
    expect(
      classifyObject({
        path: 'projects/p1/renamed.pptx',
        contentType: 'application/pdf',
      })
    ).toEqual({ action: 'skip-allowed' })
  })

  it('is case-insensitive on the extension', () => {
    expect(
      classifyObject({
        path: 'projects/p1/Slides.PPTX',
        contentType: 'application/octet-stream',
      })
    ).toEqual({
      action: 'convert',
      sourceExtension: 'pptx',
    })
  })
})

describe('deriveConvertedObjectPath', () => {
  it('keeps the directory prefix and swaps in the generated id', () => {
    expect(
      deriveConvertedObjectPath(
        'projects/abc123/report.doc',
        'new-id-1'
      )
    ).toBe('projects/abc123/new-id-1.pdf')
  })

  it('handles a bucket-root path with no directory prefix', () => {
    expect(
      deriveConvertedObjectPath('report.doc', 'new-id-2')
    ).toBe('new-id-2.pdf')
  })

  it('never leaks an adversarial original filename into the derived path', () => {
    const adversarial =
      'profiles/uid1/../../etc/passwd; rm -rf /.docx'
    const result = deriveConvertedObjectPath(
      adversarial,
      'new-id-3'
    )
    // lastIndexOf('/') finds the true last separator, so everything up to
    // and including it is treated as the directory to preserve — only
    // the basename after it (the untrusted part) is discarded.
    expect(result).toBe(
      'profiles/uid1/../../etc/passwd; rm -rf /new-id-3.pdf'
    )

    const traversalBasename =
      'profiles/uid1/../../../etc/passwd.doc'
    expect(
      deriveConvertedObjectPath(
        traversalBasename,
        'new-id-4'
      )
    ).toBe('profiles/uid1/../../../etc/new-id-4.pdf')
  })

  it('throws without a freshly generated id rather than silently reusing the original name', () => {
    expect(() =>
      deriveConvertedObjectPath('projects/p1/report.doc')
    ).toThrow()
  })
})

describe('deriveLocalConvertedFilename', () => {
  it('swaps the extension for .pdf', () => {
    expect(
      deriveLocalConvertedFilename('input-abc.docx')
    ).toBe('input-abc.pdf')
  })

  it('handles a filename with no extension', () => {
    expect(deriveLocalConvertedFilename('input-abc')).toBe(
      'input-abc.pdf'
    )
  })
})

describe('buildSofficeConvertArgv', () => {
  it('builds a headless single-file conversion argv with an isolated profile', () => {
    const argv = buildSofficeConvertArgv({
      inputPath: '/tmp/work/input.docx',
      outputDir: '/tmp/work/out',
      profileDir: '/tmp/work/lo-profile',
    })
    expect(argv).toEqual([
      '-env:UserInstallation=file:///tmp/work/lo-profile',
      '--headless',
      '--convert-to',
      'pdf',
      '--outdir',
      '/tmp/work/out',
      '/tmp/work/input.docx',
    ])
  })

  it('requires all three path arguments', () => {
    expect(() =>
      buildSofficeConvertArgv({
        inputPath: '/tmp/input.docx',
        outputDir: '/tmp/out',
      })
    ).toThrow()
  })
})

describe('deriveConvertedDisplayName', () => {
  it('swaps a legacy Office extension for .pdf', () => {
    expect(
      deriveConvertedDisplayName(
        'Slides.pptx',
        'fallback.pdf'
      )
    ).toBe('Slides.pdf')
  })

  it('appends .pdf to a name with no extension', () => {
    expect(
      deriveConvertedDisplayName('Slides', 'fallback.pdf')
    ).toBe('Slides.pdf')
  })

  it('falls back to the converted basename when there is no previous name', () => {
    expect(
      deriveConvertedDisplayName(null, 'a1b2.pdf')
    ).toBe('a1b2.pdf')
    expect(
      deriveConvertedDisplayName(undefined, 'a1b2.pdf')
    ).toBe('a1b2.pdf')
  })
})

describe('buildConvertedFileRecord', () => {
  it('carries the previous record name (extension swapped) and uploader over', () => {
    const record = buildConvertedFileRecord({
      newPath: 'projects/p1/newid123.pdf',
      bucketName: 'sciteens-5b706.appspot.com',
      size: 4096,
      previousRecord: {
        name: 'Slides.pptx',
        uploadedBy: 'uid-1',
      },
    })

    expect(record).toMatchObject({
      path: 'projects/p1/newid123.pdf',
      bucket: 'sciteens-5b706.appspot.com',
      name: 'Slides.pdf',
      contentType: 'application/pdf',
      size: 4096,
      uploadedBy: 'uid-1',
      isPhoto: false,
      thumbnailUrl: null,
    })
    expect(record.url).toBe(
      'https://firebasestorage.googleapis.com/v0/b/sciteens-5b706.appspot.com/o/projects%2Fp1%2Fnewid123.pdf?alt=media'
    )
    expect(typeof record.createdAt).toBe('string')
  })

  it('falls back to a generated name and null uploader when there is no previous record', () => {
    const record = buildConvertedFileRecord({
      newPath: 'profiles/u1/newid456.pdf',
      bucketName: 'sciteens-5b706.appspot.com',
      size: 2048,
      previousRecord: null,
    })

    expect(record.name).toBe('newid456.pdf')
    expect(record.uploadedBy).toBeNull()
  })

  it('never marks a converted PDF as a project/profile photo', () => {
    const record = buildConvertedFileRecord({
      newPath: 'projects/p1/newid789.pdf',
      bucketName: 'sciteens-5b706.appspot.com',
      size: 10,
      previousRecord: { isPhoto: true },
    })

    expect(record.isPhoto).toBe(false)
  })
})
