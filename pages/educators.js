import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import {
  useTrail,
  animated,
  config,
} from '@react-spring/web'
import SocialMeta from '@/components/SocialMeta'

export default function Educators() {
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
    <>
      <SocialMeta
        title="Educators | SciTeens"
        description="Help your students succeed with free STEM courses, mentorship, and project support from SciTeens."
        eyebrow="Educators"
        path="/educators"
      />
      <div className="mx-5 mb-24 mt-16 flex flex-col text-center md:mx-16 lg:mx-24 lg:grid lg:grid-cols-2 lg:grid-rows-2 xl:grid-cols-3 xl:grid-rows-1">
        <animated.div
          style={cardsTrail[0]}
          className="border-border/60 bg-card mb-8 mr-0 space-y-2 rounded-xl border p-8 text-sm shadow-sm lg:mb-0 lg:mr-8 xl:mb-32"
        >
          <h1 className="mb-3 text-2xl font-semibold capitalize">
            {t('educators.resources')}
          </h1>
          <p>{t('educators.science_resources')}</p>
          <p>{t('educators.articles_page')}</p>
        </animated.div>

        <animated.div
          style={cardsTrail[1]}
          className="border-border/60 bg-card space-y-2 rounded-xl border p-8 text-sm shadow-sm"
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
              href="mailto:carlos@sciteens.com"
              className="text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark font-semibold"
              rel="noreferrer"
            >
              Carlos Mercado-Lara
            </a>
            &nbsp;
            {t('educators.or')}
            &nbsp;
            <a
              target="_blank"
              href="mailto:aarti@sciteens.com"
              className="text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark font-semibold"
              rel="noreferrer"
            >
              Aarti Kalamangalam
            </a>
            .
          </p>
        </animated.div>

        <animated.div
          style={cardsTrail[2]}
          className="border-border/60 bg-card mr-0 mt-8 space-y-2 rounded-xl border p-8 text-sm shadow-sm lg:mr-8 xl:mb-32 xl:ml-8 xl:mr-0 xl:mt-0"
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
