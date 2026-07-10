import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import dynamic from 'next/dynamic'
import { useTranslation } from 'next-i18next'
import { ExternalLink, FileText } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'
import RenderFile, { getPreviewUrl } from './File'
import { isLegacyUnsupportedFile } from '../context/helpers'

const PdfThumbnail = dynamic(
  () => import('./PdfThumbnail'),
  { ssr: false }
)

const IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/jpg']

// Only images and PDFs get the gallery treatment below; anything else
// (legacy Office docs, unrecognized types) falls back to File.js's
// existing non-clickable warning row — those are edge cases, not
// worth a bespoke card.
function classify(file) {
  if (isLegacyUnsupportedFile(file?.type)) return 'other'
  if (file?.type === 'application/pdf') return 'pdf'
  if (IMAGE_TYPES.includes(file?.type)) return 'image'
  return 'other'
}

// The image lightbox's own dialog body: an embla Carousel (shadcn's
// wrapper) so slide state, keyboard arrow-key navigation, and the
// prev/next buttons all come from the shared primitive instead of
// bespoke state. Re-mounted fresh each time the dialog opens (the
// parent only renders this once `lightboxIndex` is non-null), so
// `startIndex` only has to be correct once.
function ImageLightbox({ images, startIndex }) {
  const { t } = useTranslation('common')
  const [api, setApi] = useState(null)
  const [current, setCurrent] = useState(startIndex)

  useEffect(() => {
    if (!api) return
    setCurrent(api.selectedScrollSnap())
    api.on('select', () =>
      setCurrent(api.selectedScrollSnap())
    )
  }, [api])

  const file = images[current]?.file

  return (
    <>
      <DialogTitle className="sr-only">
        {file?.name}
      </DialogTitle>
      <Carousel
        setApi={setApi}
        opts={{ startIndex, loop: images.length > 1 }}
        className="px-6 pt-6"
      >
        <CarouselContent className="-ml-0">
          {images.map(({ file, key }) => (
            <CarouselItem
              key={key}
              className="flex items-center justify-center pl-0"
            >
              <div className="relative h-[65vh] w-full">
                <Image
                  src={getPreviewUrl(file)}
                  alt=""
                  fill
                  unoptimized
                  className="object-contain"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
        {images.length > 1 && (
          <>
            <CarouselPrevious
              className="text-foreground left-2"
              aria-label={t('file.previous')}
            />
            <CarouselNext
              className="text-foreground right-2"
              aria-label={t('file.next')}
            />
          </>
        )}
      </Carousel>
      <div className="flex items-center justify-between px-6 pb-6 text-white">
        <p className="truncate text-sm" title={file?.name}>
          {file?.name}
        </p>
        {images.length > 1 && (
          <span className="shrink-0 pl-2 text-xs text-white/70">
            {current + 1} / {images.length}
          </span>
        )}
      </div>
    </>
  )
}

// Read-only display for a project/profile/course's uploaded files.
// File.js itself stays the compact, removable row used by the
// upload dropzones (create/edit forms) — this is the "look at what's
// here" surface: images get a browsable thumbnail grid with a
// lightbox, PDFs get a page-preview card that opens an inline
// viewer, instead of every file looking like an identical list row.
export default function FileGallery({ files }) {
  const { t } = useTranslation('common')
  const items = useMemo(
    () =>
      (files ?? []).map((file, index) => ({
        file,
        key: file?.id ?? file?.name ?? index,
      })),
    [files]
  )
  const images = items.filter(
    ({ file }) => classify(file) === 'image'
  )
  const pdfs = items.filter(
    ({ file }) => classify(file) === 'pdf'
  )
  const other = items.filter(
    ({ file }) => classify(file) === 'other'
  )
  const groupCount = [images, pdfs, other].filter(
    (group) => group.length > 0
  ).length

  const [lightboxIndex, setLightboxIndex] = useState(null)
  const [openPdf, setOpenPdf] = useState(null)

  return (
    <div className="space-y-4">
      {images.length > 0 && (
        <div>
          {groupCount > 1 && (
            <h3 className="text-muted-foreground mb-2 text-sm font-semibold">
              {t('file.images')}
            </h3>
          )}
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
            {images.map(({ file, key }, index) => (
              <button
                key={key}
                type="button"
                onClick={() => setLightboxIndex(index)}
                aria-label={file?.name}
                className="focus-visible:ring-ring group block"
              >
                <Card className="relative aspect-square overflow-hidden p-0">
                  <Image
                    src={getPreviewUrl(file)}
                    alt=""
                    fill
                    unoptimized
                    sizes="(min-width: 768px) 25vw, 50vw"
                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span
                    className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-left text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                    title={file?.name}
                  >
                    {file?.name}
                  </span>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {pdfs.length > 0 && (
        <div>
          {groupCount > 1 && (
            <h3 className="text-muted-foreground mb-2 text-sm font-semibold">
              {t('file.documents')}
            </h3>
          )}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {pdfs.map(({ file, key }) => (
              <button
                key={key}
                type="button"
                onClick={() => setOpenPdf(file)}
                className="group block text-left"
              >
                <Card className="overflow-hidden p-0 transition hover:shadow-md">
                  <div className="relative aspect-[3/4] w-full overflow-hidden bg-gray-100">
                    <FileText className="absolute inset-0 m-auto h-10 w-10 text-red-600" />
                    {file?.thumbnailUrl ? (
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
                  <CardContent className="flex items-center gap-1.5 p-2">
                    <FileText className="h-4 w-4 shrink-0 text-red-600" />
                    <p
                      className="truncate text-sm"
                      title={file?.name}
                    >
                      {file?.name}
                    </p>
                  </CardContent>
                </Card>
              </button>
            ))}
          </div>
        </div>
      )}

      {other.length > 0 && (
        <div className="flex flex-col items-center space-y-2">
          {other.map(({ file, key }) => (
            <RenderFile file={file} id={key} key={key} />
          ))}
        </div>
      )}

      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={(open) =>
          !open && setLightboxIndex(null)
        }
      >
        <DialogContent
          showCloseButton
          className="[&_button]:text-white max-w-3xl border-none bg-transparent p-0 shadow-none sm:max-w-3xl"
        >
          {lightboxIndex !== null && (
            <ImageLightbox
              images={images}
              startIndex={lightboxIndex}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={openPdf !== null}
        onOpenChange={(open) => !open && setOpenPdf(null)}
      >
        <DialogContent className="flex h-[85vh] max-w-4xl flex-col sm:max-w-4xl">
          <div className="flex items-center justify-between gap-2 pr-8">
            <DialogTitle
              className="truncate text-base"
              title={openPdf?.name}
            >
              {openPdf?.name}
            </DialogTitle>
            {openPdf && (
              <a
                href={getPreviewUrl(openPdf)}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({
                  variant: 'ghost',
                  size: 'sm',
                  className: 'shrink-0',
                })}
              >
                <ExternalLink className="h-4 w-4" />
                {t('file.open_new_tab')}
              </a>
            )}
          </div>
          {openPdf && (
            <iframe
              src={getPreviewUrl(openPdf)}
              title={openPdf.name}
              className="border-border/60 h-full w-full flex-1 rounded-lg border"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
