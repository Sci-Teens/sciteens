import Link from 'next/link'
import Head from 'next/head'
import { MailCheck } from 'lucide-react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import AuthCard from '@/components/AuthCard'
import { Button } from '@/components/ui/button'

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
      <AuthCard subtitle={t('auth.reset_message')}>
        <MailCheck className="text-sciteensGreen-regular mx-auto mb-4 h-12 w-12" />
        <Button
          render={<Link href="/">{t('auth.go_home')}</Link>}
          size="lg"
          className="mt-6 w-full"
        />
      </AuthCard>
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
