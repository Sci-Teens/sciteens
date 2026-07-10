import Link from 'next/link'
import {
  useTrail,
  animated,
  config,
} from '@react-spring/web'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import SocialMeta from '@/components/SocialMeta'
import PageHeading from '@/components/PageHeading'

export default function GetInvolved() {
  const { t } = useTranslation('common')
  // REACT SPRING ANIMATIONS
  const cardsTrail = useTrail(3, {
    transform: 'scale(1)',
    from: {
      transform: 'scale(0)',
    },
    config: config.stiff,
    delay: 100,
  })

  return (
    <div>
      <SocialMeta
        title="Get Involved | SciTeens"
        description="Volunteer, mentor, or partner with SciTeens to bring free STEM opportunities to more students."
        eyebrow="Get Involved"
        path="/getinvolved"
      />
      <div>
        <div className="mx-auto w-full px-4 py-8 text-left md:p-8 lg:w-5/6">
          <PageHeading className="my-4 mb-10 text-center">
            {t('get_involved.want_to_get_involved')}
          </PageHeading>
          <div className="flex flex-col">
            <animated.div
              style={cardsTrail[0]}
              className="border-border/60 bg-card relative mb-10 mr-0 overflow-hidden rounded-xl border p-12 shadow-md md:mb-8 md:mr-8"
            >
              <h2 className="mb-3 text-2xl font-semibold md:text-3xl">
                {t('get_involved.students')}
              </h2>
              <p className="mb-4 text-sm lg:text-base">
                {t('get_involved.get_involved_student')}
                <a
                  href="mailto:opportunities@sciteens.com"
                  target="_blank"
                  className="text-sciteensGreen-regular hover:text-sciteensGreen-dark font-semibold"
                  rel="noreferrer"
                >
                  &nbsp;opportunities@sciteens.com.&nbsp;
                </a>
              </p>
              <Link
                href="/signup/student"
                className="bg-sciteensLightGreen-regular hover:bg-sciteensLightGreen-dark mb-4 rounded-lg p-2 text-center text-white shadow-md"
              >
                {t('get_involved.student_sign_up')}
              </Link>
              <svg
                className="absolute -left-8 -top-8 h-2/3 -rotate-12 transform opacity-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M3.33 8L10 12l10-6-10-6L0 6h10v2H3.33zM0 8v8l2-2.22V9.2L0 8zm10 12l-5-3-2-1.2v-6l7 4.2 7-4.2v6L10 20z" />
              </svg>
            </animated.div>

            <animated.div
              style={cardsTrail[1]}
              className="border-border/60 bg-card relative mb-10 mr-0 overflow-hidden rounded-xl border p-12 shadow-md md:mr-8 md:mt-8"
            >
              <h2 className="mb-3 mr-6 text-2xl font-semibold md:text-3xl">
                {t('get_involved.outreach')}
              </h2>
              <p className="mb-4 text-sm lg:text-base">
                {t('get_involved.get_involved_outreach')}
                <a
                  href="mailto:support@sciteens.com"
                  target="_blank"
                  className="text-sciteensGreen-regular hover:text-sciteensGreen-dark font-semibold"
                  rel="noreferrer"
                >
                  &nbsp;opportunities@sciteens.com.&nbsp;
                </a>
              </p>
              <a
                href="mailto:support@sciteens.com"
                target="_blank"
                className="bg-sciteensLightGreen-regular hover:bg-sciteensLightGreen-dark rounded-lg p-2 text-center text-white shadow-md"
                rel="noreferrer"
              >
                {t('get_involved.contact_us')}
              </a>
              <svg
                className="absolute -left-8 -top-8 h-2/3 -rotate-12 transform opacity-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm2-2.25a8 8 0 0 0 4-2.46V9a2 2 0 0 1-2-2V3.07a7.95 7.95 0 0 0-3-1V3a2 2 0 0 1-2 2v1a2 2 0 0 1-2 2v2h3a2 2 0 0 1 2 2v5.75zm-4 0V15a2 2 0 0 1-2-2v-1h-.5A1.5 1.5 0 0 1 4 10.5V8H2.25A8.01 8.01 0 0 0 8 17.75z" />
              </svg>
            </animated.div>

            <animated.div
              style={cardsTrail[2]}
              className="border-border/60 bg-card relative mb-10 ml-0 overflow-hidden rounded-xl border p-12 shadow-md md:ml-8 md:mt-8"
            >
              <h2 className="mb-3 text-2xl font-semibold md:text-3xl">
                {t('get_involved.funding')}
              </h2>
              <p className="mb-4 text-sm lg:text-base">
                {t('get_involved.get_involved_funding')}
                <a
                  href="mailto:support@sciteens.com"
                  target="_blank"
                  className="text-sciteensGreen-regular hover:text-sciteensGreen-dark font-semibold"
                  rel="noreferrer"
                >
                  &nbsp;opportunities@sciteens.com.&nbsp;
                </a>
                {t('get_involved.no_student_limited')}
              </p>
              <a
                href="https://www.paypal.com/donate?hosted_button_id=7B8QACYV83ACA"
                target="_blank"
                className="bg-sciteensLightGreen-regular hover:bg-sciteensLightGreen-dark mr-2 rounded-lg p-2 text-white shadow-md"
                rel="noreferrer"
              >
                {t('get_involved.donate_now')}
              </a>
              <svg
                className="absolute -left-8 -top-8 h-2/3 -rotate-12 transform opacity-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm1-5h1a3 3 0 0 0 0-6H7.99a1 1 0 0 1 0-2H14V5h-3V3H9v2H8a3 3 0 1 0 0 6h4a1 1 0 1 1 0 2H6v2h3v2h2v-2z" />
              </svg>
            </animated.div>
          </div>
        </div>
      </div>
    </div>
  )
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
