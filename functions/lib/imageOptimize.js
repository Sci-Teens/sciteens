// Resize/recompress targets for uploaded images, applied by the
// fileUpload trigger in functions/index.js. Mirrored in
// scripts/lib/imageOptimize.js for the one-off backfill migration
// (scripts/backfill-optimize-images.js) that re-processes images
// uploaded before this existed — keep the two in sync by hand if
// these numbers ever change.
//
// - Profile/project "display photo" (uploaded to a `.../photo/`
//   subpath — see context/helpers.js#getUploadStoragePath): shown at
//   most at 96px (components/ProfilePhoto.js) / 160px (ProjectCard,
//   desktop). 400x400 covers up to ~4x pixel density at the largest
//   on-site usage while staying tiny.
// - Any other uploaded image (profile/project gallery file): shown up
//   to 768px wide (project detail hero, FileGallery's lightbox
//   `max-w-3xl`). 1600px longest edge covers ~2x retina at that size.
const PHOTO_DIMENSION = 400
const GENERAL_MAX_DIMENSION = 1600
const WEBP_QUALITY = 82

function isPhotoObjectPath(objectPath) {
  return /\/photo\//.test(objectPath)
}

function isThumbnailObjectPath(objectPath) {
  return /\/thumbnails\//.test(objectPath)
}

// profiles/{uid}/... or projects/{projectId}/... (flat, or the
// /photo/ subpath above), excluding /thumbnails/ — the only prefixes
// this trigger/migration ever resizes. courses/ (Prismic-managed) and
// the legacy singular profilephoto//project/ prefixes are left
// untouched, matching the fileUpload function's existing handling of
// those as separate branches.
function isResizeEligiblePath(objectPath) {
  if (isThumbnailObjectPath(objectPath)) return false
  return (
    /^profiles\//.test(objectPath) ||
    /^projects\//.test(objectPath)
  )
}

function getResizeTarget(objectPath) {
  return isPhotoObjectPath(objectPath)
    ? {
        width: PHOTO_DIMENSION,
        height: PHOTO_DIMENSION,
        fit: 'cover',
      }
    : {
        width: GENERAL_MAX_DIMENSION,
        height: GENERAL_MAX_DIMENSION,
        fit: 'inside',
        withoutEnlargement: true,
      }
}

module.exports = {
  PHOTO_DIMENSION,
  GENERAL_MAX_DIMENSION,
  WEBP_QUALITY,
  isPhotoObjectPath,
  isThumbnailObjectPath,
  isResizeEligiblePath,
  getResizeTarget,
}
