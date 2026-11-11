import Link from 'next/link'
import { Info } from 'lucide-react'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import AuthCard from '@/components/AuthCard'
import SocialMeta from '@/components/SocialMeta'
import { INLINE_LINK } from '@/lib/typography'

export default function MentorSignUp() {
  const { t } = useTranslation('common')
  const router = useRouter()

  const signInHref = router.query?.ref
    ? {
        pathname: '/signin/educator',
        query: { ref: router.query.ref },
      }
    : '/signin/educator'

  return (
    <div>
      <SocialMeta
        title="Educator Sign Up | SciTeens"
        description={t('auth.educator_signups_closed')}
        eyebrow="Sign Up"
        path="/signup/educator"
      />
      <AuthCard
        maxWidth="max-w-lg"
        title={t('auth.educate_on_sciteens')}
        subtitle={t('auth.why_educate_on_sciteens')}
        footer={
          <>
            {t('auth.have_account')}&nbsp;
            <Link href={signInHref} className={INLINE_LINK}>
              {t('auth.sign_in_link')}
            </Link>
          </>
        }
      >
        <p className="border-border/60 bg-muted/40 flex gap-3 rounded-lg border p-4 text-sm">
          <Info
            aria-hidden="true"
            className="text-muted-foreground size-4 mt-0.5 shrink-0"
          />
          {t('auth.educator_signups_closed')}
        </p>
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
