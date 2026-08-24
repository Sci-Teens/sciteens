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

vi.mock('@next/third-parties/google', () => ({
  GoogleAnalytics: ({ gaId }) => (
    <div data-ga-id={gaId} data-testid="google-analytics" />
  ),
}))

vi.mock('../lib/firebase', () => ({
  app: { options: { measurementId: 'G-TEST' } },
}))

afterEach(() => {
  cleanup()
  window.localStorage.clear()
})

describe('Analytics', () => {
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
})
