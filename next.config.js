const { i18n } = require('./next-i18next.config');

module.exports = {
    i18n,
    images: {
        domains: ['images.prismic.io', 'source.unsplash.com'],
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
}