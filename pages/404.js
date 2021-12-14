import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

export default function FourOhFour() {
    const { t } = useTranslation('common')
    return <>
        <div className="min-h-screen w-full mx-auto text-center mt-20">
            <h1 className="text-4xl py-4 font-semibold">
                404 - Sorry, we couldn't find that
            </h1>
            <p className="text-xl mb-4">
                Here's a cool video to watch instead
            </p>
            <iframe
                width="500"
                height="300"
                src="https://www.youtube.com/embed/wiDpO99BT3w"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="mx-auto overflow-hidden max-w-full">
            </iframe>
        </div>
    </>
}

export async function getStaticProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common'])),
            // Will be passed to the page component as props
        },
    };
}