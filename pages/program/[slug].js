import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowLeft, ExternalLink, Flag } from 'lucide-react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import {
  doc,
  getDoc,
  getFirestore,
} from 'firebase/firestore'
import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app'

import SocialMeta from '@/components/SocialMeta'
import PageHeading from '@/components/PageHeading'
import OpportunityFieldIcons from '@/components/OpportunityFieldIcons'
import {
  DetailMain,
  DetailSection,
} from '@/components/DetailLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  formatGradeRange,
  getFieldLabel,
  getTranslatedFieldsDict,
} from '../../context/helpers'
import { formatMediumDate } from '../../lib/formatDate'
import {
  deadlineDisplay,
  normalizeOpportunity,
} from '../../lib/opportunities'
import firebaseConfig from '../../firebaseConfig'
import { INLINE_LINK } from '../../lib/typography'

const OPPORTUNITIES_EMAIL = 'opportunities@sciteens.org'

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

const ATTENDANCE_KEYS = {
  Residential:
    'opportunities.attendance_options.residential',
  Commuter: 'opportunities.attendance_options.commuter',
  'Not applicable':
    'opportunities.attendance_options.not_applicable',
  'Not specified':
    'opportunities.attendance_options.not_specified',
}

const PIPELINE_VALUE_KEYS = {
  Free: 'opportunities.free',
  'Program is Free': 'opportunities.program_is_free',
  'Not specified': 'opportunities.not_specified',
}

function translateOpportunityEnum(
  translation,
  keys,
  value
) {
  return value && keys[value]
    ? translation(keys[value])
    : null
}

function translateOpportunityValue(translation, value) {
  return value && PIPELINE_VALUE_KEYS[value]
    ? translation(PIPELINE_VALUE_KEYS[value])
    : value
}

function OpportunityDetails({ items }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-5 sm:grid-cols-2">
      {items.map(({ label, value }) => (
        <div key={label}>
          <dt className="text-muted-foreground text-sm font-semibold">
            {label}
          </dt>
          <dd className="text-foreground mt-1">{value}</dd>
        </div>
      ))}
    </dl>
  )
}

function Program({ program }) {
  const router = useRouter()
  const { t } = useTranslation('common')
  const translatedFields = getTranslatedFieldsDict(t)

  const deadlineParts = deadlineDisplay(program)
  const deadline =
    deadlineParts.kind === 'dated'
      ? formatMediumDate(deadlineParts.date, router.locale)
      : deadlineParts.kind === 'opens'
      ? t('opportunities.opens_on', {
          date: formatMediumDate(
            deadlineParts.date,
            router.locale
          ),
        })
      : deadlineParts.kind === 'rolling'
      ? t('opportunities.rolling')
      : t('opportunities.deadline_unknown')
  const startDate = program.startDate
    ? formatMediumDate(program.startDate, router.locale)
    : ''
  const endDate = program.endDate
    ? formatMediumDate(program.endDate, router.locale)
    : ''
  const dateLabel =
    startDate && endDate
      ? t('opportunities.dates')
      : startDate
      ? t('opportunities.starts')
      : endDate
      ? t('opportunities.ends')
      : null
  const dates =
    startDate && endDate
      ? `${startDate} – ${endDate}`
      : startDate || endDate

  const programDetails = [
    {
      label: t('opportunities.deadline'),
      value: deadline,
    },
    {
      label: dateLabel,
      value: dates,
    },
    {
      label: t('opportunities.grade_level'),
      value:
        typeof program.gradeRangeLow === 'number' &&
        typeof program.gradeRangeHigh === 'number'
          ? formatGradeRange(
              program.gradeRangeLow,
              program.gradeRangeHigh,
              t
            )
          : null,
    },
    {
      label: t('opportunities.age_range'),
      value:
        typeof program.ageRangeLow === 'number' &&
        typeof program.ageRangeHigh === 'number'
          ? t('opportunities.ages', {
              low: program.ageRangeLow,
              high: program.ageRangeHigh,
            })
          : null,
    },
    {
      label: t('opportunities.location'),
      value: translateOpportunityValue(t, program.location),
    },
    {
      label: t('opportunities.program_type'),
      value: translateOpportunityEnum(
        t,
        PROGRAM_TYPE_KEYS,
        program.programType
      ),
    },
    {
      label: t('opportunities.duration'),
      value: translateOpportunityValue(
        t,
        program.durationText
      ),
    },
    {
      label: t('opportunities.attendance'),
      value: translateOpportunityEnum(
        t,
        ATTENDANCE_KEYS,
        program.residential
      ),
    },
  ].filter(({ value }) => value)
  const supportDetails = [
    {
      label: t('opportunities.cost'),
      value: translateOpportunityValue(t, program.cost),
    },
    {
      label: t('opportunities.financial_aid'),
      value: translateOpportunityValue(
        t,
        program.financialAid
      ),
    },
    {
      label: t('opportunities.stipend'),
      value: translateOpportunityValue(t, program.stipend),
    },
    {
      label: t('opportunities.contact_program'),
      value: program.contactEmail ? (
        <a
          href={`mailto:${program.contactEmail}`}
          className={INLINE_LINK}
        >
          {program.contactEmail}
        </a>
      ) : null,
    },
  ].filter(({ value }) => value)
  const reportOpportunityHref = `mailto:${OPPORTUNITIES_EMAIL}?subject=${encodeURIComponent(
    t('opportunities.report_email_subject', {
      name: program.name,
    })
  )}`

  return (
    <>
      <SocialMeta
        title={`${program.name} | SciTeens`}
        description={program.about}
        eyebrow="Opportunity"
        path={`/program/${program.slug}`}
      />
      <DetailMain>
        <Link
          href="/opportunities"
          className={`${INLINE_LINK} inline-flex items-center gap-1.5 text-sm no-underline hover:underline`}
        >
          <ArrowLeft
            className="h-3.5 w-3.5"
            aria-hidden="true"
          />
          {t('opportunities.back_to_opportunities')}
        </Link>

        <div className="bg-muted relative mt-4 h-40 w-full overflow-hidden rounded-xl md:h-56">
          {program.imageUrl ? (
            <Image
              src={program.imageUrl}
              alt=""
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className={
                program.imageFit === 'cover'
                  ? 'object-cover'
                  : 'object-contain p-8 md:p-12'
              }
            />
          ) : (
            <OpportunityFieldIcons
              fields={program.fields}
              size="lg"
            />
          )}
        </div>

        <PageHeading className="mt-6 text-left">
          {program.name}
        </PageHeading>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {program.fields.map((field) => (
            <Badge key={field} variant="outline">
              {getFieldLabel(translatedFields, field)}
            </Badge>
          ))}
        </div>

        <p className="text-muted-foreground text-pretty mt-4 leading-relaxed">
          {program.about}
        </p>

        <DetailSection
          title={t('opportunities.program_details')}
        >
          <OpportunityDetails items={programDetails} />
        </DetailSection>

        {program.eligibilityNotes && (
          <DetailSection
            title={t('opportunities.eligibility')}
          >
            <p className="text-foreground text-pretty leading-relaxed">
              {program.eligibilityNotes}
            </p>
          </DetailSection>
        )}

        {supportDetails.length > 0 && (
          <DetailSection
            title={t('opportunities.costs_and_support')}
          >
            <OpportunityDetails items={supportDetails} />
          </DetailSection>
        )}
        <Button
          className="mt-8"
          render={
            <a
              href={program.applicationUrl}
              target="_blank"
              rel="noreferrer"
            >
              {t('opportunities.apply_official_site')}
              <ExternalLink
                className="h-4 w-4"
                aria-hidden="true"
              />
            </a>
          }
        />

        <DetailSection
          title={t('opportunities.report_outdated_title')}
        >
          <p className="text-muted-foreground text-pretty leading-relaxed">
            {t('opportunities.report_outdated_description')}
          </p>
          <Button
            variant="outline"
            className="mt-5"
            render={
              <a href={reportOpportunityHref}>
                {t('opportunities.report_outdated_action')}
                <Flag
                  className="h-4 w-4"
                  aria-hidden="true"
                />
              </a>
            }
          />
        </DetailSection>
      </DetailMain>
    </>
  )
}

export async function getStaticPaths() {
  return { paths: [], fallback: 'blocking' }
}

export async function getStaticProps({ params, locale }) {
  const app =
    getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApp()
  const buildFirestore = getFirestore(app)

  const snapshot = await getDoc(
    doc(buildFirestore, 'opportunities', params.slug)
  )
  if (!snapshot.exists()) {
    return { notFound: true }
  }
  const program = normalizeOpportunity({
    slug: snapshot.id,
    ...snapshot.data(),
  })

  const translations = await serverSideTranslations(
    locale,
    ['common']
  )
  return {
    props: { program, ...translations },
    revalidate: 3600,
  }
}

export default Program
