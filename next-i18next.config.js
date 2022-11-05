const path = require('path')

module.exports = {
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es', 'hi', 'fr'],
    localePath: path.resolve('./public/locales'),
  },
}
