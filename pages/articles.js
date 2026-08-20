import { useEffect, useMemo, useState } from 'react'

import SocialMeta from '@/components/SocialMeta'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import InfiniteScrollTrigger from '@/components/InfiniteScrollTrigger'

import {
  getFieldLabel,
  getTranslatedFieldsDict,
} from '../context/helpers'
import { formatMediumDate } from '../lib/formatDate'
import {
  ARTICLES_PAGE_SIZE,
  filterArticles,
  toCorpusMap,
} from '../lib/contentSearch'
import ActiveFilters from '@/components/search/ActiveFilters'
import EmptyState from '@/components/search/EmptyState'
import ListingSkeleton from '@/components/search/ListingSkeleton'
import ListingCard from '@/components/search/ListingCard'
import ListingLayout from '@/components/search/ListingLayout'
import ResultsCount from '@/components/search/ResultsCount'
import SearchToolbar from '@/components/search/SearchToolbar'
import TopicsList from '@/components/search/TopicsList'

// Fetched lazily on the first real query, never on a plain visit or a topic
// filter, because it is ~256 KB gzipped.
const SEARCH_CORPUS_URL = '/content/article-search.json'

function Articles({ articles }) {
  const router = useRouter()
  const { t } = useTranslation('common')
  const [search, setSearch] = useState('')
  const [field, setField] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [corpus, setCorpus] = useState(null)
  const [corpusFailed, setCorpusFailed] = useState(false)
  const [visibleCount, setVisibleCount] = useState(
    ARTICLES_PAGE_SIZE
  )

  const searchParam = router.query?.search || ''
  const fieldParam =
    router.query?.field && router.query.field !== 'All'
      ? router.query.field
      : ''

  const hasActiveFilters = Boolean(
    searchParam || fieldParam
  )

  // Only a real query needs the corpus; a topic filter matches on tags that
  // already arrived in props.
  useEffect(() => {
    if (!searchParam || corpus || corpusFailed) return
    let cancelled = false
    async function loadCorpus() {
      try {
        const res = await fetch(SEARCH_CORPUS_URL)
        if (!res.ok) throw new Error(`corpus ${res.status}`)
        const map = toCorpusMap(await res.json())
        // A 200 carrying something other than an array would otherwise leave
        // `corpus` null forever, and the page loading forever with it.
        if (!map) throw new Error('corpus was not an array')
        if (!cancelled) setCorpus(map)
      } catch (error) {
        // Search degrades to the summary fields rather than breaking.
        console.error(
          'Failed to load the article search corpus:',
          error
        )
        if (!cancelled) setCorpusFailed(true)
      }
    }
    loadCorpus()
    return () => {
      cancelled = true
    }
  }, [searchParam, corpus, corpusFailed])

  const results = useMemo(
    () =>
      filterArticles(articles, {
        search: searchParam,
        field: fieldParam,
        corpus,
      }),
    [articles, searchParam, fieldParam, corpus]
  )

  // Otherwise a filter change can leave a reader on a page that no longer
  // exists.
  useEffect(() => {
    setVisibleCount(ARTICLES_PAGE_SIZE)
  }, [searchParam, fieldParam])

  const visible = results.slice(0, visibleCount)
  const hasNextPage = visibleCount < results.length
  // Showing summary-only matches here would swap the list out from under the
  // reader once the corpus lands.
  const awaitingCorpus = Boolean(
    searchParam && !corpus && !corpusFailed
  )

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
          {awaitingCorpus
            ? t('articles.loading')
            : t('articles.results_count', {
                count: results.length,
              })}
        </ResultsCount>

        {awaitingCorpus ? (
          <ListingSkeleton />
        ) : results.length === 0 ? (
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
        ) : (
          <div className="w-full">
            {visible.map((article, index) => (
              <div
                key={article.slug}
                className="w-full pt-6 md:pt-8"
              >
                <ListingCard
                  href={`/article/${article.slug}`}
                  title={article.title}
                  fallbackLabel={t('articles.untitled')}
                  description={article.description}
                  imageSrc={article.cover}
                  imageAlt={article.title}
                  priority={index === 0}
                  byline={
                    <div className="mb-2 flex flex-row items-center gap-2">
                      {article.headshot && (
                        <img
                          alt=""
                          className="h-6 w-6 rounded-full object-cover"
                          height={24}
                          width={24}
                          loading="lazy"
                          decoding="async"
                          src={article.headshot}
                        />
                      )}
                      <p className="text-muted-foreground truncate text-sm">
                        {article.author}
                      </p>
                    </div>
                  }
                  meta={[
                    formatMediumDate(
                      article.date,
                      router.locale
                    ),
                    t('articles.reading_time', {
                      minutes: article.minutes,
                    }),
                  ]
                    .filter(Boolean)
                    .join(' · ')}
                />
              </div>
            ))}
          </div>
        )}

        <InfiniteScrollTrigger
          hasNextPage={hasNextPage && !awaitingCorpus}
          isLoading={awaitingCorpus}
          onLoadMore={() =>
            setVisibleCount(
              (count) => count + ARTICLES_PAGE_SIZE
            )
          }
          label={t('articles.load_more')}
        />
      </ListingLayout>
    </>
  )
}

// The whole listing ships in props (~20 kB gzipped) so filtering and paging
// need no network at all.
export async function getStaticProps({ locale }) {
  const { getArticleSummaries } = await import(
    '../lib/content'
  )
  return {
    props: {
      articles: getArticleSummaries(),
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

export default Articles
