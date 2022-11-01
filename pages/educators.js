import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import {
  useSpring,
  animated,
  config,
} from '@react-spring/web'
import Head from 'next/head'

export default function Educators() {
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
    <>
      <Head>
        <title>Educators | SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Help your students succeed via SciTeens"
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, donate, teen science"
        />
        <meta property="og:type" content="website" />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
      </Head>
      <div className="mx-5 mt-16 mb-24 flex flex-col text-center md:mx-16 lg:mx-24 lg:grid lg:grid-cols-2 lg:grid-rows-2 xl:grid-cols-3 xl:grid-rows-1">
        <animated.div
          style={get_involved_spring}
          className="mr-0 mb-8 space-y-2 rounded-lg bg-white p-8 text-sm shadow lg:mr-8 lg:mb-0 xl:mb-32"
        >
          <h1 className="mb-3 text-2xl font-semibold capitalize">
            {t('educators.resources')}
          </h1>
          <p>{t('educators.science_resources')}</p>
          <p>{t('educators.articles_page')}</p>
        </animated.div>

        <animated.div
          style={get_involved_spring}
          className="space-y-2 rounded-lg bg-white p-8 text-sm shadow"
        >
          <h1 className="mb-3 text-2xl font-semibold capitalize">
            {t('educators.courses')}
          </h1>
          <p>{t('educators.accessible_courses')}</p>
          <p>{t('educators.promote_to_students')}</p>
          <p>{t('educators.use_colab')}</p>
          <p>
            {t('educators.contact_us')}
            <a
              target="_blank"
              href="mailto:carlos@sciteens.org"
              className="font-semibold text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark"
            >
              Carlos Mercado-Lara
            </a>
            &nbsp;
            {t('educators.or')}
            &nbsp;
            <a
              target="_blank"
              href="mailto:aarti@sciteens.org"
              className="font-semibold text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark"
            >
              Aarti Kalamangalam
            </a>
            .
          </p>
        </animated.div>

        <animated.div
          style={get_involved_spring}
          className="mr-0 mt-8 space-y-2 rounded-lg bg-white p-8 text-sm shadow lg:mr-8 xl:mb-32 xl:mr-0 xl:ml-8 xl:mt-0"
        >
          <h1 className="mb-3 text-2xl font-semibold capitalize">
            {t('educators.projects')}
          </h1>
          <p>{t('educators.post_projects')}</p>
          <p>{t('educators.thanks')}</p>
        </animated.div>
      </div>
    </>
  )
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      // Will be passed to the page component as props
    },
  }
}
