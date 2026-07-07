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
// quality }` — never `height` — so the target height is fixed
// per call site rather than threaded through the loader.
export function createCropImageLoader(
  fallbackWidth,
  height
) {
  return function cropImageLoader({ src, width }) {
    return appendImgixParams(
      src,
      `fit=crop&crop=faces&w=${
        width || fallbackWidth
      }&h=${height}`
    )
  }
}

// Scales down without cropping — for free-form rich text
// content images that keep their native aspect ratio.
export function maxWidthImageLoader({ src, width }) {
  return appendImgixParams(src, `fit=max&w=${width}`)
}
