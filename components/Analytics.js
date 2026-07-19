import { app } from '../lib/firebase'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useCookieConsent } from '../lib/consent'

export default function MyPageViewLogger() {
  const router = useRouter()
  const measurementId = app.options?.measurementId
  const hasConsent = useCookieConsent()

  // By passing `location.pathname` to the second argument of `useEffect`,
  // we only log on first render and when the `pathname` changes
  useEffect(() => {
    // GDPR: Google Analytics sets first-party cookies as soon as the SDK
    // initializes, so it must never load before the visitor opts in via
    // CookieConsent.jsx. `hasConsent` re-evaluates (and this effect
    // re-runs) the moment that choice is made, no reload required.
    if (!router.isReady || !measurementId || !hasConsent) {
      return
    }

    import('firebase/analytics')
      .then(({ getAnalytics, logEvent }) => {
        logEvent(getAnalytics(app), 'page_view', {
          page_location: router.asPath,
        })
      })
      .catch(() => {})
  }, [
    router.isReady,
    router.asPath,
    measurementId,
    hasConsent,
  ])

  return null
}
