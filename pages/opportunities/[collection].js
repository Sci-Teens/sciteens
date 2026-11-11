import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SocialMeta from '@/components/SocialMeta'
import StructuredData from '@/components/StructuredData'
import PageHeading from '@/components/PageHeading'
import HeadingRule from '@/components/HeadingRule'
import OpportunityCollectionLinks from '@/components/OpportunityCollectionLinks'
import { Card, CardContent } from '@/components/ui/card'
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
            <p className="text-muted-foreground mt-3 text-sm md:hidden">
              {t('opportunity_collections.scroll_table')}
            </p>
            <Card className="border-border/60 mt-5 overflow-hidden shadow-sm">
              <CardContent className="p-0">
                {/* eslint-disable jsx-a11y/no-noninteractive-tabindex -- Keyboard users need focus to scroll the comparison table. */}
                <div
                  className="overflow-x-auto"
                  role="region"
                  aria-labelledby="collection-comparison"
                  tabIndex={0}
                >
                  <table className="w-full min-w-[48rem] text-left text-sm leading-relaxed">
                    <caption className="sr-only">
                      {t(`${prefix}.title`)}
                    </caption>
                    <thead className="bg-muted border-border/60 border-b">
                      <tr>
                        <th
                          scope="col"
                          className="w-1/4 p-4 font-semibold"
                        >
                          {t(
                            'opportunity_collections.program'
                          )}
                        </th>
                        <th
                          scope="col"
                          className="w-1/4 p-4 font-semibold"
                        >
                          {t(
                            'opportunity_collections.eligibility'
                          )}
                        </th>
                        <th
                          scope="col"
                          className="w-1/4 p-4 font-semibold"
                        >
                          {t(
                            'opportunity_collections.cost'
                          )}
                        </th>
                        <th
                          scope="col"
                          className="w-1/4 p-4 font-semibold"
                        >
                          {t(
                            'opportunity_collections.work'
                          )}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-border/60 divide-y">
                      {collection.programs.map(
                        (program) => (
                          <tr
                            key={program.id}
                            className="align-top"
                          >
                            <th
                              scope="row"
                              className="p-4 font-normal"
                            >
                              <p className="font-semibold">
                                {program.name}
                              </p>
                              <p className="text-muted-foreground mt-2">
                                {t(
                                  `opportunity_collections.formats.${program.format}`
                                )}
                              </p>
                              {program.slug && (
                                <Link
                                  href={`/program/${program.slug}`}
                                  className={`${INLINE_LINK} mt-3 inline-block`}
                                >
                                  {t(
                                    'opportunity_collections.details'
                                  )}
                                </Link>
                              )}
                              <ul className="mt-3 space-y-1">
                                {program.sources.map(
                                  (source, index) => (
                                    <li key={source}>
                                      <a
                                        href={source}
                                        className={
                                          INLINE_LINK
                                        }
                                      >
                                        {t(
                                          'opportunity_collections.official_source',
                                          {
                                            number:
                                              index + 1,
                                          }
                                        )}
                                      </a>
                                    </li>
                                  )
                                )}
                              </ul>
                            </th>
                            <td className="p-4">
                              {t(
                                `opportunity_collections.programs.${program.id}.eligibility`
                              )}
                            </td>
                            <td className="p-4">
                              {t(
                                `opportunity_collections.programs.${program.id}.cost`
                              )}
                            </td>
                            <td className="p-4">
                              {t(
                                `opportunity_collections.programs.${program.id}.work`
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </div>
                {/* eslint-enable jsx-a11y/no-noninteractive-tabindex */}
              </CardContent>
            </Card>
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

  return {
    props: {
      collection,
      locale,
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
