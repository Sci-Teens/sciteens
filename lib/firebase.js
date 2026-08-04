import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app'
import {
  browserLocalPersistence,
  browserSessionPersistence,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  initializeAuth,
} from 'firebase/auth'
import firebaseConfig from '../firebaseConfig'
import { connectEmulatorOnce } from './firebaseEmulators'

export const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig)

// `initializeAuth` rather than `getAuth`, purely for load performance:
// `getAuth` hardcodes `popupRedirectResolver: browserPopupRedirectResolver`,
// and that resolver eagerly fetches the Firebase Auth helper iframe
// (`<project>.firebaseapp.com/__/auth/iframe.js`, ~94 KB, which then pulls
// gapi from apis.google.com) the moment AuthProvider's onAuthStateChanged
// subscribes — i.e. on every page, signed in or not, sign-in page or not.
// It sat on the critical request chain and inflated LCP site-wide.
//
// Only providerSignIn needs it, so context/helpers.js passes a resolver to
// signInWithPopup explicitly. Keep the deps object identical on every
// evaluation: initializeAuth only returns the existing instance when the
// options deep-equal the ones it was first initialized with.
export const auth = initializeAuth(app, {
  persistence: [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
  ],
  popupRedirectResolver: undefined,
})

connectEmulatorOnce('AUTH', (host) => {
  // Fake, auto-resolving reCAPTCHA so signup doesn't need a human to
  // solve a challenge in CI.
  auth.settings.appVerificationDisabledForTesting = true
  connectAuthEmulator(auth, `http://${host}:9099`, {
    disableWarnings: true,
  })
})
