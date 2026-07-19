// Single source of truth for the cookie-consent decision, shared between
// components/CookieConsent.jsx (collects it) and components/Analytics.js /
// pages/article/[slug].js (gate non-essential cookies behind it). Backed by
// localStorage so the choice survives reloads and is shared across tabs via
// the native `storage` event; useSyncExternalStore keeps every subscriber
// (including across components, not just re-renders of one) in sync without
// prop drilling, mirroring lib/useScrollDirection.js.
import { useSyncExternalStore } from 'react'

export const CONSENT_STORAGE_KEY = 'sciteens-cookie-consent'
// Only 'granted' unlocks analytics; anything else (missing, 'denied', or an
// unrecognized value from an older banner version) must fail closed.
const GRANTED = 'granted'
const DENIED = 'denied'

const listeners = new Set()

function readStoredConsent() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(CONSENT_STORAGE_KEY)
  } catch {
    // Storage can throw in private-browsing/quota-exceeded contexts;
    // treat as "no decision yet" rather than crashing the app.
    return null
  }
}

function notify() {
  listeners.forEach((listener) => listener())
}

function subscribe(callback) {
  if (typeof window === 'undefined') return () => {}
  listeners.add(callback)
  // Cross-tab: another tab's write to the same key fires `storage` here.
  window.addEventListener('storage', callback)
  return () => {
    listeners.delete(callback)
    window.removeEventListener('storage', callback)
  }
}

function getServerSnapshot() {
  return null
}

/** Persists the visitor's choice and notifies every subscriber. */
export function setConsent(granted) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      granted ? GRANTED : DENIED
    )
  } catch {
    // Ignore write failures (e.g. storage disabled) — the banner still
    // hides for this session via component state.
  }
  notify()
}

/** `true`/`false` once the visitor has decided, `null` while undecided. */
export function useCookieConsent() {
  const stored = useSyncExternalStore(
    subscribe,
    readStoredConsent,
    getServerSnapshot
  )
  if (stored === GRANTED) return true
  if (stored === DENIED) return false
  return null
}

/** Non-hook read for one-off checks outside React render (e.g. before
 * firing an analytics event from an event handler). */
export function hasAnalyticsConsent() {
  return readStoredConsent() === GRANTED
}
