import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

export default function SignUpThanks() {
    const { t } = useTranslation('common')
    return (
        <div className="relative h-screen flex flex-col justify-center items-center mx-auto -mt-12 z-30 w-full max-w-prose text-center">
            <img src="/assets/sciteens_logo_main.svg" alt="SciTeens Logo Main" />
            <h1 className="text-2xl text-bold">
                {t("auth.thanks_for_signing_up")}
            </h1>
            <p className="text-lg">
                {t("auth.send_confirmation")}&nbsp;
                <Link href="/articles">
                    <a className="underline">{t("auth.articles")}</a>
                </Link>
                &nbsp;{t("auth.or")}&nbsp;
                <Link href="/projects">
                    <a className="underline">{t("auth.projects")}</a>
                </Link>&nbsp;
                {t("auth.for_inspiration")}
            </p>
            <div className="flex flex-row bg-sciteensGreen-regular p-2 rounded-lg">
                <a href="https://www.facebook.com/SciTeensinfo" target="_blank" rel="noopener noreferrer">
                    <img className="h-6 mr-4 fill-current text-sciteensGreen-regular" src={'../assets/icons/facebook-flat.svg'} alt="Facebook" />
                </a>
                <a href="https://www.instagram.com/sci.teens/" target="_blank" rel="noopener noreferrer">
                    <img className="h-6 mr-4" src={'../assets/icons/instagram.svg'} alt="Instagram" />
                </a>
                <a href="https://www.linkedin.com/company/sciteens/" target="_blank" rel="noopener noreferrer">
                    <img className="h-6 mr-4" src={'../assets/icons/linkedin-flat.svg'} alt="LinkedIn" />
                </a>
                <a href="https://www.youtube.com/channel/UCXnyAT9TOrXywV0M6HbhaRA" target="_blank" rel="noopener noreferrer">
                    <img className="h-6 mr-4" src={'../assets/icons/youtube.svg'} alt="YouTube" />
                </a>
                <a href="https://www.tiktok.com/@sciteens" target="_blank" rel="noopener noreferrer">
                    <img className="h-6" src={'../assets/icons/tiktok.svg'} alt="TikTok" />
                </a>
            </div>
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