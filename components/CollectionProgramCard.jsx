import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { INLINE_LINK } from '@/lib/typography'
import { ArrowUpRight } from 'lucide-react'

export default function CollectionProgramCard({
  program,
  priority = false,
}) {
  const { t } = useTranslation('common')
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <Card className="border-border/60 overflow-hidden shadow-sm">
      {program.imageUrl && !imageFailed && (
        <figure>
          <div
            className={
              program.imageKind === 'logo'
                ? 'relative mx-6 mt-6 h-12 w-40'
                : 'bg-muted relative aspect-[16/9]'
            }
          >
            <Image
              src={program.imageUrl}
              priority={priority}
              alt={
                program.imageAltKey
                  ? t(program.imageAltKey)
                  : ''
              }
              fill
              sizes={
                program.imageKind === 'logo'
                  ? '160px'
                  : '(min-width: 1184px) 562px, (min-width: 1024px) calc(50vw - 30px), calc(100vw - 34px)'
              }
              className={
                program.imageKind === 'logo'
                  ? 'object-contain object-left'
                  : 'object-cover'
              }
              style={{
                objectPosition: program.imagePosition,
              }}
              onError={() => setImageFailed(true)}
            />
          </div>
          {program.imageCaptionKey && (
            <figcaption className="text-muted-foreground flex items-start justify-between gap-3 px-6 pt-3 text-xs leading-relaxed">
              <span>{t(program.imageCaptionKey)}</span>
              {program.imageSource && (
                <a
                  href={program.imageSource}
                  aria-label={t(
                    'opportunity_collections.image_source_label',
                    { program: program.name }
                  )}
                  className="hover:text-foreground min-h-6 focus-visible:ring-ring inline-flex shrink-0 items-center gap-1 rounded-lg px-1 font-medium outline-none focus-visible:ring-2"
                >
                  {t(
                    'opportunity_collections.image_source'
                  )}
                  <ArrowUpRight
                    aria-hidden="true"
                    className="size-3"
                  />
                </a>
              )}
            </figcaption>
          )}
        </figure>
      )}
      <CardContent className="p-6">
        <h3 className="text-pretty text-xl font-semibold">
          {program.slug ? (
            <Link
              href={`/program/${program.slug}`}
              className="hover:text-sciteensGreen-dark underline-offset-4 hover:underline"
            >
              {program.name}
            </Link>
          ) : (
            program.name
          )}
        </h3>
        <p className="text-muted-foreground mt-2 text-sm">
          {t(
            `opportunity_collections.formats.${program.format}`
          )}
        </p>
        <dl className="mt-6 space-y-4 text-sm leading-relaxed">
          {['eligibility', 'cost', 'work'].map((field) => (
            <div key={field}>
              <dt className="font-semibold">
                {t(`opportunity_collections.${field}`)}
              </dt>
              <dd className="text-muted-foreground mt-1">
                {t(
                  `opportunity_collections.programs.${program.id}.${field}`
                )}
              </dd>
            </div>
          ))}
        </dl>
        <div className="pt-6">
          {program.slug && (
            <Link
              href={`/program/${program.slug}`}
              className={`${INLINE_LINK} inline-block text-sm`}
            >
              {t('opportunity_collections.details')}
            </Link>
          )}
          <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {program.sources.map((source, index) => (
              <li key={source}>
                <a href={source} className={INLINE_LINK}>
                  {t(
                    'opportunity_collections.official_source',
                    {
                      number: index + 1,
                    }
                  )}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}
