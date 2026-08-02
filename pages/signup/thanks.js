import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import AuthCard from '@/components/AuthCard'
import { Button } from '@/components/ui/button'
import { INLINE_LINK } from '@/lib/typography'

export default function SignUpThanks() {
  const { t } = useTranslation('common')
  return (
    <AuthCard
      maxWidth="max-w-lg"
      panel={false}
      title={t('auth.thanks_for_signing_up')}
      subtitle={
        <>
          {t('auth.send_confirmation')}&nbsp;
          <Link href="/articles" className={INLINE_LINK}>
            {t('auth.articles')}
          </Link>
          &nbsp;{t('auth.or')}&nbsp;
          <Link href="/projects" className={INLINE_LINK}>
            {t('auth.projects')}
          </Link>
          &nbsp;
          {t('auth.for_inspiration')}
        </>
      }
    >
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="lg"
          className="h-11 px-6 text-base"
          render={<Link href="/projects" />}
        >
          {t('navigation.projects')}
          <ArrowRight
            aria-hidden="true"
            className="group-hover/button:translate-x-0.5 transition-transform"
          />
        </Button>
        <Button
          variant="ghost"
          size="lg"
          className="h-11 px-5 text-base"
          render={<Link href="/articles" />}
        >
          {t('navigation.articles')}
        </Button>
      </div>
    </AuthCard>
  )
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
