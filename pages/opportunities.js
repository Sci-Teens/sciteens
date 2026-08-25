import { useEffect, useMemo, useState } from 'react'

import { useRouter } from 'next/router'
import SocialMeta from '@/components/SocialMeta'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useQuery } from '@tanstack/react-query'
import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

import {
  formatGradeRange,
  getFieldLabel,
  getTranslatedFieldsDict,
} from '../context/helpers'
import { formatMediumDate } from '../lib/formatDate'
import { db as firestore } from '../lib/firestore'
import firebaseConfig from '../firebaseConfig'
import {
  deadlineDisplay,
  fetchClosedRecentlyOpportunities,
  fetchDeadlineUnknownOpportunities,
  fetchOpenNowOpportunities,
  fetchOpeningSoonOpportunities,
} from '../lib/opportunities'
import { getFieldIcon } from '../lib/fieldIcons'
import { cn } from '@/lib/utils'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import OpportunityFieldIcons from '@/components/OpportunityFieldIcons'
import ActiveFilters from '@/components/search/ActiveFilters'
import EmptyState from '@/components/search/EmptyState'
import ListingCard from '@/components/search/ListingCard'
import ListingLayout from '@/components/search/ListingLayout'
import ResultsCount from '@/components/search/ResultsCount'
import SearchToolbar from '@/components/search/SearchToolbar'
import TopicsList from '@/components/search/TopicsList'

const GRADE_OPTIONS = ['9', '10', '11', '12']
const STATUS_OPTIONS = [
  'open',
  'opening_soon',
  'closed_recently',
  'deadline_unknown',
]
const DEFAULT_STATUS = 'open'

function matchesSearch(program, search) {
  if (!search) return true
  const term = search.toLowerCase()
  return (
    program.name.toLowerCase().includes(term) ||
    program.about.toLowerCase().includes(term)
  )
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
}) {
  return (
    <ListingCard
      href={`/program/${program.slug}`}
      title={program.name}
      description={program.about}
      imageSrc={program.imageUrl}
      imageAlt=""
      imageFit={program.imageFit}
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
        'opportunity-card shadow-lg',
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
  hasActiveFilters,
  onClear,
  gradeLabels,
}) {
  return (
    <div className="flex flex-col gap-6">
      <TopicsList
        topicsLabel={t('opportunities.topics')}
        fields={getTranslatedFieldsDict(t)}
        field={field}
        onFieldSelect={onFieldSelect}
        hasActiveFilters={hasActiveFilters}
        clearLabel={t('opportunities.clear_filters')}
        onClear={onClear}
      />

      <Separator />

      <div>
        <h2 className="text-foreground mb-3 text-sm font-semibold">
          {t('opportunities.grade_level')}
        </h2>
        <Select
          value={grade || 'any'}
          onValueChange={(value) =>
            onGradeChange(value === 'any' ? '' : value)
          }
        >
          <SelectTrigger
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
            {GRADE_OPTIONS.map((grade_option) => (
              <SelectItem
                key={grade_option}
                value={grade_option}
              >
                {gradeLabels[grade_option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  )
}

const LIVE_REFETCH_STALE_TIME_MS = 60 * 1000

function useLiveOpportunities(
  section,
  fetchSection,
  buildTimeSnapshot
) {
  return useQuery({
    queryKey: ['opportunities', section],
    queryFn: () => fetchSection(firestore),
    initialData: buildTimeSnapshot,
    staleTime: LIVE_REFETCH_STALE_TIME_MS,
  })
}

function filterPrograms(
  programs,
  { searchParam, fieldParam, gradeParam }
) {
  const gradeNum = gradeParam ? Number(gradeParam) : null
  return programs.filter((program) => {
    if (!matchesSearch(program, searchParam)) return false
    if (fieldParam && !program.fields.includes(fieldParam))
      return false
    if (
      gradeNum &&
      !(
        program.gradeRangeLow <= gradeNum &&
        gradeNum <= program.gradeRangeHigh
      )
    )
      return false
    return true
  })
}

function useFilteredPrograms(
  programs,
  { searchParam, fieldParam, gradeParam }
) {
  return useMemo(
    () =>
      filterPrograms(programs || [], {
        searchParam,
        fieldParam,
        gradeParam,
      }),
    [programs, searchParam, fieldParam, gradeParam]
  )
}

function Opportunities({
  initialOpenNow,
  initialOpeningSoon,
  initialClosedRecently,
  initialDeadlineUnknown,
}) {
  const router = useRouter()
  const { t } = useTranslation('common')

  const openNowQuery = useLiveOpportunities(
    'openNow',
    fetchOpenNowOpportunities,
    initialOpenNow
  )
  const openingSoonQuery = useLiveOpportunities(
    'openingSoon',
    fetchOpeningSoonOpportunities,
    initialOpeningSoon
  )
  const closedRecentlyQuery = useLiveOpportunities(
    'closedRecently',
    fetchClosedRecentlyOpportunities,
    initialClosedRecently
  )
  const deadlineUnknownQuery = useLiveOpportunities(
    'deadlineUnknown',
    fetchDeadlineUnknownOpportunities,
    initialDeadlineUnknown
  )

  const [search, setSearch] = useState('')
  const [filtersOpen, setFiltersOpen] = useState(false)

  const searchParam = router.query?.search || ''
  const fieldParam =
    router.query?.field && router.query.field !== 'All'
      ? router.query.field
      : ''
  const gradeParam = router.query?.grade || ''
  const statusParam = STATUS_OPTIONS.includes(
    router.query?.status
  )
    ? router.query.status
    : DEFAULT_STATUS

  const routerIsReady = router.isReady
  useEffect(() => {
    if (!routerIsReady) return
    setSearch(searchParam)
  }, [routerIsReady, searchParam])

  const hasActiveFilters = Boolean(
    searchParam || fieldParam || gradeParam
  )

  const gradeLabels = {
    any: t('opportunities.any_grade'),
    9: t('opportunities.grade_9'),
    10: t('opportunities.grade_10'),
    11: t('opportunities.grade_11'),
    12: t('opportunities.grade_12'),
  }

  const filterParams = {
    searchParam,
    fieldParam,
    gradeParam,
  }
  const filteredOpenNow = useFilteredPrograms(
    openNowQuery.data,
    filterParams
  )
  const filteredOpeningSoon = useFilteredPrograms(
    openingSoonQuery.data,
    filterParams
  )
  const filteredClosedRecently = useFilteredPrograms(
    closedRecentlyQuery.data,
    filterParams
  )
  const filteredDeadlineUnknown = useFilteredPrograms(
    deadlineUnknownQuery.data,
    filterParams
  )

  function pushFilters(overrides = {}) {
    const next = {
      search: searchParam,
      field: fieldParam,
      grade: gradeParam,
      status: statusParam,
      ...overrides,
    }
    const query = {}
    if (next.search) query.search = next.search
    if (next.field) query.field = next.field
    if (next.grade) query.grade = next.grade
    if (next.status && next.status !== DEFAULT_STATUS)
      query.status = next.status
    router.push({ pathname: '/opportunities', query })
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
    pushFilters({ field: value })
    setFiltersOpen(false)
  }

  function handleGradeChange(nextGrade) {
    pushFilters({ grade: nextGrade })
    setFiltersOpen(false)
  }

  function handleStatusChange(nextStatus) {
    pushFilters({ status: nextStatus })
  }

  function handleClearFilters() {
    setSearch('')
    setFiltersOpen(false)
    router.push({ pathname: '/opportunities' })
  }

  const translatedFields = getTranslatedFieldsDict(t)

  const statusLabels = {
    open: t('opportunities.open_now'),
    opening_soon: t('opportunities.opening_soon'),
    closed_recently: t('opportunities.closed_recently'),
    deadline_unknown: t('opportunities.deadline_unknown'),
  }

  const activeView = {
    open: {
      list: filteredOpenNow,
      meta: upcomingDeadlineMeta,
      muted: false,
    },
    opening_soon: {
      list: filteredOpeningSoon,
      meta: applicationOpensMeta,
      muted: false,
    },
    closed_recently: {
      list: filteredClosedRecently,
      meta: pastDeadlineMeta,
      muted: true,
    },
    deadline_unknown: {
      list: filteredDeadlineUnknown,
      meta: deadlineUnknownMeta,
      muted: false,
    },
  }[statusParam]

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

  const filterPanelProps = {
    t,
    field: fieldParam,
    onFieldSelect: handleFieldSelect,
    grade: gradeParam,
    onGradeChange: handleGradeChange,
    hasActiveFilters,
    onClear: handleClearFilters,
    gradeLabels,
  }

  return (
    <>
      <SocialMeta
        title="Opportunities | SciTeens"
        description="STEM programs, competitions, and research opportunities high schoolers can apply to."
        eyebrow="Opportunities"
        path="/opportunities"
      />
      <ListingLayout
        title={t('opportunities.opportunities')}
        lede={t('opportunities.lede')}
        aside={<FilterPanel {...filterPanelProps} />}
        showRule
      >
        <SearchToolbar
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
        />

        <ActiveFilters
          label={t('opportunities.active_filters')}
          filters={activeFilters}
          clearLabel={t('opportunities.clear_filters')}
          onClear={handleClearFilters}
        />

        <div className="mb-6 flex items-center gap-3">
          <Select
            value={statusParam}
            onValueChange={handleStatusChange}
          >
            <SelectTrigger
              aria-label={t('opportunities.status_filter')}
              className="bg-card w-auto min-w-[10rem] shadow-sm"
            >
              <SelectValue>
                {(value) => statusLabels[value]}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {statusLabels[option]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {activeView.list.length === 0 ? (
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
        ) : (
          <>
            <ResultsCount>
              {t('opportunities.results_count', {
                count: activeView.list.length,
              })}
            </ResultsCount>
            <div className="w-full">
              {activeView.list.map((program) => (
                <div
                  key={program.slug}
                  className="w-full pt-6 md:pt-8"
                >
                  <OpportunityCard
                    program={program}
                    meta={activeView.meta(
                      program,
                      router.locale,
                      t
                    )}
                    translatedFields={translatedFields}
                    muted={activeView.muted}
                  />
                </div>
              ))}
            </div>
          </>
        )}
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

  const [
    translations,
    initialOpenNow,
    initialOpeningSoon,
    initialClosedRecently,
    initialDeadlineUnknown,
  ] = await Promise.all([
    translationsPromise,
    fetchOpenNowOpportunities(buildFirestore),
    fetchOpeningSoonOpportunities(buildFirestore),
    fetchClosedRecentlyOpportunities(buildFirestore),
    fetchDeadlineUnknownOpportunities(buildFirestore),
  ])

  return {
    props: {
      initialOpenNow,
      initialOpeningSoon,
      initialClosedRecently,
      initialDeadlineUnknown,
      ...translations,
    },
  }
}

export default Opportunities
