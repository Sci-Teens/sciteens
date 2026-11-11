import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { useRouter } from 'next/router'
import PageHeading from '@/components/PageHeading'
import SocialMeta from '@/components/SocialMeta'
import ProjectCard from '@/components/ProjectCard'
import ListingCard from './ListingCard'
import CrawlPagination from './CrawlPagination'
import { formatMediumDate } from '@/lib/formatDate'
import { getListingPagePath } from '@/lib/crawlPagination'
import { buttonVariants } from '@/components/ui/button'

export default function ListingArchive({
  section,
  page,
  items,
  hasNextPage,
}) {
  const { t } = useTranslation('common')
  const { locale } = useRouter()
  const sectionLabel =
    section === 'opportunities'
      ? t('seo.pagination.all_opportunities')
      : t(`${section}.${section}`)
  const title = t('seo.pagination.title', {
    section: sectionLabel,
    page,
  })

  return (
    <>
      <SocialMeta
        title={`${title} | SciTeens`}
        description={t(`seo.${section}_description`)}
        path={getListingPagePath(section, page)}
      />
      <div className="text-foreground mx-auto mb-20 mt-8 w-full max-w-4xl px-4 md:px-6 lg:px-8">
        <PageHeading>{title}</PageHeading>
        <Link
          href={`/${section}`}
          className={buttonVariants({
            variant: 'link',
            className: 'mt-3 px-0',
          })}
        >
          {t('seo.pagination.back', {
            section: t(`${section}.${section}`),
          })}
        </Link>
        {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
        <ul role="list" className="mt-6 space-y-6">
          {items.map((item) => (
            <li key={item.id || item.slug}>
              {section === 'projects' ? (
                <ProjectCard
                  project={item}
                  date={formatMediumDate(item.date, locale)}
                />
              ) : (
                <ListingCard
                  href={
                    section === 'articles'
                      ? `/article/${item.slug}`
                      : `/program/${item.slug}`
                  }
                  title={item.title || item.name}
                  description={
                    item.description || item.about
                  }
                  imageSrc={item.cover || item.imageUrl}
                  imageFit={item.imageFit}
                  meta={
                    section === 'articles'
                      ? formatMediumDate(item.date, locale)
                      : item.location
                  }
                />
              )}
            </li>
          ))}
        </ul>
        <CrawlPagination
          section={section}
          page={page}
          hasNextPage={hasNextPage}
        />
      </div>
    </>
  )
}
