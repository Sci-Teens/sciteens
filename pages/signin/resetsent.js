import Link from "next/link"
import Head from "next/head"
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

export default function ResetSent() {
    return (
        <div >
            <Head>
                <title>Reset Password Sent | SciTeens</title>
                <link rel="icon" href="/favicon.ico" />
                <meta name="description" content="Reset password on SciTeens" />
                <meta name="keywords" content="SciTeens, sciteens, reset password, teen science" />
            </Head>
            <main className="h-screen relative mx-auto -mt-8 mb-4 z-30 text-center w-full md:w-96 flex flex-col justify-center px-4">
                <img src="/assets/sciteens_logo_main.svg" alt="SciTeens Logo Main" />
                <p className="text-lg text-center mb-4">
                    {t('auth.reset_message')}
                </p>
                <Link href="/">
                    <a className="bg-sciteensLightGreen-regular text-white rounded-lg p-2 hover:bg-sciteensLightGreen-dark shadow outline-none">
                        {t('auth.go_home')}
                    </a>
                </Link>
            </main>

        </div>

    )

}

export async function getStaticProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common'])),
        },
    };
}