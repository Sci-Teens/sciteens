// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import {
  sendGAEvent,
  trackCompletedSignup,
  trackProgramApplication,
} from './analytics'
import { setConsent } from './consent'

afterEach(() => {
  window.localStorage.clear()
  delete window.gtag
})

it('sends rating events only while consent is granted', () => {
  window.gtag = vi.fn()
  sendGAEvent('event', 'rate_positive')
  expect(window.gtag).not.toHaveBeenCalled()
  setConsent(true)
  sendGAEvent('event', 'rate_positive')
  expect(window.gtag).toHaveBeenCalledWith(
    'event',
    'rate_positive'
  )
  setConsent(false)
  sendGAEvent('event', 'rate_positive')
  expect(window.gtag).toHaveBeenCalledTimes(1)
})

it('does not throw when the tag has not initialized', () => {
  setConsent(true)
  expect(() =>
    sendGAEvent('event', 'rate_positive')
  ).not.toThrow()
})

it('tracks public program IDs without URLs or personal data and honors consent', () => {
  window.gtag = vi.fn()
  trackProgramApplication('research-science-institute')
  expect(window.gtag).not.toHaveBeenCalled()
  setConsent(true)
  trackProgramApplication('research-science-institute')
  trackProgramApplication('person@example.com')
  trackProgramApplication('https://example.com/?email=test')
  expect(window.gtag).toHaveBeenCalledTimes(1)
  expect(window.gtag).toHaveBeenCalledWith(
    'event',
    'program_application_click',
    {
      program_slug: 'research-science-institute',
      transport_type: 'beacon',
    }
  )
})

it('records completed signups using only an allowlisted method', () => {
  setConsent(true)
  window.gtag = vi.fn()
  trackCompletedSignup('email')
  trackCompletedSignup('google')
  trackCompletedSignup('person@example.com')
  expect(window.gtag).toHaveBeenCalledTimes(2)
  expect(window.gtag).toHaveBeenCalledWith(
    'event',
    'sign_up',
    { method: 'email' }
  )
})
