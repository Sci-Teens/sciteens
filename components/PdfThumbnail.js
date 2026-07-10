import { useEffect, useRef, useState } from 'react'
import { renderPdfFirstPage } from '../lib/pdfThumbnail'

// Live client-side PDF preview for a file with no persisted thumbnail
// yet (see lib/pdfThumbnail.js). Loaded via next/dynamic({ssr: false})
// from File.js so pdfjs-dist only ships to the client when actually
// needed. `file` is a Blob/File or an already-uploaded `{url}`
// descriptor — either way this re-renders the whole PDF's first page
// on every mount, which is exactly what a persisted `thumbnailUrl`
// exists to avoid; File.js only falls back to this component when one
// isn't available.
export default function PdfThumbnail({ file, className }) {
  const canvasRef = useRef(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false
    setReady(false)
    if (canvasRef.current) {
      renderPdfFirstPage(file, canvasRef.current)
        .then(() => {
          if (!cancelled) setReady(true)
        })
        .catch((error) => {
          console.error(
            'Failed to render PDF thumbnail',
            error
          )
        })
    }
    return () => {
      cancelled = true
    }
  }, [file])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`${className} ${
        ready ? 'opacity-100' : 'opacity-0'
      } transition-opacity duration-300`}
    />
  )
}
