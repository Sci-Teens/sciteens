// Shared PDF first-page rasterization. Used two ways:
//  - components/PdfThumbnail.js: live client-side preview for a PDF
//    that has no persisted thumbnail yet (freshly dropped, not yet
//    uploaded, or an older record from before thumbnails existed).
//  - pages/project/*, pages/profile/[slug]/edit.js: generate a small
//    PNG once at upload time and persist it (buildFileRecord's
//    `thumbnailUrl`), so every later page view can render an <img>
//    instead of re-downloading and re-rendering the whole PDF through
//    pdfjs on every visit.
// Rendered well above typical on-page display size (a 64px list row,
// a ~300px gallery card) so downscaling via CSS stays crisp instead
// of upscaling a blurry raster; the persisted PNG this produces at
// upload time is still only tens of KB for a single page.
const THUMBNAIL_HEIGHT = 480

// `source` is either a Blob/File (has `.arrayBuffer()`) or a plain
// `{ url }` descriptor (an already-uploaded file record).
export async function renderPdfFirstPage(source, canvas) {
  const pdfjsLib = await import('pdfjs-dist')
  // Self-hosted worker copied into public/ by scripts/copy-pdf-worker.js
  // — see that script's comment for why (this repo's webpack config
  // can't resolve pdfjs-dist's bare-specifier `new URL(...)` pattern).
  pdfjsLib.GlobalWorkerOptions.workerSrc =
    '/pdf.worker.min.mjs'

  const data =
    typeof source?.arrayBuffer === 'function'
      ? await source.arrayBuffer()
      : await (await fetch(source.url)).arrayBuffer()

  const pdf = await pdfjsLib.getDocument({ data }).promise
  const page = await pdf.getPage(1)
  // Target a small thumbnail height; width follows the page's aspect ratio.
  const unscaled = page.getViewport({ scale: 1 })
  const viewport = page.getViewport({
    scale: THUMBNAIL_HEIGHT / unscaled.height,
  })

  canvas.width = viewport.width
  canvas.height = viewport.height
  const context = canvas.getContext('2d')
  await page.render({ canvasContext: context, viewport })
    .promise
  return canvas
}

function canvasToPngBlob(canvas) {
  if (typeof canvas.convertToBlob === 'function') {
    // OffscreenCanvas
    return canvas.convertToBlob({ type: 'image/png' })
  }
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob)
      else reject(new Error('canvas.toBlob() failed'))
    }, 'image/png')
  })
}

// Renders `file`'s (a PDF Blob/File) first page and returns it as a
// small PNG Blob, ready to upload alongside the source file. Callers
// must treat this as best-effort — a corrupt/encrypted/unrenderable
// PDF should still be uploadable without a thumbnail.
export async function generatePdfThumbnailBlob(file) {
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(1, 1)
      : document.createElement('canvas')
  await renderPdfFirstPage(file, canvas)
  return canvasToPngBlob(canvas)
}
