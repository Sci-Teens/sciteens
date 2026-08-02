import Link from 'next/link'
import SocialMeta from '../../components/SocialMeta'
import { ArrowRight } from 'lucide-react'
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
      <AuthCard
        panel={false}
        title={t('auth.reset_sent')}
        subtitle={t('auth.reset_message')}
      >
        <Button
          size="lg"
          className="h-11 px-6 text-base"
          render={<Link href="/" />}
        >
          {t('auth.go_home')}
          <ArrowRight
            aria-hidden="true"
            className="group-hover/button:translate-x-0.5 transition-transform"
          />
        </Button>
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
