import { canonicalProgramSlug } from './legacyRoutes.cjs'

// All public absolute URLs use the production canonical origin. A deployment
// host must redirect here instead of changing metadata to point at itself.
export const SITE_URL = 'https://sciteens.org'

export function getCanonicalUrl(path = '/', locale) {
  const url = new URL(path, SITE_URL)
  const prefix = url.pathname.match(/^\/(es|fr|hi)(?=\/|$)/)
  let pathname =
    url.pathname.replace(/^\/(?:es|fr|hi)(?=\/|$)/, '') ||
    '/'
  const language = locale || prefix?.[1] || 'en'
  if (pathname.startsWith('/program/')) {
    const slug = pathname.slice('/program/'.length)
    pathname = `/program/${canonicalProgramSlug(slug)}`
  }
  const localized =
    language !== 'en' &&
    ['es', 'fr', 'hi'].includes(language)
      ? `/${language}${pathname === '/' ? '' : pathname}`
      : pathname
  return `${SITE_URL}${localized}`
}

// Builds the absolute URL for the dynamically generated social card
// served by pages/api/og.jsx. `eyebrow` drives the card's accent color
// and type label (e.g. "Article", "Course", "Project", "Profile").
export function getOgImageUrl({
  title,
  description,
  eyebrow,
  badge,
} = {}) {
  // The card already shows the SciTeens wordmark, so the trailing
  // " | SciTeens" suffix used in page <title>s would be redundant here.
  const cardTitle = title?.replace(
    /\s*\|\s*SciTeens\s*$/i,
    ''
  )
  const params = new URLSearchParams()
  if (cardTitle) params.set('title', cardTitle)
  if (description) params.set('description', description)
  if (eyebrow) params.set('eyebrow', eyebrow)
  if (badge) params.set('badge', badge)
  return `${SITE_URL}/api/og?${params.toString()}`
}
