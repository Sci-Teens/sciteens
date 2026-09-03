import { useEffect, useId, useMemo, useState } from 'react'

import {
  keepPreviousData,
  useInfiniteQuery,
} from '@tanstack/react-query'
import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useRouter } from 'next/router'

import InfiniteScrollTrigger from '@/components/InfiniteScrollTrigger'
import OpportunityFieldIcons from '@/components/OpportunityFieldIcons'
import SocialMeta from '@/components/SocialMeta'
import ActiveFilters from '@/components/search/ActiveFilters'
import EmptyState from '@/components/search/EmptyState'
import ListingCard from '@/components/search/ListingCard'
import ListingLayout from '@/components/search/ListingLayout'
import ListingSkeleton from '@/components/search/ListingSkeleton'
import ResultsCount from '@/components/search/ResultsCount'
import SearchToolbar from '@/components/search/SearchToolbar'
import TopicsList from '@/components/search/TopicsList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  formatGradeRange,
  getFieldLabel,
  getTranslatedFieldsDict,
} from '@/context/helpers'
import firebaseConfig from '@/firebaseConfig'
import { formatMediumDate } from '@/lib/formatDate'
import { getFieldIcon } from '@/lib/fieldIcons'
import {
  deadlineDisplay,
  fetchOpenNowOpportunities,
} from '@/lib/opportunities'
import {
  OPPORTUNITIES_SEARCH_HITS_PER_PAGE,
  OPPORTUNITY_PROGRAM_TYPES,
  OPPORTUNITY_STATUS_OPTIONS,
} from '@/lib/opportunitySearch'
import { cn } from '@/lib/utils'

const OPPORTUNITIES_EMAIL = 'opportunities@sciteens.org'
const GRADE_OPTIONS = ['9', '10', '11', '12']
const DEFAULT_STATUS = 'open'
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/
const EMPTY_FACETS = {
  fields: [],
  locations: [],
  programTypes: [],
}

const PROGRAM_TYPE_KEYS = {
  'Summer Program':
    'opportunities.program_types.summer_program',
  'Academic Year Program':
    'opportunities.program_types.academic_year_program',
  Competition: 'opportunities.program_types.competition',
  Internship: 'opportunities.program_types.internship',
  'Research Experience':
    'opportunities.program_types.research_experience',
  Scholarship: 'opportunities.program_types.scholarship',
  'Online Course':
    'opportunities.program_types.online_course',
  Fellowship: 'opportunities.program_types.fellowship',
  Camp: 'opportunities.program_types.camp',
  Other: 'opportunities.program_types.other',
}

const LOCATION_KEYS = {
  Virtual: 'opportunities.location_values.virtual',
  Nationwide: 'opportunities.location_values.nationwide',
  'United States':
    'opportunities.location_values.united_states',
}

function firstQueryValue(value) {
  return Array.isArray(value) ? value[0] : value || ''
}

function validDateQuery(value) {
  const date = firstQueryValue(value)
  return DATE_ONLY.test(date) ? date : ''
}

function programTypeLabel(t, value) {
  return PROGRAM_TYPE_KEYS[value]
    ? t(PROGRAM_TYPE_KEYS[value])
    : value
}

function locationLabel(t, value) {
  return LOCATION_KEYS[value]
    ? t(LOCATION_KEYS[value])
    : value
}

async function fetchOpportunitiesSearchPage({
  search,
  field,
  grade,
  location,
  programType,
  deadlineFrom,
  deadlineTo,
  status,
  pageParam,
}) {
  const params = new URLSearchParams()
  if (search) params.set('q', search)
  if (field) params.set('field', field)
  if (grade) params.set('grade', grade)
  if (location) params.set('location', location)
  if (programType) params.set('type', programType)
  if (deadlineFrom) params.set('deadlineFrom', deadlineFrom)
  if (deadlineTo) params.set('deadlineTo', deadlineTo)
  if (status) params.set('status', status)
  params.set('page', String(pageParam || 0))

  const response = await fetch(
    `/api/search/opportunities?${params.toString()}`
  )
  if (!response.ok) throw new Error('search_unavailable')
  const data = await response.json()
  return {
    opportunities: data.opportunities,
    nextCursor: data.hasNextPage
      ? (pageParam || 0) + 1
      : null,
    facets: data.facets,
    totalHits: data.totalHits,
  }
}

function metaLine(program, timingLabel, t) {
  const parts = []
  const gradeLabel = formatGradeRange(
    program.gradeRangeLow,
    program.gradeRangeHigh,
    t
  )
  if (gradeLabel) parts.push(gradeLabel)
  if (timingLabel) parts.push(timingLabel)
  if (program.location) parts.push(program.location)
  return parts.join(' · ')
}

function upcomingDeadlineMeta(program, locale, t) {
  const { kind, date } = deadlineDisplay(program)
  if (kind === 'dated') {
    return metaLine(
      program,
      `${t('opportunities.deadline')} ${formatMediumDate(
        date,
        locale
      )}`,
      t
    )
  }
  return metaLine(
    program,
    kind === 'rolling'
      ? t('opportunities.rolling')
      : t('opportunities.deadline_unknown'),
    t
  )
}

function deadlineUnknownMeta(program, locale, t) {
  return metaLine(
    program,
    t('opportunities.deadline_unknown'),
    t
  )
}

function applicationOpensMeta(program, locale, t) {
  const opens = program.applicationOpensDate
    ? formatMediumDate(program.applicationOpensDate, locale)
    : ''
  return metaLine(
    program,
    opens
      ? t('opportunities.opens_on', { date: opens })
      : '',
    t
  )
}

function pastDeadlineMeta(program, locale, t) {
  const deadline = program.applicationDeadline
    ? formatMediumDate(program.applicationDeadline, locale)
    : ''
  return metaLine(
    program,
    deadline
      ? t('opportunities.closed_on', { date: deadline })
      : '',
    t
  )
}

function TopicBadges({ fields, translatedFields }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {fields.map((field) => {
        const { Icon, bg, fg } = getFieldIcon(field)
        return (
          <span
            key={field}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium',
              bg,
              fg
            )}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            {getFieldLabel(translatedFields, field)}
          </span>
        )
      })}
    </div>
  )
}

function OpportunityCard({
  program,
  meta,
  translatedFields,
  muted,
  priority,
}) {
  return (
    <ListingCard
      href={`/program/${program.slug}`}
      title={program.name}
      description={program.about}
      imageSrc={program.imageUrl}
      imageAlt=""
      imageFit={program.imageFit}
      priority={priority}
      media={
        program.imageUrl ? undefined : (
          <OpportunityFieldIcons fields={program.fields} />
        )
      }
      meta={meta}
      footer={
        <TopicBadges
          fields={program.fields}
          translatedFields={translatedFields}
        />
      }
      className={cn(
        'opportunity-card',
        muted && 'opacity-70'
      )}
    />
  )
}

function FilterPanel({
  t,
  field,
  onFieldSelect,
  grade,
  onGradeChange,
  location,
  onLocationChange,
  programType,
  onProgramTypeChange,
  deadlineRange,
  onDeadlineRangeChange,
  facets,
  hasActiveFilters,
  onClear,
  gradeLabels,
}) {
  const deadlineFromId = useId()
  const deadlineToId = useId()
  const gradeId = useId()
  const programTypeId = useId()
  const locationId = useId()
  const locations = location
    ? [
        { value: location, count: 0 },
        ...facets.locations.filter(
          (option) => option.value !== location
        ),
      ]
    : facets.locations

  return (
    <div className="flex flex-col gap-6">
      <TopicsList
        topicsLabel={t('opportunities.topics')}
        fields={getTranslatedFieldsDict(t)}
        field={field}
        onFieldSelect={onFieldSelect}
        facets={facets.fields}
        hasActiveFilters={hasActiveFilters}
        clearLabel={t('opportunities.clear_filters')}
        onClear={onClear}
      />

      <Separator />

      <div className="space-y-4">
        <div>
          <h2 className="text-foreground mb-3 text-sm font-semibold">
            {t('opportunities.student_fit')}
          </h2>
          <label
            htmlFor={gradeId}
            className="text-muted-foreground mb-1 block text-xs"
          >
            {t('opportunities.grade_level')}
          </label>
          <Select
            value={grade || 'any'}
            onValueChange={(value) =>
              onGradeChange(value === 'any' ? '' : value)
            }
          >
            <SelectTrigger
              id={gradeId}
              aria-label={t('opportunities.grade_level')}
              className="bg-card w-full shadow-sm"
            >
              <SelectValue>
                {(value) => gradeLabels[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">
                {gradeLabels.any}
              </SelectItem>
              {GRADE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {gradeLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label
            htmlFor={programTypeId}
            className="text-muted-foreground mb-1 block text-xs"
          >
            {t('opportunities.program_type')}
          </label>
          <Select
            value={programType || 'any'}
            onValueChange={(value) =>
              onProgramTypeChange(
                value === 'any' ? '' : value
              )
            }
          >
            <SelectTrigger
              id={programTypeId}
              aria-label={t('opportunities.program_type')}
              className="bg-card w-full shadow-sm"
            >
              <SelectValue>
                {(value) =>
                  value === 'any'
                    ? t('opportunities.any_program_type')
                    : programTypeLabel(t, value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">
                {t('opportunities.any_program_type')}
              </SelectItem>
              {OPPORTUNITY_PROGRAM_TYPES.map((option) => (
                <SelectItem key={option} value={option}>
                  {programTypeLabel(t, option)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label
            htmlFor={locationId}
            className="text-muted-foreground mb-1 block text-xs"
          >
            {t('opportunities.location')}
          </label>
          <Select
            value={location || 'any'}
            onValueChange={(value) =>
              onLocationChange(value === 'any' ? '' : value)
            }
          >
            <SelectTrigger
              id={locationId}
              aria-label={t('opportunities.location')}
              className="bg-card w-full shadow-sm"
            >
              <SelectValue>
                {(value) =>
                  value === 'any'
                    ? t('opportunities.any_location')
                    : locationLabel(t, value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">
                {t('opportunities.any_location')}
              </SelectItem>
              {locations.map((option) => (
                <SelectItem
                  key={option.value}
                  value={option.value}
                >
                  {locationLabel(t, option.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Separator />

      <div>
        <h2 className="text-foreground mb-3 text-sm font-semibold">
          {t('opportunities.application_deadline')}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label
              htmlFor={deadlineFromId}
              className="text-muted-foreground mb-1 block text-xs"
            >
              {t('opportunities.deadline_from')}
            </label>
            <Input
              id={deadlineFromId}
              type="date"
              value={deadlineRange.from}
              max={deadlineRange.to || undefined}
              onChange={(event) =>
                onDeadlineRangeChange({
                  from: event.target.value,
                  to: deadlineRange.to,
                })
              }
              className="bg-card shadow-sm"
            />
          </div>
          <div>
            <label
              htmlFor={deadlineToId}
              className="text-muted-foreground mb-1 block text-xs"
            >
              {t('opportunities.deadline_to')}
            </label>
            <Input
              id={deadlineToId}
              type="date"
              value={deadlineRange.to}
              min={deadlineRange.from || undefined}
              onChange={(event) =>
                onDeadlineRangeChange({
                  from: deadlineRange.from,
                  to: event.target.value,
                })
              }
              className="bg-card shadow-sm"
            />
          </div>
        </div>
        {(deadlineRange.from || deadlineRange.to) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() =>
              onDeadlineRangeChange({ from: '', to: '' })
            }
          >
            {t('opportunities.clear_dates')}
          </Button>
        )}
      </div>
    </div>
  )
}

function Opportunities({
  initialOpenNow,
  initialOpenNowTotal,
}) {
  const router = useRouter()
  const { t } = useTranslation('common')
  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const searchParam = firstQueryValue(router.query?.search)
  const fieldParam =
    firstQueryValue(router.query?.field) === 'All'
      ? ''
      : firstQueryValue(router.query?.field)
  const rawGradeParam = firstQueryValue(router.query?.grade)
  const gradeParam = GRADE_OPTIONS.includes(rawGradeParam)
    ? rawGradeParam
    : ''
  const locationParam = firstQueryValue(
    router.query?.location
  ).slice(0, 100)
  const rawProgramTypeParam = firstQueryValue(
    router.query?.type
  )
  const programTypeParam =
    OPPORTUNITY_PROGRAM_TYPES.includes(rawProgramTypeParam)
      ? rawProgramTypeParam
      : ''
  const deadlineFromParam = validDateQuery(
    router.query?.deadlineFrom
  )
  const deadlineToParam = validDateQuery(
    router.query?.deadlineTo
  )
  const rawStatusParam = firstQueryValue(
    router.query?.status
  )
  const statusParam = OPPORTUNITY_STATUS_OPTIONS.includes(
    rawStatusParam
  )
    ? rawStatusParam
    : DEFAULT_STATUS

  useEffect(() => {
    if (!router.isReady) return
    setSearch(searchParam)
  }, [router.isReady, searchParam])

  const hasActiveFilters = Boolean(
    searchParam ||
      fieldParam ||
      gradeParam ||
      locationParam ||
      programTypeParam ||
      deadlineFromParam ||
      deadlineToParam ||
      statusParam !== DEFAULT_STATUS
  )

  const initialData = useMemo(() => {
    if (
      searchParam ||
      fieldParam ||
      gradeParam ||
      locationParam ||
      programTypeParam ||
      deadlineFromParam ||
      deadlineToParam ||
      statusParam !== DEFAULT_STATUS ||
      initialOpenNow.length === 0
    ) {
      return undefined
    }
    return {
      pages: [
        {
          opportunities: initialOpenNow,
          nextCursor:
            initialOpenNowTotal > initialOpenNow.length
              ? 1
              : null,
          facets: EMPTY_FACETS,
          totalHits: initialOpenNowTotal,
        },
      ],
      pageParams: [0],
    }
  }, [
    deadlineFromParam,
    deadlineToParam,
    fieldParam,
    gradeParam,
    initialOpenNow,
    initialOpenNowTotal,
    locationParam,
    programTypeParam,
    searchParam,
    statusParam,
  ])

  const opportunitiesQuery = useInfiniteQuery({
    queryKey: [
      'opportunitiesSearch',
      searchParam,
      fieldParam,
      gradeParam,
      locationParam,
      programTypeParam,
      deadlineFromParam,
      deadlineToParam,
      statusParam,
    ],
    enabled: router.isReady,
    initialPageParam: 0,
    initialData,
    initialDataUpdatedAt: 0,
    queryFn: ({ pageParam }) =>
      fetchOpportunitiesSearchPage({
        search: searchParam,
        field: fieldParam,
        grade: gradeParam,
        location: locationParam,
        programType: programTypeParam,
        deadlineFrom: deadlineFromParam,
        deadlineTo: deadlineToParam,
        status: statusParam,
        pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    placeholderData: keepPreviousData,
  })

  const opportunities = useMemo(
    () =>
      opportunitiesQuery.data?.pages.flatMap(
        (page) => page.opportunities
      ) || [],
    [opportunitiesQuery.data]
  )
  const firstPage = opportunitiesQuery.data?.pages[0]
  const facets = firstPage?.facets || EMPTY_FACETS
  const totalHits = firstPage?.totalHits
  const loading =
    opportunitiesQuery.isLoading &&
    opportunities.length === 0
  const { hasNextPage, isFetchingNextPage, fetchNextPage } =
    opportunitiesQuery

  function pushFilters(overrides = {}) {
    const next = {
      search: searchParam,
      field: fieldParam,
      grade: gradeParam,
      location: locationParam,
      type: programTypeParam,
      deadlineFrom: deadlineFromParam,
      deadlineTo: deadlineToParam,
      status: statusParam,
      ...overrides,
    }
    const query = {}
    if (next.search) query.search = next.search
    if (next.field) query.field = next.field
    if (next.grade) query.grade = next.grade
    if (next.location) query.location = next.location
    if (next.type) query.type = next.type
    if (next.deadlineFrom)
      query.deadlineFrom = next.deadlineFrom
    if (next.deadlineTo) query.deadlineTo = next.deadlineTo
    if (next.status && next.status !== DEFAULT_STATUS) {
      query.status = next.status
    }
    router.push({ pathname: '/opportunities', query })
  }

  function handleSearchSubmit(event) {
    event.preventDefault()
    pushFilters({ search })
  }

  function handleClearSearch() {
    setSearch('')
    pushFilters({ search: '' })
  }

  function closeMobileFilters() {
    setFiltersOpen(false)
  }

  function handleFieldSelect(nextField) {
    pushFilters({
      field: nextField === 'All' ? '' : nextField,
    })
    closeMobileFilters()
  }

  function handleGradeChange(grade) {
    pushFilters({ grade })
    closeMobileFilters()
  }

  function handleLocationChange(location) {
    pushFilters({ location })
    closeMobileFilters()
  }

  function handleProgramTypeChange(type) {
    pushFilters({ type })
    closeMobileFilters()
  }

  function handleDeadlineRangeChange(range) {
    pushFilters({
      deadlineFrom: range.from || '',
      deadlineTo: range.to || '',
    })
  }

  function handleStatusChange(status) {
    pushFilters({ status })
  }

  function handleClearFilters() {
    setSearch('')
    setFiltersOpen(false)
    router.push({ pathname: '/opportunities' })
  }

  const translatedFields = getTranslatedFieldsDict(t)
  const gradeLabels = {
    any: t('opportunities.any_grade'),
    9: t('opportunities.grade_9'),
    10: t('opportunities.grade_10'),
    11: t('opportunities.grade_11'),
    12: t('opportunities.grade_12'),
  }
  const statusLabels = {
    open: t('opportunities.open_now'),
    opening_soon: t('opportunities.opening_soon'),
    closed_recently: t('opportunities.closed_recently'),
    deadline_unknown: t('opportunities.deadline_unknown'),
  }
  const metaForStatus = {
    open: upcomingDeadlineMeta,
    opening_soon: applicationOpensMeta,
    closed_recently: pastDeadlineMeta,
    deadline_unknown: deadlineUnknownMeta,
  }[statusParam]
  const muted = statusParam === 'closed_recently'

  const activeFilters = []
  if (searchParam) {
    activeFilters.push({
      key: 'search',
      label: t('opportunities.search'),
      value: searchParam,
      removeLabel: t('opportunities.remove_filter', {
        filter: `${t(
          'opportunities.search'
        )} ${searchParam}`,
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
      label: t('opportunities.topics'),
      value: label,
      removeLabel: t('opportunities.remove_filter', {
        filter: `${t('opportunities.topics')} ${label}`,
      }),
      onRemove: () => handleFieldSelect('All'),
    })
  }
  if (gradeParam) {
    activeFilters.push({
      key: 'grade',
      label: t('opportunities.grade_level'),
      value: gradeLabels[gradeParam],
      removeLabel: t('opportunities.remove_filter', {
        filter: `${t('opportunities.grade_level')} ${
          gradeLabels[gradeParam]
        }`,
      }),
      onRemove: () => handleGradeChange(''),
    })
  }
  if (locationParam) {
    const label = locationLabel(t, locationParam)
    activeFilters.push({
      key: 'location',
      label: t('opportunities.location'),
      value: label,
      removeLabel: t('opportunities.remove_filter', {
        filter: `${t('opportunities.location')} ${label}`,
      }),
      onRemove: () => handleLocationChange(''),
    })
  }
  if (programTypeParam) {
    const label = programTypeLabel(t, programTypeParam)
    activeFilters.push({
      key: 'type',
      label: t('opportunities.program_type'),
      value: label,
      removeLabel: t('opportunities.remove_filter', {
        filter: `${t(
          'opportunities.program_type'
        )} ${label}`,
      }),
      onRemove: () => handleProgramTypeChange(''),
    })
  }
  if (deadlineFromParam || deadlineToParam) {
    const from = formatMediumDate(
      deadlineFromParam,
      router.locale
    )
    const to = formatMediumDate(
      deadlineToParam,
      router.locale
    )
    const value =
      from && to
        ? `${from} – ${to}`
        : from
        ? `${t('opportunities.deadline_from')} ${from}`
        : `${t('opportunities.deadline_to')} ${to}`
    activeFilters.push({
      key: 'deadline',
      label: t('opportunities.application_deadline'),
      value,
      removeLabel: t('opportunities.remove_filter', {
        filter: `${t(
          'opportunities.application_deadline'
        )} ${value}`,
      }),
      onRemove: () =>
        handleDeadlineRangeChange({ from: '', to: '' }),
    })
  }
  if (statusParam !== DEFAULT_STATUS) {
    const label = statusLabels[statusParam]
    activeFilters.push({
      key: 'status',
      label: t('opportunities.status_filter'),
      value: label,
      removeLabel: t('opportunities.remove_filter', {
        filter: `${t(
          'opportunities.status_filter'
        )} ${label}`,
      }),
      onRemove: () => handleStatusChange(DEFAULT_STATUS),
    })
  }

  const filterPanelProps = {
    t,
    field: fieldParam,
    onFieldSelect: handleFieldSelect,
    grade: gradeParam,
    onGradeChange: handleGradeChange,
    location: locationParam,
    onLocationChange: handleLocationChange,
    programType: programTypeParam,
    onProgramTypeChange: handleProgramTypeChange,
    deadlineRange: {
      from: deadlineFromParam,
      to: deadlineToParam,
    },
    onDeadlineRangeChange: handleDeadlineRangeChange,
    facets,
    hasActiveFilters,
    onClear: handleClearFilters,
    gradeLabels,
  }

  return (
    <>
      <SocialMeta
        title="Opportunities | SciTeens"
        description="STEM programs, competitions, and research opportunities for high school students."
        eyebrow="Opportunities"
        path="/opportunities"
      />
      <ListingLayout
        title={t('opportunities.opportunities')}
        lede={t('opportunities.lede')}
        actions={
          <Button
            variant="outline"
            className="shrink-0"
            render={
              <a
                href={`mailto:${OPPORTUNITIES_EMAIL}`}
                aria-label={t(
                  'opportunities.suggest_opportunity'
                )}
              />
            }
          >
            {t('opportunities.suggest_opportunity')}
          </Button>
        }
        aside={<FilterPanel {...filterPanelProps} />}
      >
        <SearchToolbar
          value={search}
          onChange={(event) =>
            setSearch(event.target.value)
          }
          onSubmit={handleSearchSubmit}
          onClear={handleClearSearch}
          placeholder={t(
            'opportunities.search_opportunities'
          )}
          searchLabel={t('opportunities.search')}
          submitLabel={t('opportunities.search')}
          clearSearchLabel={t('opportunities.clear_search')}
          filtersLabel={t('opportunities.filters')}
          hasActiveFilters={hasActiveFilters}
          filtersOpen={filtersOpen}
          onFiltersOpenChange={setFiltersOpen}
          filterPanel={
            <FilterPanel {...filterPanelProps} />
          }
        >
          <Select
            value={statusParam}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger
              aria-label={t('opportunities.status_filter')}
              className="bg-card w-full shadow-sm sm:w-44"
            >
              <SelectValue>
                {(value) => statusLabels[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {OPPORTUNITY_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {statusLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </SearchToolbar>

        <ActiveFilters
          label={t('opportunities.active_filters')}
          filters={activeFilters}
          clearLabel={t('opportunities.clear_filters')}
          onClear={handleClearFilters}
        />

        <ResultsCount>
          {loading
            ? t('opportunities.loading')
            : !opportunitiesQuery.isError &&
              typeof totalHits === 'number' &&
              t('opportunities.results_count', {
                count: totalHits,
              })}
        </ResultsCount>

        {opportunitiesQuery.isError && (
          <div
            role="alert"
            className="border-destructive/30 bg-destructive/5 rounded-xl border px-4 py-4 text-sm"
          >
            <p className="text-destructive">
              {t('opportunities.search_unavailable')}
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => opportunitiesQuery.refetch()}
            >
              {t('opportunities.retry')}
            </Button>
          </div>
        )}

        {loading ? (
          <ListingSkeleton />
        ) : opportunities.length === 0 ? (
          !opportunitiesQuery.isError && (
            <EmptyState
              title={t('opportunities.empty_title')}
              description={
                hasActiveFilters
                  ? t('opportunities.empty_filtered')
                  : t('opportunities.empty_default')
              }
              actionLabel={
                hasActiveFilters
                  ? t('opportunities.clear_filters')
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
          <div
            className={cn(
              'w-full transition-opacity',
              opportunitiesQuery.isPlaceholderData &&
                'opacity-60'
            )}
          >
            {opportunities.map((program, index) => (
              <div
                key={program.slug}
                className="w-full pt-6 md:pt-8"
              >
                <OpportunityCard
                  program={program}
                  meta={metaForStatus(
                    program,
                    router.locale,
                    t
                  )}
                  translatedFields={translatedFields}
                  muted={muted}
                  priority={index < 2}
                />
              </div>
            ))}
          </div>
        )}

        {isFetchingNextPage && (
          <ListingSkeleton count={2} />
        )}

        <InfiniteScrollTrigger
          hasNextPage={
            hasNextPage && !opportunitiesQuery.isError
          }
          isLoading={isFetchingNextPage}
          onLoadMore={fetchNextPage}
          label={t('opportunities.load_more')}
        />
      </ListingLayout>
    </>
  )
}

export async function getStaticProps({ locale }) {
  const translationsPromise = serverSideTranslations(
    locale,
    ['common']
  )
  const app =
    getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApp()
  const buildFirestore = getFirestore(app)
  const [translations, openNow] = await Promise.all([
    translationsPromise,
    fetchOpenNowOpportunities(buildFirestore),
  ])

  return {
    props: {
      initialOpenNow: openNow.slice(
        0,
        OPPORTUNITIES_SEARCH_HITS_PER_PAGE
      ),
      initialOpenNowTotal: openNow.length,
      ...translations,
    },
  }
}

export default Opportunities
