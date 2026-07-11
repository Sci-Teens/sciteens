import { useEffect, useMemo, useRef, useState } from 'react'

import SocialMeta from '@/components/SocialMeta'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useIntersectionObserver } from '../context/helpers'
import PageHeading from '@/components/PageHeading'

var Prismic = require('@prismicio/client')
import { RichText } from 'prismic-reactjs'

import moment from 'moment'
import { getTranslatedFieldsDict } from '../context/helpers'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import SearchToolbar from '@/components/search/SearchToolbar'
import FilterAside from '@/components/search/FilterAside'
import TopicsList from '@/components/search/TopicsList'

const ARTICLES_PAGE_SIZE = 10

async function fetchArticlesPage({
  search,
  field,
  pageParam,
}) {
  const apiEndpoint =
    'https://sciteens.cdn.prismic.io/api/v2'
  const client = Prismic.default.client(apiEndpoint)
  let predicates = []

  if (search) {
    predicates.push(
      Prismic.default.Predicates.fulltext(
        'document',
        search
      )
    )
  }
  if (field) {
    predicates.push(
      Prismic.default.Predicates.at('document.tags', [
        field,
      ])
    )
  }

  const articles = await client.query(
    [
      Prismic.default.Predicates.at(
        'document.type',
        'blog'
      ),
      ...predicates,
    ],
    {
      orderings: `[document.first_publication_date desc]`,
      pageSize: ARTICLES_PAGE_SIZE,
      page: pageParam,
    }
  )

  return {
    articles: articles.results,
    nextPage:
      articles.page < articles.total_pages
        ? articles.page + 1
        : null,
    totalPages: articles.total_pages,
  }
}

function Articles({ cached_articles }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [field, setField] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  // useWindowVirtualizer computes getTotalSize() from window
  // dimensions, which are absent during SSR — rendering it on the
  // server produces height:0px vs the client's real height, a
  // hydration mismatch. Defer virtualized rendering to after mount.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const searchParam = router.query?.search || ''
  const fieldParam =
    router.query?.field && router.query.field !== 'All'
      ? router.query.field
      : ''
  const queryPage = Number(router.query?.page || 1)
  const firstPage =
    Number.isFinite(queryPage) && queryPage > 0
      ? queryPage
      : 1

  const hasActiveFilters = Boolean(search || field)

  const initialData = useMemo(() => {
    if (
      searchParam ||
      fieldParam ||
      firstPage !== 1 ||
      !cached_articles?.results
    ) {
      return undefined
    }

    return {
      pages: [
        {
          articles: cached_articles.results,
          nextPage:
            cached_articles.page <
            cached_articles.total_pages
              ? cached_articles.page + 1
              : null,
          totalPages: cached_articles.total_pages,
        },
      ],
      pageParams: [1],
    }
  }, [searchParam, fieldParam, firstPage, cached_articles])

  const articlesQuery = useInfiniteQuery({
    queryKey: [
      'articles',
      searchParam,
      fieldParam,
      firstPage,
    ],
    enabled: router.isReady,
    initialPageParam: firstPage,
    initialData,
    queryFn: ({ pageParam }) =>
      fetchArticlesPage({
        search: searchParam,
        field: fieldParam,
        pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
  })

  const articles = useMemo(
    () =>
      articlesQuery.data?.pages.flatMap(
        (page) => page.articles
      ) || [],
    [articlesQuery.data]
  )
  const loading =
    articlesQuery.isLoading && articles.length === 0
  const { hasNextPage, isFetchingNextPage, fetchNextPage } =
    articlesQuery

  useEffect(() => {
    if (articlesQuery.isError) {
      console.error(
        'Failed to load articles:',
        articlesQuery.error
      )
    }
  }, [articlesQuery.isError, articlesQuery.error])

  const ref = useRef(null)
  const isBottomVisible = useIntersectionObserver(
    ref,
    { threshold: 0 },
    false
  )

  useEffect(() => {
    if (
      isBottomVisible &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage()
    }
  }, [
    isBottomVisible,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ])

  useEffect(() => {
    if (router?.isReady) {
      setSearch(searchParam)
      setField(fieldParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, searchParam, fieldParam])

  const imageLoader = ({ src, width, height }) => {
    return `${src}?fit=crop&crop=faces&w=${
      width || 256
    }&h=${height || 256}`
  }

  // Merges into whatever's already active instead of replacing the
  // whole query — picking a topic used to drop an in-progress search
  // term (and vice versa).
  function pushFilters(overrides = {}) {
    const next = { search, field, ...overrides }
    const query = {}
    if (next.search) query.search = next.search
    if (next.field) query.field = next.field
    router.push({ pathname: '/articles', query })
  }

  function handleSearch(e) {
    e.preventDefault()
    pushFilters({})
  }

  function handleFieldSearch(nextField) {
    const value = nextField === 'All' ? '' : nextField
    setField(value)
    pushFilters({ field: value })
    setFiltersOpen(false)
  }

  function handleClearFilters() {
    setSearch('')
    setField('')
    setFiltersOpen(false)
    router.push({ pathname: '/articles' })
  }

  function readingTime(article) {
    let article_length = 0
    article.map((text) => {
      if (text.type == 'paragraph' && text.text) {
        article_length += text.text?.split(' ').length
      }
    })
    let time_to_read = Math.max(
      1,
      Math.round(article_length / 200)
    )

    return `${time_to_read} minute read · ${article_length} words`
  }

  const { t } = useTranslation('common')

  function renderArticleCard(article) {
    const author_image = article.data.body.map(
      (slice, i) => {
        if (slice.slice_type == 'about_the_author') {
          return (
            <div
              className="relative h-6 w-6 lg:h-8 lg:w-8"
              key={i}
            >
              <Image
                alt={`${article.data.author} headshot`}
                className="h-6 w-6 rounded-full lg:h-8 lg:w-8"
                height={48}
                width={48}
                loader={imageLoader}
                src={slice.primary.headshot.url}
              />
            </div>
          )
        } else {
          return null
        }
      }
    )

    return (
      <div key={article.id} className="w-full pt-6 md:pt-8">
        <Card className="animate-in border-border/60 fade-in slide-in-from-right-8 relative isolate overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
          <a
            href={`/article/${article.uid}`}
            aria-label={RichText.asText(article.data.title)}
            className="focus-visible:ring-3 focus-visible:ring-ring/50 absolute inset-0 z-10 rounded-xl"
          />
          <CardContent className="flex items-center">
            <div className="bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-lg md:h-40 md:w-40">
              <Image
                alt={RichText.asText(article.data.title)}
                fill
                sizes="(min-width: 768px) 160px, 96px"
                className="object-cover"
                loader={imageLoader}
                src={article.data.image.url}
              />
            </div>
            <div className="ml-4 min-w-0 flex-1">
              <div className="mb-3 flex flex-row items-center">
                {author_image}
                <p className="ml-3">
                  {article.data.author}
                </p>
              </div>
              <h3 className="line-clamp-2 mb-2 text-base font-semibold md:text-xl lg:text-2xl">
                {RichText.asText(article.data.title)}
              </h3>
              <p className="line-clamp-none md:line-clamp-2 mb-2 hidden text-sm md:flex lg:text-base">
                {article.data.description}
              </p>
              <p className="flex text-xs">
                {(mounted
                  ? moment(article.data.date)
                      .locale(router?.locale || 'en')
                      .format('ll')
                  : moment(article.data.date).format(
                      'll'
                    )) +
                  ' · ' +
                  readingTime(article.data.text)}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const articleVirtualizer = useWindowVirtualizer({
    count: articles.length,
    estimateSize: () => 340,
    overscan: 5,
  })

  const articlesComponent = mounted ? (
    <div
      className="relative w-full"
      style={{
        height: `${articleVirtualizer.getTotalSize()}px`,
      }}
    >
      {articleVirtualizer
        .getVirtualItems()
        .map((virtualRow) => {
          const article = articles[virtualRow.index]
          if (!article) return null

          return (
            <div
              key={article.id}
              ref={articleVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute left-0 top-0 w-full"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              {renderArticleCard(article)}
            </div>
          )
        })}
    </div>
  ) : (
    <div className="relative w-full">
      {articles.map((article) =>
        renderArticleCard(article)
      )}
    </div>
  )

  const loadingComponent = new Array(10)
    .fill(1)
    .map((index) => {
      return (
        <Skeleton
          key={index}
          className="mt-4 h-16 rounded-xl"
        />
      )
    })

  const filterPanel = (
    <TopicsList
      topicsLabel={t('articles.topics')}
      fields={getTranslatedFieldsDict(t)}
      field={field}
      onFieldSelect={handleFieldSearch}
      hasActiveFilters={hasActiveFilters}
      clearLabel={t('articles.clear_filters')}
      onClear={handleClearFilters}
    />
  )

  return (
    <>
      <SocialMeta
        title={`${
          field && field !== 'All' ? field + ' ' : ''
        }Articles${
          search ? ` related to ${search}` : ''
        } | SciTeens`}
        description="Read science articles written by teens, for teens — explore biology, chemistry, physics, and more."
        eyebrow="Articles"
        badge={field && field !== 'All' ? field : undefined}
        path="/articles"
      />
      <div className="text-foreground mx-auto mb-24 mt-8 min-h-screen px-4 md:px-0 lg:mx-16 xl:mx-32">
        <PageHeading className="ml-0 py-4 text-left">
          {t('articles.articles')} 📰
        </PageHeading>

        <div className="flex flex-row items-start gap-8 xl:gap-12">
          <div className="min-w-0 flex-1">
            <SearchToolbar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSubmit={handleSearch}
              placeholder={t('articles.search_articles')}
              searchLabel={t('articles.search')}
              submitLabel={t('articles.search')}
              filtersLabel={t('articles.filters')}
              hasActiveFilters={hasActiveFilters}
              filtersOpen={filtersOpen}
              onFiltersOpenChange={setFiltersOpen}
              filterPanel={filterPanel}
            />

            {loading ? loadingComponent : articlesComponent}
            {articlesQuery.isFetchingNextPage &&
              loadingComponent.slice(0, 2)}
            {articles.length === 0 && !loading && (
              <div className="mx-auto mt-20 text-center">
                <i className="text-xl font-semibold">
                  {search
                    ? `${t('articles.sorry')} ${search}`
                    : t('articles.sorry')}
                </i>
              </div>
            )}
            <div
              ref={ref}
              style={{ width: '100%', height: '20px' }}
            ></div>
          </div>

          <FilterAside>{filterPanel}</FilterAside>
        </div>
      </div>
    </>
  )
}

export async function getStaticProps({ locale }) {
  const translations = await serverSideTranslations(
    locale,
    ['common']
  )

  try {
    const apiEndpoint =
      'https://sciteens.cdn.prismic.io/api/v2'
    const client = Prismic.client(apiEndpoint)
    const articles = await client.query(
      [Prismic.Predicates.at('document.type', 'blog')],
      {
        orderings: `[document.first_publication_date desc]`,
        pageSize: ARTICLES_PAGE_SIZE,
      }
    )

    return {
      props: { cached_articles: articles, ...translations },
    }
  } catch (e) {
    console.error(e)
    return { notFound: true }
  }
}

export default Articles
