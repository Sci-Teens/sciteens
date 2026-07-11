import { useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'
import SocialMeta from '@/components/SocialMeta'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { format } from 'date-fns'
import { useIntersectionObserver } from '../context/helpers'
import { getTranslatedFieldsDict } from '../context/helpers'
import PageHeading from '@/components/PageHeading'

import { db as firestore } from '../lib/firebase'
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
import { useWindowVirtualizer } from '@tanstack/react-virtual'

import {
  Calendar as CalendarIcon,
  PlusCircle,
} from 'lucide-react'
import ProjectCard from '../components/ProjectCard'
import {
  normalizeProject,
  formatProjectDate,
} from '../lib/projects'
import { requiresSearchIndex } from '../lib/search'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import SearchToolbar from '@/components/search/SearchToolbar'
import FilterAside from '@/components/search/FilterAside'
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

// Free-text search and/or a date range are answered by the self-hosted
// Meilisearch index (pages/api/search/projects.js) — see
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
  if (requiresSearchIndex({ search, dateFrom, dateTo })) {
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

// Independent of the listing query above: always asks Meilisearch for the
// current facet counts (unfiltered) so the topic list can show live
// numbers the moment the page loads, not just once a search is active.
// Failing silently (no counts shown) is the correct degrade — this must
// never block or error the page.
async function fetchProjectFacets() {
  const res = await fetch('/api/search/projects?page=0')
  if (!res.ok) throw new Error('facets_unavailable')
  const data = await res.json()
  return data.facets || []
}

function formatDateRangeLabel(dateRange, t) {
  if (dateRange.from && dateRange.to) {
    return `${format(
      dateRange.from,
      'MMM d, yyyy'
    )} – ${format(dateRange.to, 'MMM d, yyyy')}`
  }
  if (dateRange.from) {
    return format(dateRange.from, 'MMM d, yyyy')
  }
  return t('projects.date_range')
}

// Shared between the always-visible desktop sidebar and the mobile filter
// Sheet — one implementation, two places it's mounted.
function FilterPanel({
  t,
  field,
  onFieldSelect,
  dateRange,
  onDateRangeCommit,
  facets,
  hasActiveFilters,
  onClear,
}) {
  // Calendar range-mode fires onSelect on every click, including the
  // first (single-day) click of a two-click range — committing straight
  // to the URL on each of those would navigate mid-selection and blow
  // away whatever the user was in the middle of picking. Buffer the
  // in-progress selection locally and only commit (push to the URL)
  // once the popover closes.
  const [pendingRange, setPendingRange] =
    useState(dateRange)
  const [datePopoverOpen, setDatePopoverOpen] =
    useState(false)

  useEffect(() => {
    setPendingRange(dateRange)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.from, dateRange.to])

  function commitIfChanged(range) {
    const changed =
      range.from?.getTime() !== dateRange.from?.getTime() ||
      range.to?.getTime() !== dateRange.to?.getTime()
    if (changed) onDateRangeCommit(range)
  }

  function handlePopoverOpenChange(open) {
    setDatePopoverOpen(open)
    if (!open) commitIfChanged(pendingRange)
  }

  function handleClearDates() {
    const cleared = { from: undefined, to: undefined }
    setPendingRange(cleared)
    commitIfChanged(cleared)
    setDatePopoverOpen(false)
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
        <Popover
          open={datePopoverOpen}
          onOpenChange={handlePopoverOpenChange}
        >
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className="bg-card w-full justify-start shadow-sm"
              >
                <CalendarIcon
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                {formatDateRangeLabel(pendingRange, t)}
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="range"
              numberOfMonths={1}
              selected={pendingRange}
              defaultMonth={pendingRange.from}
              onSelect={setPendingRange}
            />
            <div className="border-border/60 flex items-center justify-between gap-2 border-t p-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearDates}
                disabled={
                  !pendingRange.from && !pendingRange.to
                }
              >
                {t('projects.clear_filters')}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={() =>
                  handlePopoverOpenChange(false)
                }
              >
                {t('projects.apply_dates')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
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
    from: undefined,
    to: undefined,
  })
  const [filtersOpen, setFiltersOpen] = useState(false)

  const searchParam = router.query?.search || ''
  const fieldParam =
    router.query?.field && router.query.field !== 'All'
      ? router.query.field
      : ''
  const dateFromParam = router.query?.dateFrom || ''
  const dateToParam = router.query?.dateTo || ''
  const sortParam = router.query?.sort || ''

  useEffect(() => {
    if (!router?.isReady) return
    setSearch(router.query?.search || '')
    setField(fieldParam)
    setSort(sortParam)
    setDateRange({
      from: dateFromParam
        ? new Date(dateFromParam)
        : undefined,
      to: dateToParam ? new Date(dateToParam) : undefined,
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

  const hasActiveFilters = Boolean(
    search ||
      field ||
      dateRange.from ||
      dateRange.to ||
      sort
  )

  const initialData = useMemo(() => {
    if (
      !router.isReady ||
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
    router.isReady,
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
    staleTime: 5 * 60 * 1000,
    retry: false,
  })
  const facets = facetsQuery.data || []

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

  function pushFilters(overrides = {}) {
    const next = {
      search,
      field,
      dateFrom: dateRange.from,
      dateTo: dateRange.to,
      sort,
      ...overrides,
    }
    const query = {}
    if (next.search) query.search = next.search
    if (next.field) query.field = next.field
    if (next.dateFrom)
      query.dateFrom = format(next.dateFrom, 'yyyy-MM-dd')
    if (next.dateTo)
      query.dateTo = format(next.dateTo, 'yyyy-MM-dd')
    if (next.sort) query.sort = next.sort
    router.push({ pathname: '/projects', query })
  }

  function handleSearchSubmit(e) {
    e.preventDefault()
    pushFilters({})
  }

  function handleFieldSelect(nextField) {
    const value = nextField === 'All' ? '' : nextField
    setField(value)
    pushFilters({ field: value })
    setFiltersOpen(false)
  }

  function handleDateRangeSelect(range) {
    const next = range || {
      from: undefined,
      to: undefined,
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
    setDateRange({ from: undefined, to: undefined })
    setFiltersOpen(false)
    router.push({ pathname: '/projects' })
  }

  const projectVirtualizer = useWindowVirtualizer({
    count: projects.length,
    estimateSize: () => 320,
    overscan: 5,
  })

  const projectsComponent = (
    <div
      className="relative w-full"
      style={{
        height: `${projectVirtualizer.getTotalSize()}px`,
      }}
    >
      {projectVirtualizer
        .getVirtualItems()
        .map((virtualRow) => {
          const project = projects[virtualRow.index]
          if (!project) return null

          return (
            <div
              key={project.id}
              ref={projectVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute left-0 top-0 w-full pt-6 md:pt-8"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <ProjectCard
                project={project}
                date={formatProjectDate(
                  project.date,
                  router?.locale
                )}
              />
            </div>
          )
        })}
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

  const filterPanelProps = {
    t,
    field,
    onFieldSelect: handleFieldSelect,
    dateRange,
    onDateRangeCommit: handleDateRangeSelect,
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
      <div className="text-foreground mx-auto mb-24 mt-8 min-h-screen px-4 md:px-0 lg:mx-16 xl:mx-32">
        <div className="flex flex-row items-center justify-between">
          <PageHeading className="ml-0 py-4 text-left">
            {t('projects.projects')} 🔬
          </PageHeading>
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
            className="shrink-0"
          />
        </div>

        {projectsQuery.isError && (
          <div className="border-destructive/30 bg-destructive/5 text-destructive mb-6 rounded-xl border px-4 py-3 text-sm">
            {t('projects.search_unavailable')}
          </div>
        )}

        <div className="flex flex-row items-start gap-8 xl:gap-12">
          <div className="min-w-0 flex-1">
            {/* Search + sort + filters row lives inside the content
                column (not the outer page container) so its width — and
                therefore the search input/card right edge — matches the
                results list below exactly. It's always visible at every
                breakpoint; the previous layout hid the entire search UI
                below `lg`, leaving mobile/tablet visitors with no way to
                search or filter at all. */}
            <SearchToolbar
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onSubmit={handleSearchSubmit}
              placeholder={t('projects.search_projects')}
              searchLabel={t('projects.search')}
              submitLabel={t('projects.search')}
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
                <SelectTrigger className="bg-card w-full shadow-sm sm:w-44">
                  <SelectValue />
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
                </SelectContent>
              </Select>
            </SearchToolbar>

            {typeof totalHits === 'number' && (
              <p className="text-muted-foreground mb-2 text-sm">
                {t('projects.results_count', {
                  count: totalHits,
                })}
              </p>
            )}
            <div
              className={cn(
                'transition-opacity',
                projectsQuery.isFetching &&
                  !loading &&
                  'opacity-60'
              )}
            >
              {loading && projects.length === 0
                ? loadingComponent
                : projectsComponent}
            </div>
            {projectsQuery.isFetchingNextPage &&
              loadingComponent.slice(0, 2)}
            {!loading &&
              !projectsQuery.isError &&
              projects.length === 0 &&
              hasActiveFilters && (
                <div className="mx-auto mt-20 text-center">
                  <i className="text-xl font-semibold">
                    {search
                      ? `${t('projects.sorry')} ${search}`
                      : t('projects.sorry')}
                  </i>
                </div>
              )}
            <div
              ref={ref}
              style={{ width: '100%', height: '20px' }}
            ></div>
          </div>

          <FilterAside>
            <FilterPanel {...filterPanelProps} />
          </FilterAside>
        </div>
      </div>
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
