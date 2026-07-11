import Link from 'next/link'
import Image from 'next/image'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import SocialMeta from '@/components/SocialMeta'
import PageHeading from '@/components/PageHeading'

export default function Donate() {
  const { t } = useTranslation('common')
  return (
    <>
      <SocialMeta
        title="Donate | SciTeens"
        description="Donate to help support SciTeens and expand free STEM opportunities for teens."
        eyebrow="Donate"
        path="/donate"
      />
      <div className="w-full">
        <div className="mx-auto w-full px-4 py-8 text-left md:p-8 lg:w-2/3">
          <PageHeading>
            {t('donate.annual_donation_appeal')}
          </PageHeading>
          <div className="mb-8 mt-4 flex w-full flex-row">
            <a
              href="https://www.paypal.com/donate?hosted_button_id=7B8QACYV83ACA"
              target="_blank"
              className="bg-sciteensLightGreen-regular hover:bg-sciteensLightGreen-dark mr-2 rounded-lg p-2 text-white shadow-md"
              rel="noreferrer"
            >
              {t('donate.donate_now')}
            </a>
            <Link
              href="/about"
              className="text-muted-foreground ml-2 p-2 hover:underline"
            >
              {t('donate.read_our_mission')}
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
            <Image
              src="/assets/sutor_signature.png"
              alt="John Sutor Signature"
              width={1099}
              height={318}
              className="h-12 w-auto"
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
