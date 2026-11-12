import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SocialMeta from '@/components/SocialMeta'
import StructuredData from '@/components/StructuredData'
import PageHeading from '@/components/PageHeading'
import HeadingRule from '@/components/HeadingRule'
import OpportunityCollectionLinks from '@/components/OpportunityCollectionLinks'
import CollectionProgramCard from '@/components/CollectionProgramCard'
import { buttonVariants } from '@/components/ui/button'
import { formatMediumDate } from '@/lib/formatDate'
import { INLINE_LINK } from '@/lib/typography'
import { breadcrumbStructuredData } from '@/lib/structuredData'

export default function OpportunityCollection({
  collection,
  locale,
}) {
  const { t } = useTranslation('common')
  const prefix = `opportunity_collections.pages.${collection.key}`
  const localePrefix = locale === 'en' ? '' : `/${locale}`
  const path = `${localePrefix}/opportunities/${collection.slug}`

  return (
    <>
      <SocialMeta
        title={`${t(`${prefix}.title`)} | SciTeens`}
        description={t(`${prefix}.description`)}
        path={path}
      />
      <StructuredData
        id="collection-breadcrumbs"
        data={breadcrumbStructuredData([
          {
            name: t(
              'opportunity_collections.all_opportunities'
            ),
            path: `${localePrefix}/opportunities`,
          },
          { name: t(`${prefix}.title`), path },
        ])}
      />
      <div className="px-4 pb-16 pt-10 md:pt-16">
        <div className="mx-auto max-w-6xl">
          <nav
            aria-label={t(
              'opportunity_collections.breadcrumb'
            )}
          >
            <Link
              href="/opportunities"
              className={INLINE_LINK}
            >
              {t(
                'opportunity_collections.all_opportunities'
              )}
            </Link>
          </nav>
          <div className="mt-6 max-w-3xl">
            <PageHeading>
              {t(`${prefix}.title`)}
            </PageHeading>
            <HeadingRule />
            <p className="text-muted-foreground mt-6 text-base leading-relaxed md:text-lg">
              {t(`${prefix}.description`)}
            </p>
            <p className="text-muted-foreground mt-4 text-sm">
              {t('opportunity_collections.reviewed', {
                date: formatMediumDate(
                  collection.reviewedAt,
                  locale
                ),
              })}
            </p>
          </div>

          <section
            aria-labelledby="collection-comparison"
            className="mt-10"
          >
            <h2
              id="collection-comparison"
              className="text-xl font-semibold md:text-2xl"
            >
              {t('opportunity_collections.compare_heading')}
            </h2>
            <p className="text-muted-foreground mt-3 max-w-3xl text-sm leading-relaxed">
              {t('opportunity_collections.source_note')}
            </p>
            <ul className="mt-6 grid gap-6 lg:grid-cols-2">
              {collection.programs.map((program) => (
                <li key={program.id} className="min-w-0">
                  <CollectionProgramCard
                    program={program}
                  />
                </li>
              ))}
            </ul>
          </section>

          <section
            className="border-border/60 mt-10 max-w-3xl border-t pt-8"
            aria-labelledby="collection-selection"
          >
            <h2
              id="collection-selection"
              className="text-xl font-semibold md:text-2xl"
            >
              {t(
                'opportunity_collections.selection_heading'
              )}
            </h2>
            <p className="mt-4 leading-relaxed">
              {t(`${prefix}.selection`)}
            </p>
            <h3 className="mt-7 text-lg font-semibold">
              {t('opportunity_collections.before_apply')}
            </h3>
            <p className="mt-3 leading-relaxed">
              {t(`${prefix}.advice`)}
            </p>
            <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
              {t(
                'opportunity_collections.independent_note'
              )}
            </p>
          </section>

          <section
            className="border-border/60 mt-10 border-t pt-8"
            aria-labelledby="collection-next"
          >
            <h2
              id="collection-next"
              className="text-xl font-semibold md:text-2xl"
            >
              {t('opportunity_collections.prepare_heading')}
            </h2>
            <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-3">
              {[
                [
                  'how-to-write--a-stem-paper',
                  'paper_guide',
                ],
                ['great-datasets', 'datasets_guide'],
                [
                  'extracurriculars-how-to-start-a-stem-club',
                  'club_guide',
                ],
              ].map(([slug, key]) => (
                <li key={slug}>
                  <Link
                    href={`/article/${slug}`}
                    locale={false}
                    className={INLINE_LINK}
                  >
                    {t(`opportunity_collections.${key}`)}
                  </Link>
                </li>
              ))}
            </ul>
            <h3 className="mb-4 mt-8 text-lg font-semibold">
              {t('opportunity_collections.browse_heading')}
            </h3>
            <OpportunityCollectionLinks
              exclude={collection.slug}
            />
            <Link
              href="/opportunities"
              className={buttonVariants({
                variant: 'default',
                className: 'mt-8',
              })}
            >
              {t(
                'opportunity_collections.all_opportunities'
              )}
            </Link>
          </section>
        </div>
      </div>
    </>
  )
}

export async function getStaticPaths({ locales }) {
  const { getOpportunityCollectionSlugs } = await import(
    '@/lib/opportunityCollections'
  )
  return {
    paths: (locales || ['en']).flatMap((locale) =>
      getOpportunityCollectionSlugs().map((collection) => ({
        params: { collection },
        locale,
      }))
    ),
    fallback: false,
  }
}

export async function getStaticProps({ params, locale }) {
  const { getOpportunityCollection } = await import(
    '@/lib/opportunityCollections'
  )
  const collection = getOpportunityCollection(
    params?.collection
  )
  if (!collection) return { notFound: true }

  const { fetchCollectionProgramImages } = await import(
    '@/lib/opportunityCollectionImages'
  )
  const [programs, translations] = await Promise.all([
    fetchCollectionProgramImages(collection.programs),
    serverSideTranslations(locale, ['common']),
  ])

  return {
    revalidate: 86400,
    props: {
      collection: { ...collection, programs },
      locale,
      ...translations,
    },
  }
}
