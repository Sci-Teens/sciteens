import {
  connectFirestoreEmulator,
  getFirestore,
} from 'firebase/firestore'

import { app } from './firebase'
import { connectEmulatorOnce } from './firebaseEmulators'

// Separate from lib/firebase.js so the Firestore SDK only lands in the
// chunks of routes that actually query it. AuthProvider and the analytics
// logger run on every page; when `db` lived beside `auth` its ~290 KB of
// Firestore/Storage code was pulled into the shared _app chunk, so
// marketing and legal pages paid for a database they never touch.
export const db = getFirestore(app)

connectEmulatorOnce('FIRESTORE', (host) =>
  connectFirestoreEmulator(db, host, 8080)
)
