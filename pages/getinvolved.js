import Link from 'next/link'
import {
  useSpring,
  animated,
  config,
} from '@react-spring/web'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import Head from 'next/head'

export default function GetInvolved() {
  const { t } = useTranslation('common')
  // REACT SPRING ANIMATIONS
  const get_involved_spring = useSpring({
    transform: 'scale(1)',
    from: {
      transform: 'scale(0)',
    },
    config: config.stiff,
    delay: 100,
  })

  return (
    <div>
      <Head>
        <title>Get Involved | SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Get involved with SciTeens"
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, get involved, teen science"
        />
        <meta property="og:type" content="website" />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
      </Head>
      <div>
        <div className="mx-auto w-full px-4 py-8 text-left md:p-8 lg:w-5/6">
          <h1 className="my-4 mb-10 text-center text-3xl font-semibold md:text-5xl">
            {t('get_involved.want_to_get_involved')}
          </h1>
          <div className="flex flex-col">
            <animated.div
              style={get_involved_spring}
              className="relative mr-0 mb-10 overflow-hidden rounded-lg bg-white p-12 shadow-md md:mr-8 md:mb-8"
            >
              <h2 className="mb-3 text-2xl font-semibold md:text-3xl">
                {t('get_involved.students')}
              </h2>
              <p className="mb-4 text-sm lg:text-base">
                {t('get_involved.get_involved_student')}
                <a
                  href="mailto:opportunities@sciteens.org"
                  target="_blank"
                  className="text-blue-700"
                >
                  &nbsp;opportunities@sciteens.org.&nbsp;
                </a>
              </p>
              <Link href="/signup/student">
                <a className="mb-4 rounded-lg bg-sciteensLightGreen-regular p-2 text-center text-white shadow-md hover:bg-sciteensLightGreen-dark">
                  {t('get_involved.student_sign_up')}
                </a>
              </Link>
              <svg
                className="absolute -top-8 -left-8 h-2/3 -rotate-12 transform opacity-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M3.33 8L10 12l10-6-10-6L0 6h10v2H3.33zM0 8v8l2-2.22V9.2L0 8zm10 12l-5-3-2-1.2v-6l7 4.2 7-4.2v6L10 20z" />
              </svg>
            </animated.div>

            <animated.div
              style={get_involved_spring}
              className="relative mr-0 mb-10 overflow-hidden rounded-lg bg-white p-12 shadow-md md:mr-8 md:mt-8"
            >
              <h2 className="mb-3 mr-6 text-2xl font-semibold md:text-3xl">
                {t('get_involved.outreach')}
              </h2>
              <p className="mb-4 text-sm lg:text-base">
                {t('get_involved.get_involved_outreach')}
                <a
                  href="mailto:support@sciteens.org"
                  target="_blank"
                  className="text-blue-700"
                >
                  &nbsp;opportunities@sciteens.org.&nbsp;
                </a>
              </p>
              <a
                href="mailto:support@sciteens.org"
                target="_blank"
                className="rounded-lg bg-sciteensLightGreen-regular p-2 text-center text-white shadow-md hover:bg-sciteensLightGreen-dark"
              >
                {t('get_involved.contact_us')}
              </a>
              <svg
                className="absolute -top-8 -left-8 h-2/3 -rotate-12 transform opacity-5"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path d="M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm2-2.25a8 8 0 0 0 4-2.46V9a2 2 0 0 1-2-2V3.07a7.95 7.95 0 0 0-3-1V3a2 2 0 0 1-2 2v1a2 2 0 0 1-2 2v2h3a2 2 0 0 1 2 2v5.75zm-4 0V15a2 2 0 0 1-2-2v-1h-.5A1.5 1.5 0 0 1 4 10.5V8H2.25A8.01 8.01 0 0 0 8 17.75z" />
              </svg>
            </animated.div>

            <animated.div
              style={get_involved_spring}
              className="relative ml-0 mb-10 overflow-hidden rounded-lg bg-white p-12 shadow-md md:ml-8 md:mt-8"
            >
              <h2 className="mb-3 text-2xl font-semibold md:text-3xl">
                {t('get_involved.funding')}
              </h2>
              <p className="mb-4 text-sm lg:text-base">
                {t('get_involved.get_involved_funding')}
                <a
                  href="mailto:support@sciteens.org"
                  target="_blank"
                  className="text-blue-700"
                >
                  &nbsp;opportunities@sciteens.org.&nbsp;
                </a>
                {t('get_involved.no_student_limited')}
              </p>
              <a
                href="https://www.paypal.com/donate?hosted_button_id=7B8QACYV83ACA"
                target="_blank"
                className="mr-2 rounded-lg bg-blue-500 p-2 text-white shadow-md hover:bg-blue-600"
              >
                {t('get_involved.donate_now')}
              </a>
              <svg
                className="absolute -top-8 -left-8 h-2/3 -rotate-12 transform opacity-5"
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
