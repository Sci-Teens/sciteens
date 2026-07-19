import Link from 'next/link'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { i18n, useTranslation } from 'next-i18next'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { setConsent, useCookieConsent } from '@/lib/consent'

// Rendered ssr:false from Layout.js (see components/Layout.js), same as
// NavBar/Footer, so it needs their addResourceBundle dance to pick up the
// 'common' namespace on client-only mount instead of racing
// serverSideTranslations.
export default function CookieConsent() {
  const router = useRouter()
  const { t } = useTranslation('common')
  const consent = useCookieConsent()

  useEffect(() => {
    if (router.isReady && i18n?.isInitialized) {
      i18n.addResourceBundle(router.locale, 'common')
    }
  }, [router, i18n])

  // `null` = no decision recorded yet (undecided in localStorage), the
  // only state the banner shows for. Once granted/denied it stays hidden
  // for the rest of the session/browser without further prompting, per
  // Layout's existing promo-banner UX.
  if (consent !== null || !i18n?.isInitialized) return null

  return (
    <div
      role="region"
      aria-label={t('cookie_consent.heading')}
      className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 pb-4"
    >
      <Card className="border-border/60 w-full max-w-2xl shadow-sm">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {t('cookie_consent.message')}{' '}
            <Link
              href="/legal/gdpr"
              className="text-foreground underline underline-offset-2"
            >
              {t('cookie_consent.learn_more')}
            </Link>
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="outline"
              onClick={() => setConsent(false)}
            >
              {t('cookie_consent.reject')}
            </Button>
            <Button onClick={() => setConsent(true)}>
              {t('cookie_consent.accept')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
