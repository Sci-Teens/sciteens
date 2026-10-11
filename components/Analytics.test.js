// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  render,
  screen,
} from '@testing-library/react'
import Analytics from './Analytics'
import { setConsent } from '../lib/consent'

vi.mock('next/router', () => ({
  useRouter: () => ({
    asPath:
      window.location.pathname +
      window.location.search +
      window.location.hash,
  }),
}))

vi.mock('@next/third-parties/google', () => ({
  GoogleAnalytics: ({ gaId }) => (
    <div data-ga-id={gaId} data-testid="google-analytics" />
  ),
}))

vi.mock('../lib/firebase', () => ({
  app: { options: { measurementId: 'G-TEST' } },
}))

vi.mock('next/script', () => ({
  default: ({ src }) => (
    <div data-testid="gateway-script" data-src={src} />
  ),
}))

afterEach(() => {
  cleanup()
  window.localStorage.clear()
  window.history.replaceState({}, '', '/')
  delete window.dataLayer
  delete window.gtag
  vi.unstubAllEnvs()
})

describe('Analytics', () => {
  it('loads the first-party script and queues GA configuration after consent', () => {
    vi.stubEnv('NEXT_PUBLIC_GA_GATEWAY_ENABLED', 'true')
    render(<Analytics />)
    expect(
      screen.queryByTestId('gateway-script')
    ).toBeNull()
    act(() => setConsent(true))
    expect(
      screen.getByTestId('gateway-script')
    ).toHaveAttribute('data-src', '/metrics/')
    expect(Array.from(window.dataLayer[1])).toEqual([
      'config',
      'G-TEST',
    ])
    act(() => setConsent(false))
    expect(
      screen.queryByTestId('gateway-script')
    ).toBeNull()
    expect(window['ga-disable-G-TEST']).toBe(true)
  })

  it('does not load Google Analytics without consent', () => {
    render(<Analytics />)

    expect(
      screen.queryByTestId('google-analytics')
    ).not.toBeInTheDocument()

    act(() => setConsent(false))

    expect(
      screen.queryByTestId('google-analytics')
    ).not.toBeInTheDocument()
  })

  it('loads Google Analytics with the Firebase measurement ID after consent', () => {
    render(<Analytics />)

    act(() => setConsent(true))

    expect(
      screen.getByTestId('google-analytics')
    ).toHaveAttribute('data-ga-id', 'G-TEST')
  })

  it.each([
    '/unsubscribe?uid=u1&token=secret',
    '/newsletter/unsubscribe?subscriber=s1&token=secret',
    '/project/invite#secret',
    '/es/unsubscribe?uid=u1&token=secret',
  ])('does not load on a capability route: %s', (path) => {
    window.history.replaceState({}, '', path)
    act(() => setConsent(true))

    render(<Analytics />)

    expect(
      screen.queryByTestId('google-analytics')
    ).not.toBeInTheDocument()
  })
})
