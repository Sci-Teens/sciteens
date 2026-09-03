import { GoogleAnalytics } from '@next/third-parties/google'
import { useRouter } from 'next/router'
import { app } from '../lib/firebase'
import { useCookieConsent } from '../lib/consent'

const CAPABILITY_ROUTE =
  /^\/(?:(?:es|fr|hi)\/)?(?:unsubscribe|newsletter\/unsubscribe|project\/invite)(?:[/?#]|$)/

export default function Analytics() {
  const router = useRouter()
  const measurementId = app.options?.measurementId
  const hasConsent = useCookieConsent()

  if (
    !measurementId ||
    !hasConsent ||
    CAPABILITY_ROUTE.test(router.asPath)
  ) {
    return null
  }

  return <GoogleAnalytics gaId={measurementId} />
}
