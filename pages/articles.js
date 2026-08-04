import { useEffect, useMemo, useState } from 'react'

import SocialMeta from '@/components/SocialMeta'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import InfiniteScrollTrigger from '@/components/InfiniteScrollTrigger'

var Prismic = require('@prismicio/client')
import { RichText } from 'prismic-reactjs'

import { useInfiniteQuery } from '@tanstack/react-query'
import {
  getFieldLabel,
  getTranslatedFieldsDict,
} from '../context/helpers'
import { formatMediumDate } from '../lib/formatDate'
import { Button } from '@/components/ui/button'
import ActiveFilters from '@/components/search/ActiveFilters'
import EmptyState from '@/components/search/EmptyState'
import ListingCard from '@/components/search/ListingCard'
import ListingLayout from '@/components/search/ListingLayout'
import ListingSkeleton from '@/components/search/ListingSkeleton'
import ResultsCount from '@/components/search/ResultsCount'
import SearchToolbar from '@/components/search/SearchToolbar'
import TopicsList from '@/components/search/TopicsList'

const ARTICLES_PAGE_SIZE = 10
const WORDS_PER_MINUTE = 200

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
    totalResults: articles.total_results_size,
  }
}

function readingMinutes(richText) {
  const words = (richText || []).reduce((total, block) => {
    if (block.type === 'paragraph' && block.text) {
      return total + block.text.split(' ').length
    }
    return total
  }, 0)

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}

function imageLoader({ src, width, height }) {
  return `${src}?fit=crop&crop=faces&w=${width || 256}&h=${
    height || 256
  }`
}

function authorHeadshot(article) {
  const slice = (article.data.body || []).find(
    (candidate) =>
      candidate.slice_type === 'about_the_author'
  )

  return slice?.primary?.headshot?.url || ''
}

function Articles({ cached_articles }) {
  const router = useRouter()
  const { t } = useTranslation('common')
  const [search, setSearch] = useState('')
  const [field, setField] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

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

  const hasActiveFilters = Boolean(
    searchParam || fieldParam
  )

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
          totalResults: cached_articles.total_results_size,
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
  const totalResults =
    articlesQuery.data?.pages[0]?.totalResults
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

  useEffect(() => {
    if (router?.isReady) {
      setSearch(searchParam)
      setField(fieldParam)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router.isReady, searchParam, fieldParam])

  // Every handler below changes exactly one filter, so the rest are
  // read back from the URL rather than from input state: sourcing them
  // from `search` would commit a half-typed term the visitor never
  // submitted just because they removed an unrelated chip.
  function pushFilters(overrides = {}) {
    const next = {
      search: searchParam,
      field: fieldParam,
      ...overrides,
    }
    const query = {}
    if (next.search) query.search = next.search
    if (next.field) query.field = next.field
    router.push({ pathname: '/articles', query })
  }

  function handleSearch(e) {
    e.preventDefault()
    pushFilters({ search })
  }

  function handleClearSearch() {
    setSearch('')
    pushFilters({ search: '' })
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

  const translatedFields = getTranslatedFieldsDict(t)

  const activeFilters = []
  if (searchParam) {
    activeFilters.push({
      key: 'search',
      label: t('articles.search'),
      value: searchParam,
      removeLabel: t('articles.remove_filter', {
        filter: `${t('articles.search')} ${searchParam}`,
      }),
      onRemove: handleClearSearch,
    })
  }
  if (fieldParam) {
    const label = getFieldLabel(
      translatedFields,
      fieldParam
    )
    activeFilters.push({
      key: 'field',
      label: t('articles.topics'),
      value: label,
      removeLabel: t('articles.remove_filter', {
        filter: `${t('articles.topics')} ${label}`,
      }),
      onRemove: () => handleFieldSearch('All'),
    })
  }

  const filterPanel = (
    <TopicsList
      topicsLabel={t('articles.topics')}
      fields={translatedFields}
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
      <ListingLayout
        title={t('articles.articles')}
        lede={t('articles.lede')}
        aside={filterPanel}
      >
        <SearchToolbar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSubmit={handleSearch}
          onClear={handleClearSearch}
          placeholder={t('articles.search_articles')}
          searchLabel={t('articles.search')}
          submitLabel={t('articles.search')}
          clearSearchLabel={t('articles.clear_search')}
          filtersLabel={t('articles.filters')}
          hasActiveFilters={hasActiveFilters}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          filterPanel={filterPanel}
        />

        <ActiveFilters
          label={t('articles.active_filters')}
          filters={activeFilters}
          clearLabel={t('articles.clear_filters')}
          onClear={handleClearFilters}
        />

        <ResultsCount>
          {loading
            ? t('articles.loading')
            : !articlesQuery.isError &&
              typeof totalResults === 'number' &&
              t('articles.results_count', {
                count: totalResults,
              })}
        </ResultsCount>

        {articlesQuery.isError && (
          <div className="border-destructive/30 bg-destructive/5 rounded-xl border px-4 py-4 text-sm">
            <p className="text-destructive">
              {t('articles.load_failed')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => articlesQuery.refetch()}
            >
              {t('articles.retry')}
            </Button>
          </div>
        )}

        {/* The banner above sits alongside whatever already loaded: a
            failed next-page fetch must not unmount the pages the
            visitor has already scrolled through. */}
        {loading ? (
          <ListingSkeleton />
        ) : articles.length === 0 ? (
          !articlesQuery.isError && (
            <EmptyState
              title={t('articles.empty_title')}
              description={
                hasActiveFilters
                  ? t('articles.empty_filtered')
                  : t('articles.empty_default')
              }
              actionLabel={
                hasActiveFilters
                  ? t('articles.clear_filters')
                  : undefined
              }
              onAction={
                hasActiveFilters
                  ? handleClearFilters
                  : undefined
              }
            />
          )
        ) : (
          <div className="w-full">
            {articles.map((article, index) => {
              const title = RichText.asText(
                article.data.title
              )
              const headshot = authorHeadshot(article)

              return (
                <div
                  key={article.id}
                  className="w-full pt-6 md:pt-8"
                >
                  <ListingCard
                    href={`/article/${article.uid}`}
                    title={title}
                    fallbackLabel={t('articles.untitled')}
                    description={article.data.description}
                    imageSrc={article.data.image?.url}
                    imageAlt={title}
                    imageLoader={imageLoader}
                    priority={index === 0}
                    byline={
                      <div className="mb-2 flex flex-row items-center gap-2">
                        {headshot && (
                          <Image
                            alt=""
                            className="h-6 w-6 rounded-full object-cover"
                            height={24}
                            width={24}
                            loader={imageLoader}
                            src={headshot}
                          />
                        )}
                        <p className="text-muted-foreground truncate text-sm">
                          {article.data.author}
                        </p>
                      </div>
                    }
                    meta={[
                      formatMediumDate(
                        article.data.date,
                        router.locale
                      ),
                      t('articles.reading_time', {
                        minutes: readingMinutes(
                          article.data.text
                        ),
                      }),
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  />
                </div>
              )
            })}
          </div>
        )}

        {isFetchingNextPage && (
          <ListingSkeleton count={2} />
        )}

        <InfiniteScrollTrigger
          hasNextPage={hasNextPage}
          isLoading={isFetchingNextPage}
          onLoadMore={fetchNextPage}
          label={t('articles.load_more')}
        />
      </ListingLayout>
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
