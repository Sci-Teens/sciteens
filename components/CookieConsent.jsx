import Link from 'next/link'
import { useEffect, useRef } from 'react'
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
  const bannerRef = useRef(null)
  const showBanner = consent === null && i18n?.isInitialized

  useEffect(() => {
    if (router.isReady && i18n?.isInitialized) {
      // See Footer.js: i18next rejects an omitted `resources`.
      i18n.addResourceBundle(router.locale, 'common', {})
    }
  }, [router])

  useEffect(() => {
    const banner = bannerRef.current
    if (!banner) return

    const root = document.documentElement
    const heightProperty = '--cookie-consent-height'
    const updateHeight = () => {
      root.style.setProperty(
        heightProperty,
        `${banner.offsetHeight}px`
      )
    }
    updateHeight()
    const observer =
      typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(updateHeight)
    observer?.observe(banner)

    // Tab may focus an element already in the viewport behind the banner.
    let frame
    function revealFocus(event) {
      const target = event.target
      if (
        banner.contains(target) ||
        !target.matches(':focus-visible')
      )
        return
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        if (document.activeElement !== target) return
        const { top, bottom, left, right } =
          target.getBoundingClientRect()
        const x = (left + right) / 2
        const y = Math.min(
          (top + bottom) / 2,
          window.innerHeight - 1
        )
        const coveringElement = document.elementFromPoint(
          x,
          y
        )
        if (banner.contains(coveringElement)) {
          window.scrollBy(
            0,
            bottom - banner.getBoundingClientRect().top + 8
          )
        }
      })
    }
    document.addEventListener('focusin', revealFocus)

    return () => {
      observer?.disconnect()
      root.style.removeProperty(heightProperty)
      cancelAnimationFrame(frame)
      document.removeEventListener('focusin', revealFocus)
    }
  }, [showBanner])

  // `null` = no decision recorded yet (undecided in localStorage), the
  // only state the banner shows for. Once granted/denied it stays hidden
  // for the rest of the session/browser without further prompting, per
  // Layout's existing promo-banner UX.
  if (!showBanner) return null

  return (
    <div
      ref={bannerRef}
      role="region"
      aria-label={t('cookie_consent.heading')}
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))]"
    >
      <Card className="border-border/60 pointer-events-auto max-h-[50dvh] w-full max-w-2xl overflow-y-auto overscroll-contain shadow-sm">
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">
            {t('cookie_consent.message')}{' '}
            {/* Names the destination rather than saying "Learn more":
                Lighthouse's link-text audit matches the link's own text
                against a blocklist and ignores aria-label. */}
            <Link
              href="/legal/gdpr"
              className="text-foreground underline underline-offset-2"
            >
              {t('cookie_consent.policy_link')}
            </Link>
          </p>
          <div className="flex flex-wrap gap-2 sm:max-w-[60%] sm:shrink-0">
            <Button
              variant="outline"
              className="min-h-8 h-auto max-w-full whitespace-normal"
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
