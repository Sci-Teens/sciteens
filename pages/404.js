import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import PageHeading from '@/components/PageHeading'

export default function FourOhFour() {
  const { t } = useTranslation('common')
  return (
    <>
      <Head>
        <title>{`${t(
          'not_found.title'
        )} | SciTeens`}</title>
        <meta
          key="robots"
          name="robots"
          content="noindex, nofollow"
        />
      </Head>
      <div className="mx-auto mt-20 min-h-screen w-full px-4 text-center">
        <Image
          src="/assets/404.png"
          alt="404"
          width={1217}
          height={462}
          className="mx-auto h-auto w-1/2"
        />
        <PageHeading className="py-4">
          {t('not_found.title')}
        </PageHeading>
        <p className="mb-6 text-xl">
          {t('not_found.description')}
        </p>
        <Link
          href="/"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-xl shadow-sm"
        >
          {t('not_found.return_home')}
        </Link>
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
