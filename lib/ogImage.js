// Falls back to the production domain so og:image/twitter:image stay
// absolute URLs even when a page doesn't have request context handy;
// override per-environment with NEXT_PUBLIC_SITE_URL if ever needed.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL || 'https://sciteens.com'

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
