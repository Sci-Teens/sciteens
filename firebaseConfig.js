const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
  // Overridable so a custom Firebase Auth domain (e.g. auth.sciteens.org)
  // can replace the default `<project-id>.firebaseapp.com` shown during
  // Google/OAuth sign-in — see next.config.js's frame-src comment for the
  // matching CSP allowance this requires.
  authDomain:
    process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN ||
    process.env.NEXT_PUBLIC_FB_PROJECT_ID +
      '.firebaseapp.com',
  databaseURL:
    'https://' +
    process.env.NEXT_PUBLIC_FB_PROJECT_ID +
    '.firebaseio.com',
  projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
  storageBucket:
    process.env.NEXT_PUBLIC_FB_PROJECT_ID + '.appspot.com',
  messagingSenderId:
    process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID,
  // NEXT_PUBLIC_FB_APP_ID may be stored as either the bare suffix
  // (e.g. "85f32b74d8aa8ec983d9aa") or the full appId string
  // ("1:<senderId>:web:<suffix>"). Building the prefix blindly produces
  // a doubled, malformed appId when the env var already contains the
  // full form, which makes Firestore (and Firebase Installations)
  // reject every request with 400 INVALID_ARGUMENT — leaving the
  // /projects build-time cache empty and the client fallback broken.
  // Use the value verbatim when it already looks like a full appId;
  // otherwise construct it from the sender id + suffix.
  appId: process.env.NEXT_PUBLIC_FB_APP_ID?.includes(
    ':web:'
  )
    ? process.env.NEXT_PUBLIC_FB_APP_ID
    : '1:' +
      process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID +
      ':web:' +
      process.env.NEXT_PUBLIC_FB_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FB_MEASUREMENT_ID,
}

export default firebaseConfig
