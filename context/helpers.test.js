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
  onAuthStateChanged,
  signInWithPopup,
} from '@firebase/auth'
import {
  ALLOWED_LINK_HOSTS,
  ALLOWED_UPLOAD_MIME_TYPES,
  LEGACY_UNSUPPORTED_MIME_TYPES,
  MAX_LINKS,
  UPLOAD_MIME_EXTENSIONS,
  buildFileRecord,
  createUniqueSlug,
  getFieldLabel,
  getLinkPlatformLabel,
  getProjectFieldOptions,
  getSafeUploadName,
  getTranslatedFieldsDict,
  getUploadStoragePath,
  isAllowedLink,
  isLegacyUnsupportedFile,
  isSafeFileUrl,
  providerSignIn,
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

vi.mock('@firebase/auth', () => ({
  browserPopupRedirectResolver: {},
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn(),
  signInWithPopup: vi.fn(),
}))

// Identity translator: lets assertions check against the raw key.
const t = (key) => key

// Upload ids come from the platform CSPRNG (globalThis.crypto), which
// is present in every browser and in Node 19+.
function stubBrowserCrypto() {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'fixed-uuid',
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

  // No randomUUID (older Safari, non-secure contexts): the id must
  // still come from the CSPRNG, never Math.random.
  it('falls back to getRandomValues when randomUUID is unavailable', () => {
    const getRandomValues = vi.fn((bytes) => {
      bytes.fill(0xab)
      return bytes
    })
    vi.stubGlobal('crypto', { getRandomValues })
    expect(
      getSafeUploadName({ name: 'x', type: 'image/png' })
    ).toBe(`${'ab'.repeat(16)}.png`)
    expect(getRandomValues).toHaveBeenCalledOnce()
  })

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

describe('isLegacyUnsupportedFile', () => {
  it.each(LEGACY_UNSUPPORTED_MIME_TYPES)(
    'flags %s as legacy/unsupported',
    (type) => {
      expect(isLegacyUnsupportedFile(type)).toBe(true)
    }
  )

  it.each([
    'application/pdf',
    'image/png',
    'text/plain',
    '',
    undefined,
  ])('does not flag %j', (type) => {
    expect(isLegacyUnsupportedFile(type)).toBe(false)
  })
})

describe('isAllowedLink', () => {
  it.each([
    'https://github.com/sciteens/sciteens',
    'https://www.github.com/sciteens',
    'https://gist.github.com/sciteens',
    'https://youtube.com/watch?v=1',
    'https://www.youtube.com/watch?v=1',
    'https://youtu.be/abc123',
    'https://linkedin.com/in/sciteens',
    'https://www.linkedin.com/company/sciteens',
    'https://colab.research.google.com/drive/abc123',
  ])('accepts an allowlisted host (%s)', (url) => {
    expect(isAllowedLink(url)).toBe(true)
  })

  it.each([
    'https://evil.com',
    'https://notgithub.com',
    // Substring/suffix tricks that must not match the allowlist.
    'https://github.com.evil.com',
    'https://evilgithub.com',
    'http://github.com',
    'javascript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'ftp://github.com',
    // Colab lives at a specific subdomain — the bare/broader Google
    // hosts must not be swept in by it.
    'https://google.com',
    'https://research.google.com',
    'https://drive.google.com',
    '',
    null,
    undefined,
    'not a url',
  ])(
    'rejects a disallowed or malformed link (%j)',
    (url) => {
      expect(isAllowedLink(url)).toBe(false)
    }
  )

  it('exposes the allowlist and cap as plain constants', () => {
    expect(ALLOWED_LINK_HOSTS).toContain('github.com')
    expect(ALLOWED_LINK_HOSTS).toContain('youtube.com')
    expect(ALLOWED_LINK_HOSTS).toContain('linkedin.com')
    expect(ALLOWED_LINK_HOSTS).toContain(
      'colab.research.google.com'
    )
    expect(MAX_LINKS).toBeGreaterThan(0)
  })
})

describe('getLinkPlatformLabel', () => {
  it.each([
    ['https://github.com/sciteens', 'GitHub'],
    ['https://gist.github.com/sciteens', 'GitHub'],
    ['https://youtube.com/watch?v=1', 'YouTube'],
    ['https://youtu.be/abc123', 'YouTube'],
    ['https://linkedin.com/in/sciteens', 'LinkedIn'],
    [
      'https://colab.research.google.com/drive/abc',
      'Colab',
    ],
  ])('labels %s as %s', (url, label) => {
    expect(getLinkPlatformLabel(url)).toBe(label)
  })

  it('returns null for a disallowed or malformed link', () => {
    expect(getLinkPlatformLabel('https://evil.com')).toBe(
      null
    )
    expect(getLinkPlatformLabel('not a url')).toBe(null)
    expect(getLinkPlatformLabel(null)).toBe(null)
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

describe('providerSignIn', () => {
  const googleUser = {
    uid: 'uid-1',
    displayName: 'Ada Lovelace',
  }
  const existingProfile = { slug: 'ada-lovelace' }

  function router(query = {}) {
    return { query, push: vi.fn() }
  }

  beforeEach(() => {
    doc.mockClear()
    getDoc.mockReset()
    signInWithPopup.mockReset()
    onAuthStateChanged.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it('sends an existing profile to its own page', async () => {
    signInWithPopup.mockResolvedValue({ user: googleUser })
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => existingProfile,
    })
    const r = router()
    const setProfile = vi.fn()

    await expect(
      providerSignIn({}, {}, r, setProfile)
    ).resolves.toBe(true)

    expect(setProfile).toHaveBeenCalledWith(existingProfile)
    expect(r.push).toHaveBeenCalledWith(
      '/profile/ada-lovelace'
    )
  })

  it('prefers a ?ref= destination over the profile page', async () => {
    signInWithPopup.mockResolvedValue({ user: googleUser })
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => existingProfile,
    })
    const r = router({ ref: 'project|abc123' })

    await providerSignIn({}, {}, r, vi.fn())

    expect(r.push).toHaveBeenCalledWith('/project/abc123')
  })

  it('sends a user with no profile doc to /signup/finish', async () => {
    signInWithPopup.mockResolvedValue({ user: googleUser })
    getDoc.mockResolvedValue({ exists: () => false })
    const r = router()

    await providerSignIn({}, {}, r, vi.fn())

    expect(r.push).toHaveBeenCalledWith({
      pathname: '/signup/finish',
      query: { first_name: 'Ada', last_name: 'Lovelace' },
    })
  })

  it('omits name query params when Google gives no display name', async () => {
    signInWithPopup.mockResolvedValue({
      user: { uid: 'uid-2', displayName: null },
    })
    getDoc.mockResolvedValue({ exists: () => false })
    const r = router()

    await providerSignIn({}, {}, r, vi.fn())

    expect(r.push).toHaveBeenCalledWith({
      pathname: '/signup/finish',
      query: {},
    })
  })

  // The mobile bug: the popup poller rejects with
  // auth/popup-closed-by-user because this tab was frozen while the OAuth
  // tab was in front, but the auth event still lands and signs the user
  // in. Routing has to follow the auth state, not the rejection.
  it('still routes when the popup rejects after sign-in succeeded', async () => {
    signInWithPopup.mockRejectedValue(
      Object.assign(new Error('popup closed'), {
        code: 'auth/popup-closed-by-user',
      })
    )
    const unsubscribe = vi.fn()
    onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(null)
      setTimeout(() => cb(googleUser), 0)
      return unsubscribe
    })
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => existingProfile,
    })
    const r = router()

    await expect(
      providerSignIn({ currentUser: null }, {}, r, vi.fn())
    ).resolves.toBe(true)

    expect(r.push).toHaveBeenCalledWith(
      '/profile/ada-lovelace'
    )
    expect(unsubscribe).toHaveBeenCalled()
  })

  it('reports failure when the popup fails and no session appears', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    signInWithPopup.mockRejectedValue(
      Object.assign(new Error('popup blocked'), {
        code: 'auth/popup-blocked',
      })
    )
    const unsubscribe = vi.fn()
    onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(null)
      return unsubscribe
    })
    const r = router()

    const pending = providerSignIn(
      { currentUser: null },
      {},
      r,
      vi.fn()
    )
    await vi.advanceTimersByTimeAsync(3000)

    await expect(pending).resolves.toBe(false)
    expect(r.push).not.toHaveBeenCalled()
    expect(getDoc).not.toHaveBeenCalled()
    expect(unsubscribe).toHaveBeenCalled()
  })

  // A live session on the sign-in page (back button, shared device) is
  // not evidence that this sign-in worked.
  it('does not mistake a pre-existing session for a successful sign-in', async () => {
    vi.useFakeTimers()
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const stale = {
      uid: 'someone-else',
      displayName: 'Stale',
    }
    signInWithPopup.mockRejectedValue(
      Object.assign(new Error('popup closed'), {
        code: 'auth/popup-closed-by-user',
      })
    )
    onAuthStateChanged.mockImplementation((_auth, cb) => {
      cb(stale)
      return vi.fn()
    })
    const r = router()
    const setProfile = vi.fn()

    const pending = providerSignIn(
      { currentUser: stale },
      {},
      r,
      setProfile
    )
    await vi.advanceTimersByTimeAsync(3000)

    await expect(pending).resolves.toBe(false)
    expect(r.push).not.toHaveBeenCalled()
    expect(setProfile).not.toHaveBeenCalled()
    expect(getDoc).not.toHaveBeenCalled()
  })

  it('accepts a fresh session that replaces a pre-existing one', async () => {
    const stale = { uid: 'someone-else' }
    signInWithPopup.mockRejectedValue(
      Object.assign(new Error('popup closed'), {
        code: 'auth/popup-closed-by-user',
      })
    )
    onAuthStateChanged.mockImplementation((_auth, cb) => {
      setTimeout(() => cb(googleUser), 0)
      return vi.fn()
    })
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => existingProfile,
    })
    const r = router()

    await expect(
      providerSignIn({ currentUser: stale }, {}, r, vi.fn())
    ).resolves.toBe(true)

    expect(r.push).toHaveBeenCalledWith(
      '/profile/ada-lovelace'
    )
  })

  // A second tap cancels the first request; the winner does the routing,
  // so the superseded call must not paint an error over it.
  it('stays quiet when a second tap supersedes the request', async () => {
    signInWithPopup.mockRejectedValue(
      Object.assign(new Error('cancelled'), {
        code: 'auth/cancelled-popup-request',
      })
    )
    const r = router()

    await expect(
      providerSignIn({ currentUser: null }, {}, r, vi.fn())
    ).resolves.toBe(true)

    expect(r.push).not.toHaveBeenCalled()
    expect(onAuthStateChanged).not.toHaveBeenCalled()
  })

  it('reports failure when the profile lookup throws', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    signInWithPopup.mockResolvedValue({ user: googleUser })
    getDoc.mockRejectedValue(new Error('unavailable'))
    const r = router()

    await expect(
      providerSignIn({}, {}, r, vi.fn())
    ).resolves.toBe(false)

    expect(r.push).not.toHaveBeenCalled()
  })
})

describe('buildFileRecord', () => {
  const base = {
    storagePath: 'projects/p1/abc123.png',
    bucket: 'directed-relic-266701.appspot.com',
    name: 'my photo.png',
    contentType: 'image/png',
    size: 4096,
    url: 'https://firebasestorage.googleapis.com/x',
    uploadedBy: 'uid1',
  }

  it('carries every field through under its Firestore name', () => {
    const record = buildFileRecord(base)
    expect(record.path).toBe(base.storagePath)
    expect(record.bucket).toBe(base.bucket)
    expect(record.name).toBe(base.name)
    expect(record.contentType).toBe(base.contentType)
    expect(record.size).toBe(base.size)
    expect(record.url).toBe(base.url)
    expect(record.uploadedBy).toBe(base.uploadedBy)
  })

  it('defaults isPhoto to false', () => {
    expect(buildFileRecord(base).isPhoto).toBe(false)
  })

  it('honors an explicit isPhoto', () => {
    expect(
      buildFileRecord({ ...base, isPhoto: true }).isPhoto
    ).toBe(true)
  })

  it('defaults isResume to false', () => {
    expect(buildFileRecord(base).isResume).toBe(false)
  })

  it('honors an explicit isResume', () => {
    expect(
      buildFileRecord({ ...base, isResume: true }).isResume
    ).toBe(true)
  })

  it('defaults thumbnailUrl to null, never undefined (Firestore rejects undefined)', () => {
    expect(buildFileRecord(base).thumbnailUrl).toBeNull()
  })

  it('honors an explicit thumbnailUrl', () => {
    expect(
      buildFileRecord({
        ...base,
        thumbnailUrl: 'https://example.com/t.png',
      }).thumbnailUrl
    ).toBe('https://example.com/t.png')
  })

  it('stamps createdAt with a valid ISO timestamp', () => {
    const record = buildFileRecord(base)
    expect(record.createdAt).toEqual(expect.any(String))
    expect(Number.isNaN(Date.parse(record.createdAt))).toBe(
      false
    )
  })
})

describe('getUploadStoragePath', () => {
  it('puts a display photo under its own photo/ subpath', () => {
    expect(
      getUploadStoragePath(
        'profiles',
        'uid1',
        'abc123.jpg',
        true
      )
    ).toBe('profiles/uid1/photo/abc123.jpg')
  })

  it('puts a non-photo file at the flat prefix', () => {
    expect(
      getUploadStoragePath(
        'profiles',
        'uid1',
        'abc123.jpg',
        false
      )
    ).toBe('profiles/uid1/abc123.jpg')
  })

  it('works for the project owner prefix too', () => {
    expect(
      getUploadStoragePath(
        'projects',
        'proj1',
        'abc123.jpg',
        true
      )
    ).toBe('projects/proj1/photo/abc123.jpg')
  })
})

// `url`/`thumbnailUrl` on a file record are client-written and get
// rendered as an href/src on public pages, so this is the render-time
// half of firestore.rules#isStorageUrl.
describe('isSafeFileUrl', () => {
  it.each([
    'https://firebasestorage.googleapis.com/v0/b/directed-relic-266701.appspot.com/o/f1.png?alt=media',
    'https://storage.googleapis.com/directed-relic-266701.appspot.com/f1.png',
    'https://directed-relic-266701.firebasestorage.app/f1.png',
  ])('accepts %s', (url) => {
    expect(isSafeFileUrl(url)).toBe(true)
  })

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'http://firebasestorage.googleapis.com/v0/b/x/o/f1.png',
    'https://evil.example/f1.png',
    // Credentials before the host: the guard reads the parsed
    // hostname, so the real host here is evil.example.
    'https://firebasestorage.googleapis.com@evil.example/f1.png',
    // Trailing-dot FQDN resolves to the same host but is not the
    // literal allowlist entry, so it fails closed.
    'https://firebasestorage.googleapis.com./f1.png',
    // Suffix, not a subdomain of, an allowlisted host.
    'https://firebasestorage.googleapis.com.evil.example/f1.png',
    'https://notfirebasestorage.app/f1.png',
    'https://storage.googleapis.com/attacker-bucket/page.html',
    'https://firebasestorage.googleapis.com/v0/b/attacker.appspot.com/o/page.html',
    'https://attacker.firebasestorage.app/page.html',
    '//evil.example/f1.png',
    // Only ever produced pre-upload, and never persisted: the rules
    // reject a blob: url at write time.
    'blob:https://sciteens.org/8f1c-4b2a',
    '',
    null,
    undefined,
    42,
  ])('rejects %s', (url) => {
    expect(isSafeFileUrl(url)).toBe(false)
  })
})
