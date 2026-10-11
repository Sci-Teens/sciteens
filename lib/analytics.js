import { hasAnalyticsConsent } from './consent'

export function sendGAEvent(...args) {
  if (
    typeof window !== 'undefined' &&
    hasAnalyticsConsent() &&
    typeof window.gtag === 'function'
  ) {
    window.gtag(...args)
  }
}
