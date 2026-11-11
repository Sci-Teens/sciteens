import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import ListingArchive from '@/components/search/ListingArchive'
import { parseCrawlPage } from '@/lib/crawlPagination'

export default ListingArchive

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' }
}

export async function getStaticProps({ params, locale }) {
  const page = parseCrawlPage(params?.page)
  if (!page) return { notFound: true }
  if (page === 1)
    return {
      redirect: {
        destination: '/projects',
        permanent: true,
      },
    }
  const { fetchListingArchive } = await import(
    '@/lib/crawlPages'
  )
  const result = await fetchListingArchive('projects', page)
  if (!result.items.length)
    return { notFound: true, revalidate: 3600 }
  return {
    props: {
      section: 'projects',
      page,
      ...result,
      ...(await serverSideTranslations(locale, ['common'])),
    },
    revalidate: 3600,
  }
}
