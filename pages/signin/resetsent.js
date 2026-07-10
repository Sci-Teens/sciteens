import Link from 'next/link'
import SocialMeta from '../../components/SocialMeta'
import { MailCheck } from 'lucide-react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import AuthCard from '@/components/AuthCard'
import { Button } from '@/components/ui/button'

export default function ResetSent() {
  const { t } = useTranslation('common')
  return (
    <div>
      <SocialMeta
        title="Reset Password Sent | SciTeens"
        description="Reset your SciTeens password."
        eyebrow="Sign In"
        path="/signin/resetsent"
      />
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
