import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import Head from 'next/head'

export default function Donate() {
  const { t } = useTranslation('common')
  return (
    <>
      <Head>
        <title>Donate | SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Donate to help support SciTeens"
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
      <div className="w-full">
        <div className="mx-auto w-full px-4 py-8 text-left md:p-8 lg:w-2/3">
          <h1 className="text-4xl">
            {t('donate.annual_donation_appeal')}
          </h1>
          <div className="mt-4 mb-8 flex w-full flex-row">
            <a
              href="https://www.paypal.com/donate?hosted_button_id=7B8QACYV83ACA"
              target="_blank"
              className="mr-2 rounded-lg bg-blue-500 p-2 text-white shadow-md hover:bg-blue-600"
            >
              {t('donate.donate_now')}
            </a>
            <Link href="/about">
              <a className="ml-2 p-2 text-gray-700 hover:underline">
                {t('donate.read_our_mission')}
              </a>
            </Link>
          </div>
          <p>{t('donate.dear_supporter')}</p>
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
