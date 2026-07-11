const { i18n } = require('./next-i18next.config')
const CompressionPlugin = require('compression-webpack-plugin')

const isDevelopment = process.env.NODE_ENV !== 'production'
const scriptSrc = [
  "'self'",
  "'unsafe-inline'",
  // Narrowly scoped to WebAssembly compilation (not full eval) — required
  // for onnxruntime-web to run the client-side toxicity model loaded by
  // lib/toxicityWorker.js.
  "'wasm-unsafe-eval'",
  ...(isDevelopment ? ["'unsafe-eval'"] : []),
  'https://images.prismic.io',
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

// Firebase talks to these hosts directly once lib/firebase.js's
// connect*Emulator wiring redirects it — dev-only, a production CSP
// has no business allowlisting localhost.
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
  'https://huggingface.co',
  'https://hf.co',
  'https://*.hf.co',
  'https://cdn.jsdelivr.net',
  'https://sciteens.cdn.prismic.io',
  'https://*.algolia.net',
  'https://*.algolianet.com',
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
  // Isolates webpack's persistent cache per Firebase config —
  // without this, two `next dev` processes sharing distDir can leak
  // a client bundle compiled under the other config (see
  // playwright.config.js).
  distDir: process.env.NEXT_DIST_DIR || '.next',
  i18n,
  images: {
    domains: [
      'images.prismic.io',
      'source.unsplash.com',
      'lh3.googleusercontent.com',
      'firebasestorage.googleapis.com',
      'storage.googleapis.com',
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
              "img-src 'self' data: blob: https://images.prismic.io https://source.unsplash.com https://lh3.googleusercontent.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://lh3.googleusercontent.com; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              // *.firebaseapp.com hosts the Firebase Auth helper iframe
              // (__/auth/iframe) that signInWithPopup/signInWithRedirect
              // uses to relay auth events — the project id varies per
              // deployment (dev/staging/prod) and isn't available to this
              // config at container runtime, hence the wildcard.
              // firebasestorage.googleapis.com/storage.googleapis.com —
              // components/FileGallery.js embeds an uploaded PDF's own
              // download URL in an <iframe> for in-page viewing.
              'frame-src https://www.google.com https://*.firebaseapp.com https://firebasestorage.googleapis.com https://storage.googleapis.com; ' +
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
            value:
              'accelerometer=(self), ambient-light-sensor=(self), autoplay=(self), battery=(self), camera=(self), cross-origin-isolated=(self), display-capture=(self), document-domain=(self), encrypted-media=(self), execution-while-not-rendered=(self), execution-while-out-of-viewport=(self), fullscreen=(self), geolocation=(self), gyroscope=(self), keyboard-map=(self), magnetometer=(self), microphone=(self), midi=(self), navigation-override=(self), payment=(self), picture-in-picture=(self), publickey-credentials-get=(self), screen-wake-lock=(self), sync-xhr=(self), usb=(self), web-share=(self), xr-spatial-tracking=(self)',
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
