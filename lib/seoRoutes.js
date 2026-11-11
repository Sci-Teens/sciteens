import { getCanonicalUrl } from './ogImage'

export const SITE_LOCALES = ['en', 'es', 'fr', 'hi']

const LOCALE_PREFIX = /^\/(es|fr|hi)(?=\/|$)/
const ENGLISH_CONTENT = /^\/(?:article|course)\//
const PRIVATE_ROUTE =
  /^\/(?:404(?:\/|$)|signin(?:\/|$)|signup(?:\/|$)|unsubscribe(?:\/|$)|newsletter(?:\/|$)|project\/(?:create|invite)(?:\/|$)|project\/[^/]+\/edit(?:\/|$)|profile\/[^/]+\/edit(?:\/|$))/

export function getSeoRoute(path = '/', locale = 'en') {
  const pathname =
    new URL(path, 'https://sciteens.org').pathname.replace(
      LOCALE_PREFIX,
      ''
    ) || '/'
  const noindex = PRIVATE_ROUTE.test(pathname)
  const englishOnly = ENGLISH_CONTENT.test(pathname)
  const currentLocale = englishOnly ? 'en' : locale
  const canonical = getCanonicalUrl(pathname, currentLocale)

  return {
    canonical,
    noindex,
    alternates:
      noindex || englishOnly
        ? []
        : [
            ...SITE_LOCALES.map((language) => ({
              language,
              href: getCanonicalUrl(pathname, language),
            })),
            {
              language: 'x-default',
              href: getCanonicalUrl(pathname, 'en'),
            },
          ],
  }
}
