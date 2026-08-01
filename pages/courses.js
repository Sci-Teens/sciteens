import { useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/router'
import SocialMeta from '@/components/SocialMeta'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

var Prismic = require('@prismicio/client')
import { RichText } from 'prismic-reactjs'

import { useInfiniteQuery } from '@tanstack/react-query'
import {
  getFieldLabel,
  getTranslatedFieldsDict,
} from '../context/helpers'
import { formatMediumDate } from '../lib/formatDate'
import { Button } from '@/components/ui/button'
import InfiniteScrollTrigger from '@/components/InfiniteScrollTrigger'
import ActiveFilters from '@/components/search/ActiveFilters'
import EmptyState from '@/components/search/EmptyState'
import ListingCard from '@/components/search/ListingCard'
import ListingLayout from '@/components/search/ListingLayout'
import ListingSkeleton from '@/components/search/ListingSkeleton'
import ResultsCount from '@/components/search/ResultsCount'
import SearchToolbar from '@/components/search/SearchToolbar'
import TopicsList from '@/components/search/TopicsList'

const COURSES_PAGE_SIZE = 10

async function fetchCoursesPage({
  search,
  field,
  pageParam,
}) {
  const apiEndpoint =
    'https://sciteens.cdn.prismic.io/api/v2'
  const client = Prismic.default.client(apiEndpoint)
  const predicates = []

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

  const courses = await client.query(
    [
      Prismic.default.Predicates.at(
        'document.type',
        'course'
      ),
      ...predicates,
    ],
    {
      orderings: `[document.first_publication_date desc]`,
      pageSize: COURSES_PAGE_SIZE,
      page: pageParam,
    }
  )

  return {
    courses: courses.results,
    nextPage:
      courses.page < courses.total_pages
        ? courses.page + 1
        : null,
    totalResults: courses.total_results_size,
  }
}

function imageLoader({ src, width, height }) {
  return `${src}?fit=crop&crop=faces&w=${width || 256}&h=${
    height || 256
  }`
}

function Courses({ cached_courses }) {
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

  const hasActiveFilters = Boolean(
    searchParam || fieldParam
  )

  const initialData = useMemo(() => {
    if (
      searchParam ||
      fieldParam ||
      !cached_courses?.results
    ) {
      return undefined
    }

    return {
      pages: [
        {
          courses: cached_courses.results,
          nextPage:
            cached_courses.page < cached_courses.total_pages
              ? cached_courses.page + 1
              : null,
          totalResults: cached_courses.total_results_size,
        },
      ],
      pageParams: [1],
    }
  }, [searchParam, fieldParam, cached_courses])

  const coursesQuery = useInfiniteQuery({
    queryKey: ['courses', searchParam, fieldParam],
    enabled: router.isReady,
    initialPageParam: 1,
    initialData,
    queryFn: ({ pageParam }) =>
      fetchCoursesPage({
        search: searchParam,
        field: fieldParam,
        pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
  })

  const courses = useMemo(
    () =>
      coursesQuery.data?.pages.flatMap(
        (page) => page.courses
      ) || [],
    [coursesQuery.data]
  )
  const totalResults =
    coursesQuery.data?.pages[0]?.totalResults
  const loading =
    coursesQuery.isLoading && courses.length === 0
  const { hasNextPage, isFetchingNextPage, fetchNextPage } =
    coursesQuery

  useEffect(() => {
    if (coursesQuery.isError) {
      console.error(
        'Failed to load courses:',
        coursesQuery.error
      )
    }
  }, [coursesQuery.isError, coursesQuery.error])

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
    router.push({ pathname: '/courses', query })
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
    router.push({ pathname: '/courses' })
  }

  function courseSchedule(course) {
    const start = formatMediumDate(
      course.data.start,
      router.locale
    )
    if (!start) return t('courses.self_paced')

    const end = formatMediumDate(
      course.data.end,
      router.locale
    )
    return end
      ? `${start} – ${end}`
      : `${t('courses.starts_on')} ${start}`
  }

  const translatedFields = getTranslatedFieldsDict(t)

  const activeFilters = []
  if (searchParam) {
    activeFilters.push({
      key: 'search',
      label: t('courses.search'),
      value: searchParam,
      removeLabel: t('courses.remove_filter', {
        filter: `${t('courses.search')} ${searchParam}`,
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
      label: t('courses.topics'),
      value: label,
      removeLabel: t('courses.remove_filter', {
        filter: `${t('courses.topics')} ${label}`,
      }),
      onRemove: () => handleFieldSearch('All'),
    })
  }

  const filterPanel = (
    <TopicsList
      topicsLabel={t('courses.topics')}
      fields={translatedFields}
      field={field}
      onFieldSelect={handleFieldSearch}
      hasActiveFilters={hasActiveFilters}
      clearLabel={t('courses.clear_filters')}
      onClear={handleClearFilters}
    />
  )

  return (
    <>
      <SocialMeta
        title={`${
          field && field !== 'All' ? field + ' ' : ''
        }Courses${
          search ? ` related to ${search}` : ''
        } | SciTeens`}
        description="Free, project-based science courses taught by and for teens — biology, physics, data science, and more."
        eyebrow="Courses"
        badge={field && field !== 'All' ? field : undefined}
        path="/courses"
      />
      <ListingLayout
        title={t('courses.courses')}
        lede={t('courses.lede')}
        aside={filterPanel}
      >
        <SearchToolbar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSubmit={handleSearch}
          onClear={handleClearSearch}
          placeholder={t('courses.search_courses')}
          searchLabel={t('courses.search')}
          submitLabel={t('courses.search')}
          clearSearchLabel={t('courses.clear_search')}
          filtersLabel={t('courses.filters')}
          hasActiveFilters={hasActiveFilters}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          filterPanel={filterPanel}
        />

        <ActiveFilters
          label={t('courses.active_filters')}
          filters={activeFilters}
          clearLabel={t('courses.clear_filters')}
          onClear={handleClearFilters}
        />

        <ResultsCount>
          {loading
            ? t('courses.loading')
            : !coursesQuery.isError &&
              typeof totalResults === 'number' &&
              t('courses.results_count', {
                count: totalResults,
              })}
        </ResultsCount>

        {coursesQuery.isError && (
          <div className="border-destructive/30 bg-destructive/5 rounded-xl border px-4 py-4 text-sm">
            <p className="text-destructive">
              {t('courses.load_failed')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => coursesQuery.refetch()}
            >
              {t('courses.retry')}
            </Button>
          </div>
        )}

        {/* The banner above sits alongside whatever already loaded: a
            failed next-page fetch must not unmount the pages the
            visitor has already scrolled through. */}
        {loading ? (
          <ListingSkeleton />
        ) : courses.length === 0 ? (
          !coursesQuery.isError && (
            <EmptyState
              title={t('courses.empty_title')}
              description={
                hasActiveFilters
                  ? t('courses.empty_filtered')
                  : t('courses.empty_default')
              }
              actionLabel={
                hasActiveFilters
                  ? t('courses.clear_filters')
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
            {courses.map((course, index) => {
              const title = RichText.asText(
                course.data.name
              )

              return (
                <div
                  key={course.uid}
                  className="w-full pt-6 md:pt-8"
                >
                  <ListingCard
                    href={`/course/${course.uid}`}
                    title={title}
                    description={RichText.asText(
                      course.data.description
                    )}
                    imageSrc={course.data.image_main?.url}
                    imageAlt={title}
                    imageLoader={imageLoader}
                    priority={index === 0}
                    meta={courseSchedule(course)}
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
          label={t('courses.load_more')}
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
    const courses = await client.query(
      [Prismic.Predicates.at('document.type', 'course')],
      {
        orderings: `[document.first_publication_date desc]`,
        pageSize: COURSES_PAGE_SIZE,
      }
    )

    return {
      props: { cached_courses: courses, ...translations },
    }
  } catch (e) {
    console.error(e)
    return {
      notFound: true,
    }
  }
}

export default Courses
