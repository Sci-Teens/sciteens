// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import CookieConsent from './CookieConsent'
import { CONSENT_STORAGE_KEY } from '../lib/consent'

vi.mock('next/router', () => ({
  useRouter: () => ({
    isReady: true,
    locale: 'en',
  }),
}))

vi.mock('next-i18next', () => ({
  i18n: { isInitialized: true, addResourceBundle: vi.fn() },
  useTranslation: () => ({ t: (key) => key }),
}))

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('CookieConsent', () => {
  it('shows the banner and links to the cookie policy when no choice is recorded', () => {
    render(<CookieConsent />)

    expect(
      screen.getByRole('region', {
        name: 'cookie_consent.heading',
      })
    ).toBeInTheDocument()
    expect(
      screen.getByRole('link', {
        name: 'cookie_consent.learn_more',
      })
    ).toHaveAttribute('href', '/legal/gdpr')
  })

  it('records granted consent and hides once Accept is clicked', () => {
    render(<CookieConsent />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'cookie_consent.accept',
      })
    )

    expect(
      window.localStorage.getItem(CONSENT_STORAGE_KEY)
    ).toBe('granted')
    expect(
      screen.queryByRole('region', {
        name: 'cookie_consent.heading',
      })
    ).not.toBeInTheDocument()
  })

  it('records denied consent and hides once Reject is clicked', () => {
    render(<CookieConsent />)

    fireEvent.click(
      screen.getByRole('button', {
        name: 'cookie_consent.reject',
      })
    )

    expect(
      window.localStorage.getItem(CONSENT_STORAGE_KEY)
    ).toBe('denied')
    expect(
      screen.queryByRole('region', {
        name: 'cookie_consent.heading',
      })
    ).not.toBeInTheDocument()
  })

  it('stays hidden on mount once a choice was already recorded', () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      'granted'
    )

    render(<CookieConsent />)

    expect(
      screen.queryByRole('region', {
        name: 'cookie_consent.heading',
      })
    ).not.toBeInTheDocument()
  })
})
