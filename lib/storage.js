import {
  connectStorageEmulator,
  getStorage,
} from 'firebase/storage'

import { app } from './firebase'
import { connectEmulatorOnce } from './firebaseEmulators'

// Split out for the same reason as lib/firestore.js: only the upload and
// file-gallery routes need the Storage SDK, so it should not ride along in
// the shared _app chunk.
export const storage = getStorage(app)

connectEmulatorOnce('STORAGE', (host) =>
  connectStorageEmulator(storage, host, 9199)
)
