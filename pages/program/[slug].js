import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { ArrowLeft, ExternalLink } from 'lucide-react'
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
  DetailLabel,
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
import { normalizeOpportunity } from '../../lib/opportunities'
import firebaseConfig from '../../firebaseConfig'
import { INLINE_LINK } from '../../lib/typography'

function Program({ program }) {
  const router = useRouter()
  const { t } = useTranslation('common')
  const translatedFields = getTranslatedFieldsDict(t)

  const deadline = program.applicationDeadline
    ? formatMediumDate(
        program.applicationDeadline,
        router.locale
      )
    : program.deadlineStatus === 'upcoming' &&
      program.applicationOpensDate
    ? t('opportunities.opens_on', {
        date: formatMediumDate(
          program.applicationOpensDate,
          router.locale
        ),
      })
    : t('opportunities.rolling')
  const dates =
    program.startDate && program.endDate
      ? `${formatMediumDate(
          program.startDate,
          router.locale
        )} – ${formatMediumDate(
          program.endDate,
          router.locale
        )}`
      : ''

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

        <DetailSection>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <DetailLabel>
                {t('opportunities.deadline')}
              </DetailLabel>
              <dd className="text-foreground mt-1">
                {deadline}
              </dd>
            </div>
            {dates && (
              <div>
                <DetailLabel>
                  {t('opportunities.dates')}
                </DetailLabel>
                <dd className="text-foreground mt-1">
                  {dates}
                </dd>
              </div>
            )}
            {program.gradeRangeLow &&
              program.gradeRangeHigh && (
                <div>
                  <DetailLabel>
                    {t('opportunities.grade_level')}
                  </DetailLabel>
                  <dd className="text-foreground mt-1">
                    {formatGradeRange(
                      program.gradeRangeLow,
                      program.gradeRangeHigh,
                      t
                    )}
                  </dd>
                </div>
              )}
            {program.location && (
              <div>
                <DetailLabel>
                  {t('opportunities.location')}
                </DetailLabel>
                <dd className="text-foreground mt-1">
                  {program.location}
                </dd>
              </div>
            )}
          </dl>
          {program.eligibilityNotes && (
            <div className="mt-4">
              <DetailLabel>
                {t('opportunities.eligibility')}
              </DetailLabel>
              <p className="text-foreground mt-1 text-sm">
                {program.eligibilityNotes}
              </p>
            </div>
          )}
        </DetailSection>

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
