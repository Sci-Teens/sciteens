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
  COURSES_PAGE_SIZE,
  filterCourses,
} from '../lib/contentSearch'
import ActiveFilters from '@/components/search/ActiveFilters'
import EmptyState from '@/components/search/EmptyState'
import ListingCard from '@/components/search/ListingCard'
import ListingLayout from '@/components/search/ListingLayout'
import ResultsCount from '@/components/search/ResultsCount'
import SearchToolbar from '@/components/search/SearchToolbar'
import TopicsList from '@/components/search/TopicsList'

function Courses({ courses }) {
  const router = useRouter()
  const { t } = useTranslation('common')
  const [search, setSearch] = useState('')
  const [field, setField] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [visibleCount, setVisibleCount] = useState(
    COURSES_PAGE_SIZE
  )

  const searchParam = router.query?.search || ''
  const fieldParam =
    router.query?.field && router.query.field !== 'All'
      ? router.query.field
      : ''

  const hasActiveFilters = Boolean(
    searchParam || fieldParam
  )

  const results = useMemo(
    () =>
      filterCourses(courses, {
        search: searchParam,
        field: fieldParam,
      }),
    [courses, searchParam, fieldParam]
  )

  useEffect(() => {
    setVisibleCount(COURSES_PAGE_SIZE)
  }, [searchParam, fieldParam])

  const visible = results.slice(0, visibleCount)
  const hasNextPage = visibleCount < results.length

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
      course.start,
      router.locale
    )
    if (!start) return t('courses.self_paced')

    const end = formatMediumDate(course.end, router.locale)
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
          {t('courses.results_count', {
            count: results.length,
          })}
        </ResultsCount>

        {results.length === 0 ? (
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
        ) : (
          <div className="w-full">
            {visible.map((course, index) => (
              <div
                key={course.slug}
                className="w-full pt-6 md:pt-8"
              >
                <ListingCard
                  href={`/course/${course.slug}`}
                  title={course.title}
                  fallbackLabel={t('courses.untitled')}
                  description={course.description}
                  imageSrc={course.cover}
                  imageAlt={course.title}
                  priority={index === 0}
                  meta={courseSchedule(course)}
                />
              </div>
            ))}
          </div>
        )}

        <InfiniteScrollTrigger
          hasNextPage={hasNextPage}
          isLoading={false}
          onLoadMore={() =>
            setVisibleCount(
              (count) => count + COURSES_PAGE_SIZE
            )
          }
          label={t('courses.load_more')}
        />
      </ListingLayout>
    </>
  )
}

export async function getStaticProps({ locale }) {
  const { getCourseSummaries } = await import(
    '../lib/content'
  )
  return {
    props: {
      courses: getCourseSummaries(),
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

export default Courses
