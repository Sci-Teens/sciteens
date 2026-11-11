import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import ListingArchive from '@/components/search/ListingArchive'
import {
  CRAWL_PAGE_SIZES,
  parseCrawlPage,
  sliceListingPage,
} from '@/lib/crawlPagination'

export default ListingArchive

export async function getStaticPaths({
  locales = ['en'],
} = {}) {
  const { getArticleSummaries } = await import(
    '@/lib/content'
  )
  const count = Math.ceil(
    getArticleSummaries().length / CRAWL_PAGE_SIZES.articles
  )
  return {
    paths: locales.flatMap((locale) =>
      Array.from(
        { length: Math.max(0, count - 1) },
        (_, index) => ({
          params: { page: String(index + 2) },
          locale,
        })
      )
    ),
    fallback: false,
  }
}

export async function getStaticProps({ params, locale }) {
  const page = parseCrawlPage(params?.page)
  if (!page) return { notFound: true }
  if (page === 1)
    return {
      redirect: {
        destination: '/articles',
        permanent: true,
      },
    }
  const { getArticleSummaries } = await import(
    '@/lib/content'
  )
  const result = sliceListingPage(
    getArticleSummaries(),
    'articles',
    page
  )
  if (!result.items.length) return { notFound: true }
  return {
    props: {
      section: 'articles',
      page,
      ...result,
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
