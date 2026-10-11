import { GoogleAnalytics } from '@next/third-parties/google'
import Script from 'next/script'
import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { app } from '../lib/firebase'
import { useCookieConsent } from '../lib/consent'
import { GA_GATEWAY_PATH } from '../lib/tagGateway'

const CAPABILITY_ROUTE =
  /^\/(?:(?:es|fr|hi)\/)?(?:unsubscribe|newsletter\/unsubscribe|project\/invite)(?:[/?#]|$)/

function GatewayAnalytics({ measurementId }) {
  useEffect(() => {
    window.dataLayer = window.dataLayer || []
    window.gtag = function () {
      window.dataLayer.push(arguments)
    }
    window.gtag('js', new Date())
    window.gtag('config', measurementId)
  }, [measurementId])

  return (
    <Script
      id="sciteens-google-tag"
      src={`${GA_GATEWAY_PATH}/`}
      strategy="afterInteractive"
    />
  )
}

export default function Analytics() {
  const router = useRouter()
  const measurementId = app.options?.measurementId
  const hasConsent = useCookieConsent()
  const allowed =
    hasConsent && !CAPABILITY_ROUTE.test(router.asPath)

  useEffect(() => {
    if (measurementId) {
      window[`ga-disable-${measurementId}`] = !allowed
    }
  }, [allowed, measurementId])

  if (!measurementId || !allowed) {
    return null
  }

  if (
    process.env.NEXT_PUBLIC_GA_GATEWAY_ENABLED === 'true'
  ) {
    return (
      <GatewayAnalytics measurementId={measurementId} />
    )
  }

  return <GoogleAnalytics gaId={measurementId} />
}
