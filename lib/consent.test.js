// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import {
  CONSENT_STORAGE_KEY,
  hasAnalyticsConsent,
  setConsent,
  useCookieConsent,
} from './consent'

afterEach(() => {
  window.localStorage.clear()
})

describe('useCookieConsent', () => {
  it('is null (undecided) before any choice is stored', () => {
    const { result } = renderHook(() => useCookieConsent())
    expect(result.current).toBeNull()
  })

  it('flips to true and persists once consent is granted', () => {
    const { result } = renderHook(() => useCookieConsent())

    act(() => setConsent(true))

    expect(result.current).toBe(true)
    expect(
      window.localStorage.getItem(CONSENT_STORAGE_KEY)
    ).toBe('granted')
  })

  it('flips to false once consent is rejected', () => {
    const { result } = renderHook(() => useCookieConsent())

    act(() => setConsent(false))

    expect(result.current).toBe(false)
    expect(
      window.localStorage.getItem(CONSENT_STORAGE_KEY)
    ).toBe('denied')
  })
})

describe('hasAnalyticsConsent', () => {
  it('is false when undecided or rejected, true only once granted', () => {
    expect(hasAnalyticsConsent()).toBe(false)

    setConsent(false)
    expect(hasAnalyticsConsent()).toBe(false)

    setConsent(true)
    expect(hasAnalyticsConsent()).toBe(true)
  })
})
