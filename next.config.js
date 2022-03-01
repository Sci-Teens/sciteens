const { i18n } = require('./next-i18next.config');

module.exports = {
    i18n,
    images: {
        domains: ['images.prismic.io', 'source.unsplash.com'],
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'Strict-Transport-Security',
                        value: 'max-age=31536000; includeSubDomains',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'SAMEORIGIN',
                    },
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff'
                    },
                    {
                        key: 'Content-Security-Policy',
                        value: "default-src 'unsafe-inline' sciteens.org prismic.io googleapis.com gstatic.com googleusercontent.com"
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'origin-when-cross-origin',
                    },
                ],
            },
        ]
    },
}