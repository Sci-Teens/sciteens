module.exports = {
    images: {
        domains: ['images.prismic.io', 'source.unsplash.com'],
    },
    eslint: {
        ignoreDuringBuilds: true,
    },
    // swcMinify: false // it should be false by default 
    i18n: {
        locales: ['en-US', 'fr', 'es', 'hi'],
        defaultLocale: 'en-US',
    },
}