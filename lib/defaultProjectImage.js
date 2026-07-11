// Projects with no uploaded photo used to show a bare neutral icon on
// /projects — a blank-looking card next to every project that does
// have a photo. These abstract, brand-green SVGs (public/assets/
// project-defaults/) stand in instead: vague enough not to visually
// compete with a project's own photo once one is added, on-brand
// enough not to look like generic stock art (deliberately not
// Unsplash-style photography). Selection is deterministic per project
// id — like a GitHub identicon, the same project always gets the same
// default instead of one that shuffles on every render/reload.
const DEFAULT_PROJECT_IMAGES = [
  '/assets/project-defaults/default-1.svg',
  '/assets/project-defaults/default-2.svg',
  '/assets/project-defaults/default-3.svg',
  '/assets/project-defaults/default-4.svg',
  '/assets/project-defaults/default-5.svg',
  '/assets/project-defaults/default-6.svg',
  '/assets/project-defaults/default-7.svg',
  '/assets/project-defaults/default-8.svg',
]

// djb2 string hash — small, dependency-free, and stable across
// browsers/Node (unlike relying on object/Map iteration order or
// anything tied to a particular JS engine's string hashing).
function hashString(value) {
  let hash = 5381
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return hash >>> 0
}

export function getDefaultProjectImage(id) {
  const key = String(id || '')
  const index = key
    ? hashString(key) % DEFAULT_PROJECT_IMAGES.length
    : 0
  return DEFAULT_PROJECT_IMAGES[index]
}
