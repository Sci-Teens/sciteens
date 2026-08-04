import { useEffect, useId, useMemo, useState } from 'react'

import Link from 'next/link'
import SocialMeta from '@/components/SocialMeta'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import {
  getFieldLabel,
  getTranslatedFieldsDict,
} from '../context/helpers'

import { db as firestore } from '../lib/firestore'
import firebaseConfig from '../firebaseConfig'
import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app'
import {
  collection,
  query as firebase_query,
  orderBy,
  getDocs,
  limit,
  getFirestore,
  where as firebase_where,
  startAfter,
} from 'firebase/firestore'
import {
  keepPreviousData,
  useInfiniteQuery,
  useQuery,
} from '@tanstack/react-query'

import { PlusCircle } from 'lucide-react'
import ProjectCard from '../components/ProjectCard'
import InfiniteScrollTrigger from '@/components/InfiniteScrollTrigger'
import { normalizeProject } from '../lib/projects'
import { formatMediumDate } from '../lib/formatDate'
import { requiresSearchIndex } from '../lib/search'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import ActiveFilters from '@/components/search/ActiveFilters'
import EmptyState from '@/components/search/EmptyState'
import ListingLayout from '@/components/search/ListingLayout'
import ListingSkeleton from '@/components/search/ListingSkeleton'
import ResultsCount from '@/components/search/ResultsCount'
import SearchToolbar from '@/components/search/SearchToolbar'
import TopicsList from '@/components/search/TopicsList'

const PROJECTS_PAGE_SIZE = 10

function mapProjectSnapshot(snapshot) {
  const projects = []
  snapshot.forEach((project) => {
    projects.push(
      normalizeProject({
        id: project.id,
        ...project.data(),
      })
    )
  })
  return projects
}

// Free-text search, a date range, or upvote ordering are answered by the
// self-hosted Meilisearch index (pages/api/search/projects.js) — see
// lib/search.js#requiresSearchIndex. Plain browsing and single-topic
// filtering stay on Firestore directly: it's already fast, needs no
// search infra, and is what getStaticProps below seeds at build time.
async function fetchProjectsSearchPage({
  search,
  field,
  dateFrom,
  dateTo,
  sort,
  pageParam,
}) {
  const params = new URLSearchParams()
  if (search) params.set('q', search)
  if (field) params.set('field', field)
  if (dateFrom) params.set('dateFrom', dateFrom)
  if (dateTo) params.set('dateTo', dateTo)
  if (sort) params.set('sort', sort)
  params.set('page', String(pageParam || 0))

  const res = await fetch(
    `/api/search/projects?${params.toString()}`
  )
  if (!res.ok) {
    throw new Error('search_unavailable')
  }
  const data = await res.json()
  return {
    projects: data.projects,
    nextCursor: data.hasNextPage
      ? (pageParam || 0) + 1
      : null,
    facets: data.facets,
    totalHits: data.totalHits,
  }
}

async function fetchProjectsPage({
  search,
  field,
  dateFrom,
  dateTo,
  sort,
  pageParam,
}) {
  if (
    requiresSearchIndex({ search, dateFrom, dateTo, sort })
  ) {
    return fetchProjectsSearchPage({
      search,
      field,
      dateFrom,
      dateTo,
      sort,
      pageParam,
    })
  }

  const projectsCollection = collection(
    firestore,
    'projects'
  )
  const constraints = []
  if (field) {
    // Legacy project docs store `fields` lowercase (pre-dates the
    // Title Case FIELD_NAMES dict); array-contains can't do a
    // case-insensitive match, so match both casings instead of
    // requiring a Firestore data backfill.
    constraints.push(
      firebase_where('fields', 'array-contains-any', [
        field,
        field.toLowerCase(),
      ])
    )
  }
  constraints.push(
    orderBy('date', sort === 'oldest' ? 'asc' : 'desc')
  )
  if (pageParam) {
    constraints.push(startAfter(pageParam))
  }
  constraints.push(limit(PROJECTS_PAGE_SIZE))

  const projectsQuery = firebase_query(
    projectsCollection,
    ...constraints
  )
  const projectsRef = await getDocs(projectsQuery)
  const projects = mapProjectSnapshot(projectsRef)

  return {
    projects,
    nextCursor:
      projects.length === PROJECTS_PAGE_SIZE
        ? projects[projects.length - 1].date
        : null,
  }
}

// Whole-index counts, used only when the listing itself came from
// Firestore (plain browsing) and so carries no facet distribution of its
// own. Once a search is active the page prefers the query-scoped counts
// the API returns alongside the hits, which describe the result set on
// screen rather than the entire index.
// Failing silently (no counts shown) is the correct degrade — this must
// never block or error the page.
async function fetchProjectFacets() {
  const res = await fetch('/api/search/projects?page=0')
  if (!res.ok) throw new Error('facets_unavailable')
  const data = await res.json()
  return data.facets || []
}

// Shared between the always-visible desktop sidebar and the mobile filter
// Sheet — one implementation, two places it's mounted.
function FilterPanel({
  t,
  field,
  onFieldSelect,
  dateRange,
  onDateRangeChange,
  facets,
  hasActiveFilters,
  onClear,
}) {
  const fromId = useId()
  const toId = useId()

  function handleFromChange(e) {
    onDateRangeChange({
      from: e.target.value,
      to: dateRange.to,
    })
  }

  function handleToChange(e) {
    onDateRangeChange({
      from: dateRange.from,
      to: e.target.value,
    })
  }

  return (
    <div className="flex flex-col gap-6">
      <TopicsList
        topicsLabel={t('projects.topics')}
        fields={getTranslatedFieldsDict(t)}
        field={field}
        onFieldSelect={onFieldSelect}
        facets={facets}
        hasActiveFilters={hasActiveFilters}
        clearLabel={t('projects.clear_filters')}
        onClear={onClear}
      />

      <Separator />

      <div>
        <h2 className="text-foreground mb-3 text-sm font-semibold">
          {t('projects.date_range')}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor={fromId}
              className="text-muted-foreground mb-1 block text-xs"
            >
              {t('projects.date_from')}
            </label>
            <Input
              id={fromId}
              type="date"
              value={dateRange.from}
              max={dateRange.to || undefined}
              onChange={handleFromChange}
              className="bg-card shadow-sm"
            />
          </div>
          <div>
            <label
              htmlFor={toId}
              className="text-muted-foreground mb-1 block text-xs"
            >
              {t('projects.date_to')}
            </label>
            <Input
              id={toId}
              type="date"
              value={dateRange.to}
              min={dateRange.from || undefined}
              onChange={handleToChange}
              className="bg-card shadow-sm"
            />
          </div>
        </div>
        {(dateRange.from || dateRange.to) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() =>
              onDateRangeChange({ from: '', to: '' })
            }
          >
            {t('projects.clear_filters')}
          </Button>
        )}
      </div>
    </div>
  )
}

function Projects({ cached_projects }) {
  const router = useRouter()
  const { t } = useTranslation('common')

  const [search, setSearch] = useState('')
  const [field, setField] = useState('')
  const [sort, setSort] = useState('')
  const [dateRange, setDateRange] = useState({
    from: '',
    to: '',
  })
  const [filtersOpen, setFiltersOpen] = useState(false)

  const searchParam = router.query?.search || ''
  const fieldParam =
    router.query?.field && router.query.field !== 'All'
      ? router.query.field
      : ''
  const dateFromParam = router.query?.dateFrom || ''
  const dateToParam = router.query?.dateTo || ''
  // Clamp to the values the sort control and the query builder both
  // understand: `?sort=anything` otherwise renders a blank Select
  // trigger and a chip that disagrees with the executed ordering.
  const rawSortParam = router.query?.sort || ''
  const sortParam = [
    'newest',
    'oldest',
    'upvotes',
  ].includes(rawSortParam)
    ? rawSortParam
    : ''

  useEffect(() => {
    if (!router?.isReady) return
    setSearch(router.query?.search || '')
    setField(fieldParam)
    setSort(sortParam)
    setDateRange({
      from: dateFromParam,
      to: dateToParam,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    router.isReady,
    searchParam,
    fieldParam,
    dateFromParam,
    dateToParam,
    sortParam,
  ])

  // Derived from the URL, not the input state: the chips and the empty
  // state must describe the result set on screen, not a search term the
  // visitor has typed but not submitted yet.
  const hasActiveFilters = Boolean(
    searchParam ||
      fieldParam ||
      dateFromParam ||
      dateToParam ||
      sortParam
  )

  const initialData = useMemo(() => {
    if (
      searchParam ||
      fieldParam ||
      dateFromParam ||
      dateToParam ||
      sortParam ||
      cached_projects.length === 0
    ) {
      return undefined
    }

    return {
      pages: [
        {
          projects: cached_projects,
          nextCursor:
            cached_projects.length === PROJECTS_PAGE_SIZE
              ? cached_projects[cached_projects.length - 1]
                  .date
              : null,
        },
      ],
      pageParams: [null],
    }
  }, [
    searchParam,
    fieldParam,
    dateFromParam,
    dateToParam,
    sortParam,
    cached_projects,
  ])

  const projectsQuery = useInfiniteQuery({
    queryKey: [
      'projects',
      searchParam,
      fieldParam,
      dateFromParam,
      dateToParam,
      sortParam,
    ],
    enabled: router.isReady,
    initialPageParam: null,
    initialData,
    queryFn: ({ pageParam }) =>
      fetchProjectsPage({
        search: searchParam,
        field: fieldParam,
        dateFrom: dateFromParam,
        dateTo: dateToParam,
        sort: sortParam,
        pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    // Keep showing the previous result set while a sort/filter change
    // is in flight instead of dumping to the full skeleton loader —
    // switching sort order felt broken/jarring without this since every
    // change is a brand-new query key.
    placeholderData: keepPreviousData,
  })

  const facetsQuery = useQuery({
    queryKey: ['projectFacets'],
    queryFn: fetchProjectFacets,
    // Only the Firestore browse path needs it. On a search the listing
    // response already carries query-scoped counts, so firing this too would
    // spend a second round trip (and possibly a cold start) on a
    // distribution that is discarded a few lines below.
    enabled:
      router.isReady &&
      !requiresSearchIndex({
        search: searchParam,
        dateFrom: dateFromParam,
        dateTo: dateToParam,
        sort: sortParam,
      }),
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  // Query-scoped counts win whenever the listing came from the search
  // index: "of these results, N are Biology" is the number that makes the
  // topic list a usable next step. The whole-index counts only stand in
  // for the Firestore browse path, which has no distribution to report.
  const facets =
    projectsQuery.data?.pages[0]?.facets ||
    facetsQuery.data ||
    []

  const projects = useMemo(
    () =>
      projectsQuery.data?.pages.flatMap(
        (page) => page.projects
      ) || [],
    [projectsQuery.data]
  )
  const totalHits = projectsQuery.data?.pages[0]?.totalHits
  const loading =
    projectsQuery.isLoading && projects.length === 0
  const { hasNextPage, isFetchingNextPage, fetchNextPage } =
    projectsQuery

  useEffect(() => {
    if (projectsQuery.isError) {
      console.error(
        'Failed to load projects:',
        projectsQuery.error
      )
    }
  }, [projectsQuery.isError, projectsQuery.error])

  // Every handler below changes exactly one filter, so the rest are
  // read back from the URL rather than from input state: sourcing them
  // from `search` would commit a half-typed term the visitor never
  // submitted just because they removed an unrelated chip.
  function pushFilters(overrides = {}) {
    const next = {
      search: searchParam,
      field: fieldParam,
      dateFrom: dateFromParam,
      dateTo: dateToParam,
      sort: sortParam,
      ...overrides,
    }
    const query = {}
    if (next.search) query.search = next.search
    if (next.field) query.field = next.field
    if (next.dateFrom) query.dateFrom = next.dateFrom
    if (next.dateTo) query.dateTo = next.dateTo
    if (next.sort) query.sort = next.sort
    router.push({ pathname: '/projects', query })
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    pushFilters({ search })
  }

  function handleClearSearch() {
    setSearch('')
    pushFilters({ search: '' })
  }

  function handleFieldSelect(nextField) {
    const value = nextField === 'All' ? '' : nextField
    setField(value)
    pushFilters({ field: value })
    setFiltersOpen(false)
  }

  function handleDateRangeChange(range) {
    const next = {
      from: range.from || '',
      to: range.to || '',
    }
    setDateRange(next)
    pushFilters({ dateFrom: next.from, dateTo: next.to })
  }

  function handleSortChange(value) {
    const next = value === 'relevance' ? '' : value
    setSort(next)
    pushFilters({ sort: next })
  }

  function handleClearFilters() {
    setSearch('')
    setField('')
    setSort('')
    setDateRange({ from: '', to: '' })
    setFiltersOpen(false)
    router.push({ pathname: '/projects' })
  }

  const translatedFields = getTranslatedFieldsDict(t)

  // Base UI renders the raw value in the trigger unless it is told how
  // to label it, so the sort control read "relevance" instead of
  // "Relevance".
  const sortLabels = {
    relevance: t('projects.sort_relevance'),
    newest: t('projects.sort_newest'),
    oldest: t('projects.sort_oldest'),
    upvotes: t('projects.sort_upvotes'),
  }

  const activeFilters = []
  if (searchParam) {
    activeFilters.push({
      key: 'search',
      label: t('projects.search'),
      value: searchParam,
      removeLabel: t('projects.remove_filter', {
        filter: `${t('projects.search')} ${searchParam}`,
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
      label: t('projects.topics'),
      value: label,
      removeLabel: t('projects.remove_filter', {
        filter: `${t('projects.topics')} ${label}`,
      }),
      onRemove: () => handleFieldSelect('All'),
    })
  }
  if (dateFromParam || dateToParam) {
    const from = formatMediumDate(
      dateFromParam,
      router.locale
    )
    const to = formatMediumDate(dateToParam, router.locale)
    const value =
      from && to
        ? `${from} – ${to}`
        : from || `${t('projects.date_to')} ${to}`
    activeFilters.push({
      key: 'date',
      label: t('projects.date_range'),
      value,
      removeLabel: t('projects.remove_filter', {
        filter: `${t('projects.date_range')} ${value}`,
      }),
      onRemove: () =>
        handleDateRangeChange({ from: '', to: '' }),
    })
  }
  if (sortParam) {
    const value = sortLabels[sortParam]
    activeFilters.push({
      key: 'sort',
      label: t('projects.sort_by'),
      value,
      removeLabel: t('projects.remove_filter', {
        filter: `${t('projects.sort_by')} ${value}`,
      }),
      onRemove: () => handleSortChange('relevance'),
    })
  }

  const filterPanelProps = {
    t,
    field,
    onFieldSelect: handleFieldSelect,
    dateRange,
    onDateRangeChange: handleDateRangeChange,
    facets,
    hasActiveFilters,
    onClear: handleClearFilters,
  }

  return (
    <>
      <SocialMeta
        title={`${
          field && field !== 'All' ? field + ' ' : ''
        }Projects${
          search ? ` related to ${search}` : ''
        } | SciTeens`}
        description="Real research projects built by teen scientists — get inspired, give feedback, or start your own."
        eyebrow="Projects"
        badge={field && field !== 'All' ? field : undefined}
        path="/projects"
      />
      <ListingLayout
        title={t('projects.projects')}
        lede={t('projects.lede')}
        aside={<FilterPanel {...filterPanelProps} />}
        actions={
          <Button
            variant="outline"
            render={
              <Link href="/project/create">
                <PlusCircle
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                {t('projects.create')}
              </Link>
            }
            className="shrink-0 touch-manipulation"
          />
        }
      >
        <SearchToolbar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onSubmit={handleSearchSubmit}
          onClear={handleClearSearch}
          placeholder={t('projects.search_projects')}
          searchLabel={t('projects.search')}
          submitLabel={t('projects.search')}
          clearSearchLabel={t('projects.clear_search')}
          filtersLabel={t('projects.filters')}
          hasActiveFilters={hasActiveFilters}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          filterPanel={
            <FilterPanel {...filterPanelProps} />
          }
        >
          <Select
            value={sort || 'relevance'}
            onValueChange={handleSortChange}
          >
            <SelectTrigger
              aria-label={t('projects.sort_by')}
              className="bg-card w-full shadow-sm sm:w-44"
            >
              <SelectValue>
                {(value) => sortLabels[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">
                {t('projects.sort_relevance')}
              </SelectItem>
              <SelectItem value="newest">
                {t('projects.sort_newest')}
              </SelectItem>
              <SelectItem value="oldest">
                {t('projects.sort_oldest')}
              </SelectItem>
              <SelectItem value="upvotes">
                {t('projects.sort_upvotes')}
              </SelectItem>
            </SelectContent>
          </Select>
        </SearchToolbar>

        <ActiveFilters
          label={t('projects.active_filters')}
          filters={activeFilters}
          clearLabel={t('projects.clear_filters')}
          onClear={handleClearFilters}
        />

        <ResultsCount>
          {loading
            ? t('projects.loading')
            : !projectsQuery.isError &&
              typeof totalHits === 'number' &&
              t('projects.results_count', {
                count: totalHits,
              })}
        </ResultsCount>

        {projectsQuery.isError && (
          <div className="border-destructive/30 bg-destructive/5 rounded-xl border px-4 py-4 text-sm">
            <p className="text-destructive">
              {t('projects.search_unavailable')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => projectsQuery.refetch()}
            >
              {t('projects.retry')}
            </Button>
          </div>
        )}

        {/* The banner above sits alongside whatever already loaded: a
            failed next-page fetch must not unmount the pages the
            visitor has already scrolled through. */}
        {loading ? (
          <ListingSkeleton />
        ) : projects.length === 0 ? (
          !projectsQuery.isError && (
            <EmptyState
              title={t('projects.empty_title')}
              description={
                hasActiveFilters
                  ? t('projects.empty_filtered')
                  : t('projects.empty_default')
              }
              actionLabel={
                hasActiveFilters
                  ? t('projects.clear_filters')
                  : undefined
              }
              onAction={
                hasActiveFilters
                  ? handleClearFilters
                  : undefined
              }
              action={
                hasActiveFilters ? undefined : (
                  <Button
                    variant="outline"
                    className="mt-6"
                    render={
                      <Link href="/project/create">
                        <PlusCircle
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                        {t('projects.create')}
                      </Link>
                    }
                  />
                )
              }
            />
          )
        ) : (
          <div
            className={cn(
              'w-full transition-opacity',
              // Dim only while keepPreviousData holds a stale filter/sort page, not initial revalidation or next-page fetches.
              projectsQuery.isPlaceholderData &&
                'opacity-60'
            )}
          >
            {projects.map((project) => (
              <div
                key={project.id}
                className="w-full pt-6 md:pt-8"
              >
                <ProjectCard
                  project={project}
                  date={formatMediumDate(
                    project.date,
                    router.locale
                  )}
                />
              </div>
            ))}
          </div>
        )}

        {isFetchingNextPage && (
          <ListingSkeleton count={2} />
        )}

        <InfiniteScrollTrigger
          hasNextPage={hasNextPage}
          isLoading={isFetchingNextPage}
          onLoadMore={fetchNextPage}
          label={t('projects.load_more')}
        />
      </ListingLayout>
    </>
  )
}

export async function getStaticProps({ locale }) {
  let projects = []
  const translationsPromise = serverSideTranslations(
    locale,
    ['common']
  )
  const app =
    getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApp()
  const firestore = getFirestore(app)
  const projectsCollection = collection(
    firestore,
    'projects'
  )
  const projectsQuery = firebase_query(
    projectsCollection,
    orderBy('date', 'desc'),
    limit(10)
  )
  const [translations, projectsRef] = await Promise.all([
    translationsPromise,
    getDocs(projectsQuery),
  ])
  projectsRef.forEach((p) => {
    projects.push(
      normalizeProject({
        id: p.id,
        ...p.data(),
      })
    )
  })
  return {
    props: { cached_projects: projects, ...translations },
  }
}

export default Projects
