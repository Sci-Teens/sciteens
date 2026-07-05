const { i18n } = require('./next-i18next.config')
const CompressionPlugin = require('compression-webpack-plugin')

module.exports = {
  i18n,
  images: {
    domains: ['images.prismic.io', 'source.unsplash.com'],
  },
  eslint: {
    // Lint errors should fail the build — security-relevant rules
    // (no-eval, react-hooks) must not silently regress.
    ignoreDuringBuilds: false,
  },
  experimental: {
    esmExternals: false,
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
              "script-src 'self' 'unsafe-inline' https://images.prismic.io; " +
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
              "img-src 'self' data: https://images.prismic.io https://source.unsplash.com https://lh3.googleusercontent.com https://firebasestorage.googleapis.com https://storage.googleapis.com https://lh3.googleusercontent.com; " +
              "font-src 'self' https://fonts.gstatic.com; " +
              "connect-src 'self' https://firestore.googleapis.com https://www.googleapis.com https://identitytoolkit.googleapis.com https://securetoken.googleapis.com https://firebaseinstallations.googleapis.com https://firebasestorage.googleapis.com https://commentanalyzer.googleapis.com https://sciteens.cdn.prismic.io https://*.algolia.net https://*.algolianet.com; " +
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
