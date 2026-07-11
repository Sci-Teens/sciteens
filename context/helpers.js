// File containing helper functions
import { doc, getDoc } from '@firebase/firestore'
import {
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
} from '@firebase/auth'
import { useState, useRef, useEffect } from 'react'
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

export async function providerSignIn(
  auth,
  firestore,
  router,
  setProfile
) {
  const provider = new GoogleAuthProvider()
  try {
    const res = await signInWithPopup(auth, provider)
    const addInfo = await getAdditionalUserInfo(res)
    if (addInfo.isNewUser) {
      // Complete profile
      router.push(
        `/signup/finish${
          res.user.displayName
            ? `?first_name=${
                res.user.displayName.split(' ')[0]
              }&last_name=${
                res.user.displayName.split(' ')[1]
              }`
            : ''
        }`
      )
    } else {
      const prof = await getDoc(
        doc(firestore, 'profiles', res.user.uid)
      )
      setProfile(prof.data())
      const dest = resolveRefPath(router.query.ref)
      router.push(
        dest
          ? dest
          : prof.data()?.slug
          ? `/profile/${prof.data().slug}`
          : '/'
      )
    }
  } catch (e) {
    console.error(e)
  }
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

export function useIntersectionObserver(
  ref,
  options,
  forward = true
) {
  const [element, setElement] = useState(null)
  const [isIntersecting, setIsIntersecting] =
    useState(false)
  const observer = useRef(null)

  const cleanOb = () => {
    if (observer.current) {
      observer.current.disconnect()
    }
  }

  useEffect(() => {
    setElement(ref.current)
  }, [ref])

  useEffect(() => {
    if (!element) return
    cleanOb()
    const ob = (observer.current = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting
        if (!forward) {
          setIsIntersecting(isElementIntersecting)
        } else if (
          forward &&
          !isIntersecting &&
          isElementIntersecting
        ) {
          setIsIntersecting(isElementIntersecting)
          cleanOb()
        }
      },
      { ...options }
    ))
    ob.observe(element)
    return () => {
      cleanOb()
    }
  }, [element, options])

  return isIntersecting
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

// Hosts a project's "Links" field may point to. Kept intentionally
// small — this is the only thing standing between a project page and
// hosting an arbitrary (phishing/malware) outbound link, since anyone
// who owns a project can otherwise write anything to its `links` array
// directly through the Firestore SDK. Extend deliberately.
export const ALLOWED_LINK_HOSTS = [
  'github.com',
  'youtube.com',
  'youtu.be',
  'colab.research.google.com',
]

export const MAX_PROJECT_LINKS = 10

// True only for an https URL whose hostname is, or is a subdomain of,
// an entry in ALLOWED_LINK_HOSTS. This is the single point of
// enforcement — called both when a link is added in the create/edit
// forms and again right before it's rendered as an anchor on the
// project page, since stored data can never be trusted on its own.
export function isAllowedProjectLink(url) {
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

function generateUploadId() {
  return typeof window !== 'undefined' &&
    window.crypto?.randomUUID
    ? window.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`
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
