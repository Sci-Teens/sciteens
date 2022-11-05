import Link from 'next/link'
import Head from 'next/head'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function ResetSent() {
  const { t } = useTranslation('common')
  return (
    <div>
      <Head>
        <title>Reset Password Sent | SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Reset password on SciTeens"
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, reset password, teen science"
        />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
        <meta property="og:type" content="website" />
      </Head>
      <main className="relative z-30 mx-auto -mt-8 mb-4 flex h-screen w-full flex-col justify-center px-4 text-center md:w-96">
        <img
          src="/assets/sciteens_logo_main.svg"
          alt="SciTeens Logo Main"
        />
        <p className="mb-4 text-center text-lg">
          {t('auth.reset_message')}
        </p>
        <Link href="/">
          <a className="outline-none rounded-lg bg-sciteensLightGreen-regular p-2 text-white shadow hover:bg-sciteensLightGreen-dark">
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
  }
}
