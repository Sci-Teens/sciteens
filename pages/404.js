import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

export default function FourOhFour() {
    const { t } = useTranslation('common')
    return <>
        <div className="min-h-screen w-full mx-auto text-center mt-20">
            <img src='/assets/404.png' alt="404" className='w-1/2 mx-auto' />
            <h1 className="text-4xl py-4 font-semibold">
                Page not found
            </h1>
            <p className="text-xl mb-6">
                This page may not exist or may have been deleted.
            </p>
            <Link href='/'>
                <a className='text-xl text-white shadow bg-sciteensLightGreen-regular hover:bg-sciteensLightGreen-dark px-4 py-2 rounded-lg'>Return Home</a>
            </Link>
            {/* <iframe
                width="500"
                height="300"
                src="https://www.youtube.com/embed/wiDpO99BT3w"
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                className="mx-auto overflow-hidden max-w-full">
            </iframe> */}
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