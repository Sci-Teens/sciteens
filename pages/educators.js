import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Head from "next/head"

export default function Educators() {
    const { t } = useTranslation('common')
    return (<>
        <Head>
            <title>Educators | SciTeens</title>
            <link rel="icon" href="/favicon.ico" />
            <meta name="description" content="Help your students succeed via SciTeens" />
            <meta name="keywords" content="SciTeens, sciteens, donate, teen science" />
            <meta property="og:type" content="website" />
            <meta name="og:image" content="/assets/sciteens_initials.jpg" />
        </Head>
        <h1 className='capitalize'>{t('educators.courses')}</h1>
        <p>{t('educators.accessible_courses')}</p>
        <p>{t('educators.promote_to_students')}</p>
        <p>{t('educators.use_colab')}</p>
        <p>{t('educators.contact_us')}
            <a target="_blank" href='mailto:carlos@sciteens.org'>Carlos Mercado-Lara</a>&nbsp;
            {t('educators.or')}
            &nbsp;<a target="_blank" href='mailto:aarti@sciteens.org'>Aarti Kalamangalam</a>.
        </p>

        <h1 className='capitalize'>{t('educators.resources')}</h1>
        <p>{t('educators.science_resources')}</p>
        <p>{t('educators.popular_video')}</p>
        <p>{t('educators.recent_video')}</p>
        <p>{t('educators.articles_page')}</p>

        <h1 className='capitalize'>{t('educators.projects')}</h1>
        <p>{t('educators.post_projects')}</p>
        <p>{t('educators.thanks')}</p>
    </>)

}

export async function getStaticProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common'])),
            // Will be passed to the page component as props
        },
    };
}