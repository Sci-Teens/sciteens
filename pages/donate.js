import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

export default function Donate() {
    const { t } = useTranslation('common')
    return (
        <div className="w-full">
            <div className="text-left px-4 py-8 md:p-8 w-full lg:w-2/3 mx-auto">
                <h1 className="text-4xl">
                    {t('donate.annual_donation_appeal')}
                </h1>
                <div className="w-full flex flex-row mt-4 mb-8">
                    <a
                        href="https://www.paypal.com/donate?hosted_button_id=7B8QACYV83ACA"
                        target="_blank"
                        className="bg-blue-500 text-white rounded-lg shadow-md p-2 mr-2 hover:bg-blue-600"
                    >
                        {t('donate.donate_now')}
                    </a>
                    <Link
                        href="/about"
                    >
                        <a className="text-gray-700 p-2 ml-2 hover:underline">
                            {t('donate.read_our_mission')}
                        </a>
                    </Link>
                </div>
                <p>
                    {t('donate.dear_supporter')}
                </p>
                <p className="my-2">
                    {t('donate.sciteens_pride')}
                </p>
                <p className="my-2">
                    {t('donate.we_depend_on_donations')}
                </p>
                <p className="my-2">
                    {t('donate.we_kindly_ask')}
                </p>
                <p className="my-8">
                    {t('donate.sincerely')}, <br />
                    <img
                        src="/assets/sutor_signature.png"
                        alt="John Sutor Signature"
                        className="h-12"
                    />
                    John Sutor <br />
                    {t('donate.co_founder')}
                </p>
            </div>
        </div>
    )
}

export async function getStaticProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common'])),
            // Will be passed to the page component as props
        },
    };
}
