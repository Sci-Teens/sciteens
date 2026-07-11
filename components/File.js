import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useTranslation } from 'next-i18next'
import { FileText, FileWarning, X } from 'lucide-react'
import { isLegacyUnsupportedFile } from '../context/helpers'

const PdfThumbnail = dynamic(
  () => import('./PdfThumbnail'),
  { ssr: false }
)

function RemoveButton({ id, removeFile }) {
  if (!removeFile) return null
  return (
    <button
      className="m-1 shrink-0 text-red-600"
      onClick={(e) => removeFile(e, id)}
    >
      <X className="h-4 w-4" />
    </button>
  )
}

// Shared shell for anything that isn't safe/useful to open in place —
// legacy Office documents and any other type this app doesn't
// recognize. Deliberately not an <a>: no href, no click target.
function UnsupportedFile({ file, id, removeFile, reason }) {
  return (
    <div className="bg-card flex w-full justify-between rounded-lg shadow-sm">
      <FileWarning className="m-1 h-11 w-11 shrink-0 text-amber-600" />
      <div className="ml-2 flex-1 text-left">
        <p className="line-clamp-1" title={file?.name}>
          {file?.name}
        </p>
        <p className="line-clamp-2 text-muted-foreground text-sm">
          {reason}
        </p>
      </div>
      <RemoveButton id={id} removeFile={removeFile} />
    </div>
  )
}

// `file` is either a real File/Blob (dropzone-picked, not yet
// uploaded) or a plain `{ name, type, size?, url, thumbnailUrl? }`
// descriptor (an already-uploaded Firestore file record) — the latter
// never needs a blob download just to render a preview.
export function getPreviewUrl(file) {
  if (file?.url) return file.url
  if (typeof file?.arrayBuffer === 'function') {
    return URL.createObjectURL(file)
  }
  return null
}

export default function RenderFile({
  file,
  id,
  removeFile,
}) {
  const { t } = useTranslation('common')

  if (isLegacyUnsupportedFile(file?.type)) {
    return (
      <UnsupportedFile
        file={file}
        id={id}
        removeFile={removeFile}
        reason={t('file.unsupported_legacy')}
      />
    )
  }

  const previewUrl = getPreviewUrl(file)

  switch (file?.type) {
    case 'application/pdf':
      return (
        <a
          className="bg-card flex w-full justify-between rounded-lg shadow-sm"
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
        >
          <div className="bg-muted relative h-16 w-[10%] shrink-0 overflow-hidden rounded-l-lg">
            <FileText className="absolute inset-0 m-auto h-8 w-8 text-red-600" />
            {file?.thumbnailUrl ? (
              // Persisted at upload time — no pdfjs, no re-fetching
              // the whole PDF just to show a preview.
              <Image
                src={file.thumbnailUrl}
                alt=""
                fill
                unoptimized
                className="object-cover object-top"
              />
            ) : (
              <PdfThumbnail
                file={file}
                className="absolute inset-0 h-full w-full object-cover object-top"
              />
            )}
          </div>
          <div className="line-clamp-1 ml-2 flex-1 p-2 text-left">
            <p title={file?.name}>{file?.name}</p>
            <p className="text-muted-foreground text-sm">
              application/pdf
            </p>
          </div>
          <RemoveButton id={id} removeFile={removeFile} />
        </a>
      )
    case 'image/jpeg':
    case 'image/png':
    case 'image/jpg':
      return (
        <a
          className="bg-card flex w-full justify-between rounded-lg shadow-sm transition-all duration-500"
          href={previewUrl}
          target="_blank"
          rel="noreferrer"
        >
          <Image
            src={previewUrl}
            alt="Project"
            width={256}
            height={256}
            unoptimized
            className="h-16 w-[10%] rounded-l-lg object-cover object-center"
          />
          <div className="line-clamp-1 ml-2 flex-1 p-2 text-left">
            <p title={file?.name}>{file?.name}</p>
            <p className="text-muted-foreground text-sm">
              image
            </p>
          </div>
          {removeFile && (
            <button
              className="m-1 h-4 w-4 fill-current text-red-600"
              onClick={(e) => removeFile(e, id)}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4 fill-current"
                viewBox="0 0 20 20"
              >
                <path d="M2.93 17.07A10 10 0 1 1 17.07 2.93 10 10 0 0 1 2.93 17.07zM11.4 10l2.83-2.83-1.41-1.41L10 8.59 7.17 5.76 5.76 7.17 8.59 10l-2.83 2.83 1.41 1.41L10 11.41l2.83 2.83 1.41-1.41L11.41 10z" />
              </svg>
            </button>
          )}
        </a>
      )
    default:
      return (
        <UnsupportedFile
          file={file}
          id={id}
          removeFile={removeFile}
          reason={
            file?.type
              ? t('file.unknown_type', { type: file.type })
              : t('file.unknown_type_generic')
          }
        />
      )
  }
}
