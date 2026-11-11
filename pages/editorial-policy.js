import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import SocialMeta from '@/components/SocialMeta'
import PageHeading from '@/components/PageHeading'
import {
  DetailMain,
  DetailSection,
} from '@/components/DetailLayout'

export default function EditorialPolicy() {
  const { t } = useTranslation('common')
  return (
    <>
      <SocialMeta
        title={t('seo.editorial_title')}
        description={t('seo.editorial_description')}
        path="/editorial-policy"
      />
      <DetailMain>
        <PageHeading>
          {t('seo.editorial_heading')}
        </PageHeading>
        <p className="text-muted-foreground mt-5 leading-relaxed">
          {t('seo.editorial_description')}
        </p>
        {[
          'authorship',
          'sources',
          'science',
          'corrections',
        ].map((section) => (
          <DetailSection
            key={section}
            title={t(`seo.editorial_${section}_heading`)}
          >
            <p className="text-foreground leading-relaxed">
              {t(`seo.editorial_${section}`)}
            </p>
          </DetailSection>
        ))}
      </DetailMain>
    </>
  )
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
