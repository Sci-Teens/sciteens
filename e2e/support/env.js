// Shared constants for the e2e suite's two dev servers: "emulator"
// (local Auth + Firestore emulators, everything that writes data) and
// "live" (real firebaseConfig, csp-smoke.spec.js only).

const EMULATOR_PROJECT_ID = 'demo-sciteens-e2e'
const FIRESTORE_EMULATOR_PORT = 8080
const AUTH_EMULATOR_PORT = 9099
const STORAGE_EMULATOR_PORT = 9199
const EMULATOR_HOST = '127.0.0.1'

const EMULATOR_APP_PORT = 3100
const LIVE_APP_PORT = 3101

const FIRESTORE_EMULATOR_HOST = `${EMULATOR_HOST}:${FIRESTORE_EMULATOR_PORT}`
const AUTH_EMULATOR_URL = `http://${EMULATOR_HOST}:${AUTH_EMULATOR_PORT}`

// Fake config — never validated once every service is redirected to
// an emulator via connect*Emulator (lib/firebase.js).
const EMULATOR_FIREBASE_CONFIG = {
  NEXT_PUBLIC_USE_FIREBASE_EMULATORS: 'true',
  NEXT_PUBLIC_FIREBASE_EMULATOR_HOST: EMULATOR_HOST,
  NEXT_PUBLIC_FB_API_KEY: 'demo-api-key',
  NEXT_PUBLIC_FB_PROJECT_ID: EMULATOR_PROJECT_ID,
  NEXT_PUBLIC_FB_MESSAGING_SENDER_ID: '000000000000',
  NEXT_PUBLIC_FB_APP_ID: '000000000000',
  NEXT_PUBLIC_FB_MEASUREMENT_ID: 'G-DEMO',
}

module.exports = {
  EMULATOR_PROJECT_ID,
  FIRESTORE_EMULATOR_PORT,
  AUTH_EMULATOR_PORT,
  STORAGE_EMULATOR_PORT,
  EMULATOR_HOST,
  EMULATOR_APP_PORT,
  LIVE_APP_PORT,
  FIRESTORE_EMULATOR_HOST,
  AUTH_EMULATOR_URL,
  EMULATOR_FIREBASE_CONFIG,
}
