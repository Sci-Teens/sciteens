// File containing helper functions
import { doc, getDoc } from '@firebase/firestore'
import {
  browserPopupRedirectResolver,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
} from '@firebase/auth'
import moment from 'moment'

export async function createUniqueSlug(
  firestore,
  check_slug,
  collection,
  num
) {
  const doc_ref = doc(firestore, collection, check_slug)
  const res = await getDoc(doc_ref)
  if (res.exists()) {
    if (num == 1) {
      check_slug = check_slug + '-' + 1
    } else {
      check_slug = check_slug.replace(
        /[0-9]+(?!.*[0-9])/,
        function (match) {
          return parseInt(match, 10) + 1
        }
      )
    }

    num += 1
    return createUniqueSlug(
      firestore,
      check_slug,
      collection,
      num
    )
  } else {
    return check_slug
  }
}

// signInWithPopup races two things: the auth event coming back from the
// popup, and a poller that rejects with auth/popup-closed-by-user once it
// sees the popup window closed. Mobile browsers lose that race routinely
// — the OAuth page opens as a sibling tab, the OS freezes this one while
// it is backgrounded, and the poller only runs again after the popup is
// already gone (firebase-js-sdk#7807). The event still lands and still
// signs the user in, so the rejection says nothing about whether sign-in
// succeeded; only the auth state does.
const AUTH_SETTLE_MS = 3000

function awaitSignedInUser(auth, before) {
  if (auth.currentUser && auth.currentUser !== before)
    return Promise.resolve(auth.currentUser)
  return new Promise((resolve) => {
    let timer
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user || user === before) return
      clearTimeout(timer)
      unsubscribe()
      resolve(user)
    })
    timer = setTimeout(() => {
      unsubscribe()
      resolve(null)
    }, AUTH_SETTLE_MS)
  })
}

// Resolves false when sign-in genuinely failed, so the caller can say so.
export async function providerSignIn(
  auth,
  firestore,
  router,
  setProfile
) {
  const provider = new GoogleAuthProvider()
  // A session can already be live here (back button, shared device), and
  // it must never be mistaken for the result of this sign-in. Every
  // successful sign-in installs a freshly built User, so identity
  // comparison separates the two even when the same account re-auths.
  const before = auth.currentUser
  let user
  try {
    // Resolver passed per call, not baked into the Auth instance: see
    // lib/firebase.js. This is the only code path that needs the
    // firebaseapp.com helper iframe, so it is also the only one that
    // should pay to load it.
    const res = await signInWithPopup(
      auth,
      provider,
      browserPopupRedirectResolver
    )
    user = res.user
  } catch (e) {
    // A second tap supersedes this call; whichever one wins routes.
    if (e.code === 'auth/cancelled-popup-request')
      return true
    user = await awaitSignedInUser(auth, before)
    if (!user) {
      console.error(e)
      return false
    }
  }

  // Whether the profile doc exists, not getAdditionalUserInfo's
  // isNewUser: the recovery path above has no UserCredential to read, and
  // anyone who abandoned /signup/finish still needs sending back there
  // rather than bouncing to a profile that was never created.
  let prof
  try {
    prof = await getDoc(
      doc(firestore, 'profiles', user.uid)
    )
  } catch (e) {
    console.error(e)
    return false
  }
  if (!prof.exists()) {
    const [first_name = '', last_name = ''] = (
      user.displayName || ''
    ).split(' ')
    router.push({
      pathname: '/signup/finish',
      query: Object.fromEntries(
        Object.entries({ first_name, last_name }).filter(
          ([, v]) => v
        )
      ),
    })
    return true
  }

  setProfile(prof.data())
  const dest = resolveRefPath(router.query.ref)
  router.push(
    dest ||
      (prof.data().slug
        ? `/profile/${prof.data().slug}`
        : '/')
  )
  return true
}

export function getTranslatedFieldsDict(t) {
  // Returns dictionary of translated fields
  const FIELD_NAMES = {
    All: t('fields.all'),
    Biology: t('fields.biology'),
    Chemistry: t('fields.chemistry'),
    'Cognitive Science': t('fields.cognitive_science'),
    'Computer Science': t('fields.computer_science'),
    'Earth Science': t('fields.earth_science'),
    'Electrical Engineering': t(
      'fields.electrical_engineering'
    ),
    'Environmental Science': t(
      'fields.environmental_science'
    ),
    Mathematics: t('fields.mathematics'),
    'Mechanical Engineering': t(
      'fields.mechanical_engineering'
    ),
    Medicine: t('fields.medicine'),
    Physics: t('fields.physics'),
    'Space Science': t('fields.space_science'),
  }

  return FIELD_NAMES
}

export function getProjectFieldOptions(t) {
  // Same dict, minus the "All" sentinel — for UIs where a user picks
  // the field(s) a specific project belongs to (create/edit forms).
  // "All" only makes sense as a filter option, never as project data.
  const { All: _all, ...fields } =
    getTranslatedFieldsDict(t)
  return fields
}

export function getFieldLabel(translatedFields, field) {
  // Legacy project docs store `fields` lowercase; the dict above is
  // keyed Title Case, so fall back to a case-insensitive match before
  // giving up and showing the raw stored value.
  if (!field) return field
  if (translatedFields[field])
    return translatedFields[field]
  const key = Object.keys(translatedFields).find(
    (k) => k.toLowerCase() === field.toLowerCase()
  )
  return key ? translatedFields[key] : field
}

export function formatGradeRange(low, high, t) {
  if (!low || !high) return ''
  const isSingleGradeProgram = low === high
  return isSingleGradeProgram
    ? t('opportunities.grade_single', { grade: low })
    : t('opportunities.grades', { low, high })
}

export function validatePassword(password, t) {
  // Validate a password, with support for translations (t)
  const isWhitespace = /^(?=.*\s)/
  const isContainsSymbol =
    /^(?=.*[~`!@#$%^&*()--+={}\[\]|\\:;"'<>,.?/_₹])/
  const isContainsUppercase = /^(?=.*[A-Z])/
  const isContainsLowercase = /^(?=.*[a-z])/
  const isContainsNumber = /^(?=.*[0-9])/
  const isValidLength = /^.{8,100}$/

  if (isWhitespace.test(password)) {
    return t('auth.password_whitespace')
  } else if (!isContainsUppercase.test(password)) {
    return t('auth.password_uppercase')
  } else if (!isContainsLowercase.test(password)) {
    return t('auth.password_lowercase')
  } else if (!isContainsNumber.test(password)) {
    return t('auth.password_digit')
  } else if (!isContainsSymbol.test(password)) {
    return t('auth.password_symbol')
  } else if (!isValidLength.test(password)) {
    return t('auth.password_length')
  } else {
    return ''
  }
}

// A File's `name` is fully attacker-controlled (a client-side upload can
// supply any string, including path separators or traversal segments),
// so the stored object's name is never derived from it. Uploads are
// limited to images and PDFs for now — the extension is looked up from
// this owned MIME allowlist and the base is always freshly generated, so
// the result can never carry injected text; the original name is
// preserved only as Storage metadata for display. This is also the
// single source of truth for which types the upload dropzones accept
// (`ALLOWED_UPLOAD_MIME_TYPES`).
export const UPLOAD_MIME_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'application/pdf': 'pdf',
}

export const ALLOWED_UPLOAD_MIME_TYPES = Object.keys(
  UPLOAD_MIME_EXTENSIONS
)

// MIME types accepted by uploads before the allowlist above was
// introduced. Files already sitting in Storage with one of these types
// (pre-existing project/profile attachments) must never render as a
// clickable link — Office documents can carry macros/active content and
// nothing here scans them server-side (unlike the safeSearch check that
// runs on images). See scripts/convert-legacy-files.js, the one-off
// tool that converts and removes them.
export const LEGACY_UNSUPPORTED_MIME_TYPES = [
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
]

export function isLegacyUnsupportedFile(type) {
  return LEGACY_UNSUPPORTED_MIME_TYPES.includes(type)
}

// Hosts a project's or profile's "Links" field may point to. Kept
// intentionally small — this is the only thing standing between a
// project/profile page and hosting an arbitrary (phishing/malware)
// outbound link, since anyone who owns the document can otherwise
// write anything to its `links` array directly through the
// Firestore SDK. Extend deliberately.
export const ALLOWED_LINK_HOSTS = [
  'github.com',
  'youtube.com',
  'youtu.be',
  'linkedin.com',
  'colab.research.google.com',
]

export const MAX_LINKS = 10

// Bounds on the project-invite document the create/edit forms write.
// firestore.rules enforces the same numbers, and newProjectInvite
// re-checks them again before spending Resend quota; mirrored here so
// an honest user is stopped by a field error instead of a
// permission-denied thrown after the project doc has already been
// committed.
export const MAX_PROJECT_MEMBERS = 10
export const MAX_PROJECT_TITLE = 200

// True only for an https URL whose hostname is, or is a subdomain of,
// an entry in ALLOWED_LINK_HOSTS. This is the single point of
// enforcement — called both when a link is added in the create/edit
// forms and again right before it's rendered as an anchor on the
// project page, since stored data can never be trusted on its own.
export function isAllowedLink(url) {
  if (typeof url !== 'string' || !url) return false
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  const host = parsed.hostname.toLowerCase()
  return ALLOWED_LINK_HOSTS.some(
    (allowed) =>
      host === allowed || host.endsWith(`.${allowed}`)
  )
}

// Human-readable platform name for an allowlisted link, for display
// (e.g. next to a profile's outbound links). Returns null for
// anything isAllowedLink rejects — never trust the URL enough to
// invent a label for a host that isn't on the allowlist.
const LINK_HOST_LABELS = {
  'github.com': 'GitHub',
  'youtube.com': 'YouTube',
  'youtu.be': 'YouTube',
  'linkedin.com': 'LinkedIn',
  'colab.research.google.com': 'Colab',
}

export function getLinkPlatformLabel(url) {
  if (!isAllowedLink(url)) return null
  const host = new URL(url).hostname.toLowerCase()
  const matchedHost = Object.keys(LINK_HOST_LABELS).find(
    (allowed) =>
      host === allowed || host.endsWith(`.${allowed}`)
  )
  return matchedHost ? LINK_HOST_LABELS[matchedHost] : null
}

// Stored file records can only reference this application's bucket.
// Firestore rules enforce the same boundary at write time.
const STORAGE_BUCKET = 'directed-relic-266701.appspot.com'
const STORAGE_BUCKET_HOST =
  'directed-relic-266701.firebasestorage.app'

export function isSafeFileUrl(url) {
  if (typeof url !== 'string' || !url) return false
  let parsed
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  const host = parsed.hostname.toLowerCase()
  if (host === 'firebasestorage.googleapis.com') {
    return parsed.pathname.startsWith(
      `/v0/b/${STORAGE_BUCKET}/o/`
    )
  }
  if (host === 'storage.googleapis.com') {
    return parsed.pathname.startsWith(`/${STORAGE_BUCKET}/`)
  }
  return host === STORAGE_BUCKET_HOST
}

function generateUploadId() {
  const cryptoObj = globalThis.crypto
  if (cryptoObj?.randomUUID) return cryptoObj.randomUUID()
  // Storage object names must not be guessable or collidable, so the
  // fallback still draws from the CSPRNG rather than Math.random.
  const bytes = new Uint8Array(16)
  cryptoObj.getRandomValues(bytes)
  return Array.from(bytes, (b) =>
    b.toString(16).padStart(2, '0')
  ).join('')
}

// Returns a safe "<id>.<ext>" storage name for `file`, or null when
// `file.type` isn't in the allowlist above. Callers must skip the
// upload on a null return — this is the defense-in-depth check behind
// the dropzones' `accept` prop, for anything that reaches here despite
// (or without going through) that UI-level filter.
export function getSafeUploadName(file) {
  const ext = UPLOAD_MIME_EXTENSIONS[file?.type]
  if (!ext) return null
  return `${generateUploadId()}.${ext}`
}

// Storage path for a freshly uploaded profile/project file. A
// display photo goes under its own `photo/` subpath (mirroring the
// existing `thumbnails/` subpath convention) so the fileUpload Cloud
// Function (functions/index.js + functions/lib/imageOptimize.js) can
// tell it apart from a regular gallery file by path alone and resize
// it down to the small dimensions it's actually ever displayed at,
// without racing the Firestore `isPhoto` write that happens after
// this upload completes.
export function getUploadStoragePath(
  ownerPrefix,
  ownerId,
  safeName,
  isPhoto
) {
  return isPhoto
    ? `${ownerPrefix}/${ownerId}/photo/${safeName}`
    : `${ownerPrefix}/${ownerId}/${safeName}`
}

// Builds the Firestore record written alongside every Storage upload,
// at `projects/{id}/files/{fileId}` or `profiles/{uid}/files/{fileId}`
// — `fileId` is always the object's own basename (getSafeUploadName's
// return value), so the two can never drift apart. This record is
// now the source of truth for "what files does this project/profile
// have" instead of listing the Storage bucket — listAll()+
// getMetadata() per file is slow, and downloading the full blob just
// to render a preview/icon doesn't scale to large files.
export function buildFileRecord({
  storagePath,
  bucket,
  name,
  contentType,
  size,
  url,
  uploadedBy,
  isPhoto = false,
  isResume = false,
  thumbnailUrl = null,
}) {
  return {
    path: storagePath,
    bucket,
    name,
    contentType,
    size,
    url,
    uploadedBy,
    isPhoto,
    isResume,
    // Firestore rejects `undefined` field values outright, so this is
    // explicitly nullable rather than an omitted key — a PDF whose
    // thumbnail generation failed (or any non-PDF upload, which never
    // gets one) still needs a well-formed record.
    thumbnailUrl,
    createdAt: moment().toISOString(),
  }
}

// Resolve a post-login `?ref=section|id` query into an internal path,
// allowing only known section prefixes. Returns null if the ref is
// missing or references an unknown section.
export function resolveRefPath(ref) {
  if (!ref || typeof ref !== 'string') return null
  const parts = ref.split('|')
  if (parts.length < 2 || !parts[0] || !parts[1])
    return null
  let section = parts[0]
  if (section === 'projects') section = 'project'
  const allowed = [
    'project',
    'profile',
    'article',
    'course',
  ]
  if (!allowed.includes(section)) return null
  // Reject IDs containing path separators, dot-segments, or any
  // character outside the safe set. Never mutate/strip — that can
  // silently redirect to a different resource.
  const id = parts[1]
  if (!/^[A-Za-z0-9_-]+$/.test(id)) return null
  return `/${section}/${id}`
}
