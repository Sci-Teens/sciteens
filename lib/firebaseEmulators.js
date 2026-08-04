// Opt-in emulator wiring (e2e/playwright.config.js only), shared by the three
// Firebase singleton modules so none of them has to re-export a raw global
// handle just to hold a sentinel.
const usingEmulators =
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS === 'true'

const host =
  process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ||
  '127.0.0.1'

// `globalThis` isn't in this repo's ESLint globals, hence the ternary.
const globalScope =
  typeof window !== 'undefined' ? window : global

// Guarded per service so Fast Refresh re-evaluating a module doesn't
// reconnect an already-connected instance, which throws. `connect` receives
// the host rather than reading it, so the value stays private here.
export function connectEmulatorOnce(service, connect) {
  if (!usingEmulators) return

  const flag = `__SCITEENS_${service}_EMULATOR_CONNECTED__`
  if (globalScope[flag]) return
  globalScope[flag] = true

  connect(host)
}
