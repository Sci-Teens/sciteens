import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { doc, getDoc } from '@firebase/firestore'
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  UPLOAD_MIME_EXTENSIONS,
  createUniqueSlug,
  getFieldLabel,
  getProjectFieldOptions,
  getSafeUploadName,
  getTranslatedFieldsDict,
  resolveRefPath,
  validatePassword,
} from './helpers'

vi.mock('@firebase/firestore', () => ({
  doc: vi.fn((_db, collectionName, slug) => ({
    collectionName,
    slug,
  })),
  getDoc: vi.fn(),
}))

// Identity translator: lets assertions check against the raw key.
const t = (key) => key

function stubBrowserCrypto() {
  vi.stubGlobal('window', {
    crypto: { randomUUID: () => 'fixed-uuid' },
  })
}

describe('getSafeUploadName', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('the allowlist is images and PDF only, for now', () => {
    expect([...ALLOWED_UPLOAD_MIME_TYPES].sort()).toEqual(
      [
        'application/pdf',
        'image/jpeg',
        'image/jpg',
        'image/png',
      ].sort()
    )
  })

  it.each(Object.entries(UPLOAD_MIME_EXTENSIONS))(
    'maps %s to a "<id>.%s" name',
    (mimeType, ext) => {
      stubBrowserCrypto()
      expect(
        getSafeUploadName({
          name: 'whatever.bin',
          type: mimeType,
        })
      ).toBe(`fixed-uuid.${ext}`)
    }
  )

  it.each([
    'text/html',
    'application/msword',
    'application/octet-stream',
    'application/x-ipynb+json',
    '',
    undefined,
  ])(
    'rejects an unsupported MIME type (%j) with null',
    (type) => {
      expect(
        getSafeUploadName({ name: 'x.png', type })
      ).toBeNull()
    }
  )

  it('rejects a missing file', () => {
    expect(getSafeUploadName(undefined)).toBeNull()
  })

  const adversarialNames = [
    '../../etc/passwd',
    '..',
    '',
    '/abs/path/file.png',
    'C:\\Windows\\file.png',
    'a"><img src=x onerror=alert(1)>.png',
  ]

  // The extension and base always come from the MIME allowlist / a fresh
  // id, never from `file.name` — an adversarial name has zero effect on
  // the result.
  it.each(adversarialNames)(
    'ignores an adversarial file name entirely (browser path): %j',
    (name) => {
      stubBrowserCrypto()
      expect(
        getSafeUploadName({ name, type: 'image/png' })
      ).toBe('fixed-uuid.png')
    }
  )

  it.each(adversarialNames)(
    'never leaks "/", "\\", or ".." from an adversarial name (server path): %j',
    (name) => {
      const result = getSafeUploadName({
        name,
        type: 'image/png',
      })
      expect(result).not.toMatch(/\.\./)
      expect(result).not.toContain('/')
      expect(result).not.toContain('\\')
      expect(result).toMatch(/\.png$/)
    }
  )

  it('rejects an adversarial type just like any other unsupported type', () => {
    expect(
      getSafeUploadName({
        name: 'x',
        type: '../../etc/passwd',
      })
    ).toBeNull()
  })
})

describe('resolveRefPath', () => {
  it('returns null for missing or non-string refs', () => {
    expect(resolveRefPath(null)).toBeNull()
    expect(resolveRefPath(undefined)).toBeNull()
    expect(resolveRefPath('')).toBeNull()
    expect(resolveRefPath(123)).toBeNull()
  })

  it('returns null when the section or id is missing', () => {
    expect(resolveRefPath('project')).toBeNull()
    expect(resolveRefPath('project|')).toBeNull()
    expect(resolveRefPath('|abc123')).toBeNull()
  })

  it('rejects unknown sections', () => {
    expect(resolveRefPath('admin|abc123')).toBeNull()
    expect(resolveRefPath('users|abc123')).toBeNull()
  })

  it.each(['project', 'profile', 'article', 'course'])(
    'accepts the %s section',
    (section) => {
      expect(resolveRefPath(`${section}|abc123`)).toBe(
        `/${section}/abc123`
      )
    }
  )

  it('normalizes "projects" to "project"', () => {
    expect(resolveRefPath('projects|abc123')).toBe(
      '/project/abc123'
    )
  })

  it.each([
    'project|../../etc/passwd',
    'project|..',
    'project|abc/def',
    'project|abc\\def',
    'project|abc def',
    'project|<script>',
    'project|abc?x=1',
    'project|abc#frag',
  ])(
    'rejects ids with path separators, dot-segments, or special characters (%s)',
    (ref) => {
      expect(resolveRefPath(ref)).toBeNull()
    }
  )

  it('accepts ids with only the allowlisted characters', () => {
    expect(resolveRefPath('profile|abc_123-DEF')).toBe(
      '/profile/abc_123-DEF'
    )
  })
})

describe('getTranslatedFieldsDict / getProjectFieldOptions', () => {
  it('translates every known field key, including "All"', () => {
    const dict = getTranslatedFieldsDict(t)
    expect(dict.All).toBe('fields.all')
    expect(dict.Biology).toBe('fields.biology')
    expect(dict['Cognitive Science']).toBe(
      'fields.cognitive_science'
    )
    expect(dict['Space Science']).toBe(
      'fields.space_science'
    )
  })

  // Regression test: "All" was once saved as a real project field because
  // it leaked into the project create/edit field-picker options.
  it('getProjectFieldOptions excludes the "All" sentinel', () => {
    const options = getProjectFieldOptions(t)
    expect(options.All).toBeUndefined()
    expect('All' in options).toBe(false)
    expect(options.Biology).toBe('fields.biology')
    expect(Object.keys(options).length).toBe(
      Object.keys(getTranslatedFieldsDict(t)).length - 1
    )
  })
})

describe('getFieldLabel', () => {
  const translatedFields = getTranslatedFieldsDict(t)

  it('resolves an exact Title-Case match', () => {
    expect(getFieldLabel(translatedFields, 'Biology')).toBe(
      'fields.biology'
    )
  })

  // Regression test for the legacy-lowercase project `fields` bug.
  it('falls back to a case-insensitive match for legacy lowercase fields', () => {
    expect(getFieldLabel(translatedFields, 'biology')).toBe(
      'fields.biology'
    )
    expect(
      getFieldLabel(translatedFields, 'COMPUTER SCIENCE')
    ).toBe('fields.computer_science')
  })

  it('returns the raw value unchanged when no match exists', () => {
    expect(
      getFieldLabel(translatedFields, 'Not A Real Field')
    ).toBe('Not A Real Field')
  })

  it('passes through falsy field values', () => {
    expect(getFieldLabel(translatedFields, '')).toBe('')
    expect(getFieldLabel(translatedFields, null)).toBeNull()
    expect(
      getFieldLabel(translatedFields, undefined)
    ).toBeUndefined()
  })
})

describe('validatePassword', () => {
  it.each([
    ['Aa1! word', 'auth.password_whitespace'],
    ['aa1!aaaa', 'auth.password_uppercase'],
    ['AA1!AAAA', 'auth.password_lowercase'],
    ['Aa!AaAaA', 'auth.password_digit'],
    ['Aa1Aa1Aa', 'auth.password_symbol'],
    ['Aa1!Aa1', 'auth.password_length'],
  ])('rejects %j with %s', (password, expected) => {
    expect(validatePassword(password, t)).toBe(expected)
  })

  it.each(['Aa1!Aa1!', 'Sup3r$ecret', 'Tr0ub4dor&3xtra'])(
    'accepts a known-good password %j',
    (password) => {
      expect(validatePassword(password, t)).toBe('')
    }
  )
})

describe('createUniqueSlug', () => {
  beforeEach(() => {
    doc.mockClear()
    getDoc.mockReset()
  })

  it('returns the slug unchanged when it is not taken', async () => {
    getDoc.mockResolvedValueOnce({ exists: () => false })
    await expect(
      createUniqueSlug({}, 'john-doe', 'profile-slugs', 1)
    ).resolves.toBe('john-doe')
    expect(getDoc).toHaveBeenCalledTimes(1)
  })

  it('appends "-1" on the first collision', async () => {
    getDoc
      .mockResolvedValueOnce({ exists: () => true })
      .mockResolvedValueOnce({ exists: () => false })
    await expect(
      createUniqueSlug({}, 'john-doe', 'profile-slugs', 1)
    ).resolves.toBe('john-doe-1')
    expect(getDoc).toHaveBeenCalledTimes(2)
    expect(doc).toHaveBeenNthCalledWith(
      2,
      {},
      'profile-slugs',
      'john-doe-1'
    )
  })

  it('increments the trailing counter on repeated collisions', async () => {
    getDoc
      .mockResolvedValueOnce({ exists: () => true })
      .mockResolvedValueOnce({ exists: () => true })
      .mockResolvedValueOnce({ exists: () => false })
    await expect(
      createUniqueSlug({}, 'john-doe', 'profile-slugs', 1)
    ).resolves.toBe('john-doe-2')
    expect(getDoc).toHaveBeenCalledTimes(3)
  })

  // Regression guard: the increment regex must only ever touch the
  // appended "-N" counter, never digits already in the base slug
  // (`/[0-9]+(?!.*[0-9])/` matches the LAST digit run only).
  it('increments only the appended counter, not digits in the base slug', async () => {
    getDoc
      .mockResolvedValueOnce({ exists: () => true })
      .mockResolvedValueOnce({ exists: () => true })
      .mockResolvedValueOnce({ exists: () => false })
    await expect(
      createUniqueSlug({}, 'user2000', 'profile-slugs', 1)
    ).resolves.toBe('user2000-2')
  })
})
