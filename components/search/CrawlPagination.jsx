import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { buttonVariants } from '@/components/ui/button'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { getListingPagePath } from '@/lib/crawlPagination'

export default function CrawlPagination({
  section,
  page = 1,
  hasNextPage,
  archiveLink = false,
}) {
  const { t } = useTranslation('common')
  if (
    page === 1 &&
    !hasNextPage &&
    !(archiveLink && section === 'opportunities')
  )
    return null

  return (
    <nav
      aria-label={t('seo.pagination.label')}
      className="border-border/60 mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5"
    >
      {archiveLink ? (
        <Link
          href={getListingPagePath(
            section,
            section === 'opportunities' ? 1 : 2
          )}
          className={buttonVariants({
            variant: 'link',
            className:
              'h-auto whitespace-normal px-0 text-left',
          })}
        >
          {t(
            section === 'opportunities'
              ? 'seo.pagination.browse_all'
              : 'seo.pagination.browse_older',
            { section: t(`${section}.${section}`) }
          )}
        </Link>
      ) : (
        <>
          {page > 1 ? (
            <Link
              href={getListingPagePath(section, page - 1)}
              rel="prev"
              className={buttonVariants({
                variant: 'outline',
              })}
            >
              <ArrowLeft
                aria-hidden="true"
                className="size-4 mr-2"
              />
              {t('seo.pagination.previous')}
            </Link>
          ) : (
            <span />
          )}
          <span
            className="text-muted-foreground text-sm"
            aria-current="page"
          >
            {t('seo.pagination.page', { page })}
          </span>
          {hasNextPage ? (
            <Link
              href={getListingPagePath(section, page + 1)}
              rel="next"
              className={buttonVariants({
                variant: 'outline',
              })}
            >
              {t('seo.pagination.next')}
              <ArrowRight
                aria-hidden="true"
                className="size-4 ml-2"
              />
            </Link>
          ) : (
            <span />
          )}
        </>
      )}
    </nav>
  )
}
