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

export function trackProgramApplication(slug) {
  if (
    typeof slug !== 'string' ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug) ||
    slug.length > 180
  )
    return
  sendGAEvent('event', 'program_application_click', {
    program_slug: slug,
    transport_type: 'beacon',
  })
}

export function trackCompletedSignup(method) {
  if (!['email', 'google'].includes(method)) return
  sendGAEvent('event', 'sign_up', { method })
}
