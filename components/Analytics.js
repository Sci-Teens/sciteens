import { GoogleAnalytics } from '@next/third-parties/google'
import { app } from '../lib/firebase'
import { useCookieConsent } from '../lib/consent'

export default function Analytics() {
  const measurementId = app.options?.measurementId
  const hasConsent = useCookieConsent()

  if (!measurementId || !hasConsent) {
    return null
  }

  return <GoogleAnalytics gaId={measurementId} />
}
