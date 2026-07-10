// Prismic serves images through an imgix-compatible CDN
// (`images.prismic.io`) that already appends its own query
// string (`?auto=compress,format`). A `next/image` loader must
// append additional imgix params with `&`, not `?`, or the
// second `?` breaks the query string and the request 404s.
function appendImgixParams(src, params) {
  const separator = src.includes('?') ? '&' : '?'
  return `${src}${separator}${params}`
}

// `next/image` loaders only ever receive `{ src, width,
// quality }` — never `height` — so a fixed `height` would drift
// out of aspect ratio whenever `next/image` requests a
// different `width` (a smaller device size on mobile, or a 2x
// DPR srcset entry). Deriving the crop height from the
// `fallbackWidth:height` ratio instead keeps every requested
// width cropped to the same aspect ratio the call site intended.
export function createCropImageLoader(
  fallbackWidth,
  height
) {
  const aspectRatio = fallbackWidth / height
  return function cropImageLoader({ src, width }) {
    const targetWidth = width || fallbackWidth
    const targetHeight = Math.round(
      targetWidth / aspectRatio
    )
    return appendImgixParams(
      src,
      `fit=crop&crop=faces&w=${targetWidth}&h=${targetHeight}`
    )
  }
}

// Scales down without cropping — for free-form rich text
// content images that keep their native aspect ratio.
export function maxWidthImageLoader({ src, width }) {
  return appendImgixParams(src, `fit=max&w=${width}`)
}
