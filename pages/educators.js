import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useSpring, animated, config } from '@react-spring/web';
import Head from "next/head"

export default function Educators() {
    const { t } = useTranslation('common')

    // REACT SPRING ANIMATIONS
    const get_involved_spring = useSpring({
        transform: 'scale(1)',
        from: {
            transform: 'scale(0)'
        },
        config: config.stiff,
        delay: 100
    })

    return (<>
        <Head>
            <title>Educators | SciTeens</title>
            <link rel="icon" href="/favicon.ico" />
            <meta name="description" content="Help your students succeed via SciTeens" />
            <meta name="keywords" content="SciTeens, sciteens, donate, teen science" />
            <meta property="og:type" content="website" />
            <meta name="og:image" content="/assets/sciteens_initials.jpg" />
        </Head>
        <div className='flex flex-col lg:grid lg:grid-rows-2 xl:grid-rows-1 lg:grid-cols-2 xl:grid-cols-3 mx-5 md:mx-16 lg:mx-24 mt-16 mb-24'>
            <animated.div style={get_involved_spring} className='bg-white shadow rounded-lg xl:mb-32 p-8 text-sm mr-0 lg:mr-8 mb-8 lg:mb-0'>
                <h1 className='text-2xl font-semibold capitalize mb-3'>{t('educators.resources')}</h1>
                <p>{t('educators.science_resources')}</p>
                <p>{t('educators.articles_page')}</p>
            </animated.div>

            <animated.div style={get_involved_spring} className='bg-white shadow rounded-lg p-8 text-sm'>
                <h1 className='text-2xl font-semibold capitalize mb-3'>{t('educators.courses')}</h1>
                <p>{t('educators.accessible_courses')}</p>
                <p>{t('educators.promote_to_students')}</p>
                <p>{t('educators.use_colab')}</p>
                <p>{t('educators.contact_us')}
                    <a target="_blank" href='mailto:carlos@sciteens.org' className='text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark font-semibold'>Carlos Mercado-Lara</a>&nbsp;
                    {t('educators.or')}
                    &nbsp;<a target="_blank" href='mailto:aarti@sciteens.org' className='text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark font-semibold'>Aarti Kalamangalam</a>.
                </p>
            </animated.div>

            <animated.div style={get_involved_spring} className='bg-white shadow rounded-lg xl:mb-32 p-8 text-sm mr-0 lg:mr-8 xl:mr-0 xl:ml-8 mt-8 xl:mt-0'>
                <h1 className='text-2xl font-semibold capitalize mb-3'>{t('educators.projects')}</h1>
                <p>{t('educators.post_projects')}</p>
                <p>{t('educators.thanks')}</p>
            </animated.div>
        </div>
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