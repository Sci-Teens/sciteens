const { i18n } = require('./next-i18next.config')
const CompressionPlugin = require('compression-webpack-plugin')

const isDevelopment = process.env.NODE_ENV !== 'production'
// Only set once a custom Firebase Auth domain (e.g. auth.sciteens.org) is
// wired up — see firebaseConfig.js's authDomain override — so the CSP can
// allowlist it alongside the default *.firebaseapp.com wildcard below.
const authDomain = process.env.NEXT_PUBLIC_FB_AUTH_DOMAIN
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  // Narrowly scoped to WebAssembly compilation (not full eval) — required
  // for onnxruntime-web to run the client-side toxicity model loaded by
  // lib/toxicityWorker.js.
  "'wasm-unsafe-eval'",
  ...(isDevelopment ? ["'unsafe-eval'"] : []),
  'https://www.googletagmanager.com',
  'https://www.google.com',
  // Firebase Auth's signInWithPopup/signInWithRedirect loads the gapi
  // iframes helper from here to relay auth events back to the app —
  // without it every popup sign-in (Google included) fails with
  // auth/internal-error.
  'https://apis.google.com',
  'https://www.gstatic.com',
  // lib/toxicityWorker.js loads @huggingface/transformers from jsDelivr
  // at runtime (`import(/* webpackIgnore: true */ …)`) instead of
  // bundling it — Next's webpack/SWC pipeline cannot parse
  // onnxruntime-web's pre-minified ESM chunks (`import.meta` outside
  // module code); see the comment in that file for the full rationale.
  'https://cdn.jsdelivr.net',
].join(' ')

// Article and course embeds (components/MarkdownContent.js) render as our own
// iframe pointing at one of these origins. lib/contentUrls.mjs#EMBED_SRC_HOSTS
// must list exactly the same hosts, which tests/config/embedHosts.test.js
// asserts.
const EMBED_SRC_HOSTS = [
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'w.soundcloud.com',
  'open.spotify.com',
]
const embedFrameSrc = EMBED_SRC_HOSTS.map(
  (host) => `https://${host}`
).join(' ')

// A child frame only receives a feature its parent delegates to that origin,
// so the embed iframe's `allow` and allowFullScreen are inert unless these
// name the embed hosts.
const embedAllowlist = [
  'self',
  ...EMBED_SRC_HOSTS.map((host) => `"https://${host}"`),
].join(' ')
const EMBED_FEATURES = [
  'accelerometer',
  'autoplay',
  'clipboard-write',
  'encrypted-media',
  'fullscreen',
  'gyroscope',
  'picture-in-picture',
]
const SELF_ONLY_FEATURES = [
  'ambient-light-sensor',
  'battery',
  'camera',
  'cross-origin-isolated',
  'display-capture',
  'document-domain',
  'execution-while-not-rendered',
  'execution-while-out-of-viewport',
  'geolocation',
  'keyboard-map',
  'magnetometer',
  'microphone',
  'midi',
  'navigation-override',
  'payment',
  'publickey-credentials-get',
  'screen-wake-lock',
  'sync-xhr',
  'usb',
  'web-share',
  'xr-spatial-tracking',
]
const permissionsPolicy = [
  ...EMBED_FEATURES.map(
    (feature) => `${feature}=(${embedAllowlist})`
  ),
  ...SELF_ONLY_FEATURES.map(
    (feature) => `${feature}=(self)`
  ),
]
  .sort()
  .join(', ')

// Firebase talks to these hosts directly once the connect*Emulator wiring in
// lib/firebase.js, lib/firestore.js and lib/storage.js redirects it — dev-only,
// a production CSP has no business allowlisting localhost.
const connectSrc = [
  "'self'",
  'https://firestore.googleapis.com',
  'https://firebase.googleapis.com',
  'https://www.googleapis.com',
  'https://apis.google.com',
  'https://identitytoolkit.googleapis.com',
  'https://securetoken.googleapis.com',
  'https://firebaseinstallations.googleapis.com',
  'https://firebasestorage.googleapis.com',
  'https://storage.googleapis.com',
  // Newer Firebase Storage bucket domain. Accepted by
  // context/helpers.js#isSafeFileUrl and firestore.rules, so the three
  // allowlists have to move together or a record on that domain
  // renders as an empty card.
  'https://*.firebasestorage.app',
  'https://huggingface.co',
  'https://hf.co',
  'https://*.hf.co',
  'https://cdn.jsdelivr.net',
  'https://www.google-analytics.com',
  'https://region1.google-analytics.com',
  'https://analytics.google.com',
  'https://stats.g.doubleclick.net',
  ...(isDevelopment
    ? [
        'http://127.0.0.1:8080',
        'http://127.0.0.1:9099',
        'http://127.0.0.1:9199',
      ]
    : []),
].join(' ')

module.exports = {
  output: 'standalone',
  outputFileTracingRoot: __dirname,
  // Isolates webpack's persistent cache per Firebase config —
  // without this, two `next dev` processes sharing distDir can leak
  // a client bundle compiled under the other config (see
  // playwright.config.js).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  i18n,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'source.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '*.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
      },
      {
        protocol: 'https',
        hostname: 'storage.googleapis.com',
      },
    ],
  },
  eslint: {
    // Lint errors should fail the build — security-relevant rules
    // (no-eval, react-hooks) must not silently regress.
    ignoreDuringBuilds: false,
  },
  experimental: {
    esmExternals: false,
  },
  async redirects() {
    return [
      {
        source: '/getinvolved',
        destination: '/get-involved',
        permanent: true,
      },
      {
        source: '/signup',
        destination: '/signup/student',
        permanent: true,
      },
      // Articles and courses are English-only content: content/articles and
      // content/courses hold one markdown file per item, with no locale
      // variants. getStaticPaths therefore prerenders the default locale
      // only, so /es/article/<slug> used to 404 while /es/articles happily
      // linked to it. Send those to the English page rather than build four
      // copies of the same English prose.
      //
      // 307, not 308: if translated articles ever land, a permanent redirect
      // would already be cached in readers' browsers.
      {
        source: '/:locale(es|fr|hi)/article/:slug',
        destination: '/article/:slug',
        permanent: false,
        locale: false,
      },
      {
        source: '/:locale(es|fr|hi)/course/:slug',
        destination: '/course/:slug',
        permanent: false,
        locale: false,
      },
    ]
  },
  async headers() {
    return [
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        // Content-hashed filenames, so a changed image is a changed url and
        // this can never serve a stale asset. These bypass /_next/image, so
        // the browser cache is all that sits between a reader and Cloud Run.
        source: '/content/media/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:path*',
        headers: [
          {
            key: 'Strict-Transport-Security',
            value:
              'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self'; " +
              `script-src ${scriptSrc}; ` +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              // blob: — components/File.js previews dropped/loaded
              // project files via URL.createObjectURL before upload.
              "img-src 'self' data: blob: https://source.unsplash.com https://*.googleusercontent.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.firebasestorage.app; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              // *.firebaseapp.com hosts the Firebase Auth helper iframe
              // (__/auth/iframe) that signInWithPopup/signInWithRedirect
              // uses to relay auth events — the project id varies per
              // deployment (dev/staging/prod) and isn't available to this
              // config at container runtime, hence the wildcard. The Auth
              // emulator serves the same iframe from 127.0.0.1:9099, so
              // dev/e2e Google sign-in needs it too.
              // firebasestorage.googleapis.com/storage.googleapis.com —
              // components/FileGallery.js embeds an uploaded PDF's own
              // download URL in an <iframe> for in-page viewing.
              // The embed hosts come from EMBED_SRC_HOSTS above; without them
              // here every embed is a blank frame.
              `frame-src https://www.google.com https://*.firebaseapp.com ${
                authDomain ? `https://${authDomain} ` : ''
              }${
                isDevelopment
                  ? 'http://127.0.0.1:9099 '
                  : ''
              }https://firebasestorage.googleapis.com https://storage.googleapis.com https://*.firebasestorage.app ${embedFrameSrc}; ` +
              `connect-src ${connectSrc}; ` +
              "frame-ancestors 'self'; " +
              "base-uri 'self'; " +
              "form-action 'self'",
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: permissionsPolicy,
          },
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
    ]
  },
  webpack: function (config) {
    config.plugins.push(new CompressionPlugin())
    return config
  },
}
