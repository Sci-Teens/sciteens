import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { buttonVariants } from '@/components/ui/button'
import { getListingPagePath } from '@/lib/crawlPagination'

export default function CrawlPagination({
  section,
  page = 1,
  hasNextPage,
  archiveLink = false,
}) {
  const { t } = useTranslation('common')
  if (!archiveLink && page === 1 && !hasNextPage)
    return null

  return (
    <nav
      aria-label={t('seo.pagination.label')}
      className="border-border/60 mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5"
    >
      {archiveLink ? (
        <Link
          href={getListingPagePath(section, 1)}
          className={buttonVariants({ variant: 'outline' })}
        >
          {t('seo.pagination.browse')}
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
            </Link>
          ) : (
            <span />
          )}
        </>
      )}
    </nav>
  )
}
