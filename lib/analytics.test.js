// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { sendGAEvent } from './analytics'
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
