import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { INLINE_LINK } from '@/lib/typography'

export default function CollectionProgramCard({ program }) {
  const { t } = useTranslation('common')
  const [imageFailed, setImageFailed] = useState(false)

  return (
    <Card className="border-border/60 h-full overflow-hidden shadow-sm">
      {program.imageUrl && !imageFailed && (
        <figure>
          <div className="bg-muted relative aspect-[16/9]">
            <Image
              src={program.imageUrl}
              alt=""
              fill
              sizes="(min-width: 1024px) 552px, (min-width: 768px) 90vw, 100vw"
              className={
                program.imageFit === 'cover'
                  ? 'object-cover'
                  : 'object-scale-down p-6'
              }
              onError={() => setImageFailed(true)}
            />
          </div>
          {program.imageSource &&
            program.imageCaptionKey && (
              <figcaption className="text-muted-foreground px-6 pt-3 text-xs leading-relaxed">
                <a
                  href={program.imageSource}
                  className="underline underline-offset-4"
                >
                  {t(program.imageCaptionKey)}
                </a>
              </figcaption>
            )}
        </figure>
      )}
      <CardContent className="flex flex-1 flex-col p-6">
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
        <div className="mt-auto pt-6">
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
