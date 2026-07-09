import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  getFirestore,
} from 'firebase/firestore'
import {
  connectStorageEmulator,
  getStorage,
} from 'firebase/storage'
import firebaseConfig from '../firebaseConfig'

export const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

// Opt-in (e2e/playwright.config.js only) — guarded so Fast Refresh
// re-evaluating this module doesn't reconnect an already-connected
// instance, which throws. `globalThis` isn't in this repo's ESLint
// globals, hence the window/global ternary.
const globalScope =
  typeof window !== 'undefined' ? window : global
if (
  process.env.NEXT_PUBLIC_USE_FIREBASE_EMULATORS ===
    'true' &&
  !globalScope.__SCITEENS_FIREBASE_EMULATORS_CONNECTED__
) {
  globalScope.__SCITEENS_FIREBASE_EMULATORS_CONNECTED__ = true
  const host =
    process.env.NEXT_PUBLIC_FIREBASE_EMULATOR_HOST ||
    '127.0.0.1'
  // Fake, auto-resolving reCAPTCHA so signup doesn't need a human to
  // solve a challenge in CI.
  auth.settings.appVerificationDisabledForTesting = true
  connectAuthEmulator(auth, `http://${host}:9099`, {
    disableWarnings: true,
  })
  connectFirestoreEmulator(db, host, 8080)
  connectStorageEmulator(storage, host, 9199)
}
