import { describe, expect, it } from 'vitest'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

describe('localized page payloads', () => {
  it.each(['en', 'es', 'fr', 'hi'])(
    'ships only the complete %s dictionary',
    async (locale) => {
      const result = await serverSideTranslations(locale, [
        'common',
      ])
      const store = result._nextI18Next.initialI18nStore
      expect(Object.keys(store)).toEqual([locale])
      expect(
        store[locale].common.navigation.home
      ).toBeTruthy()
      expect(
        store[locale].common.opportunity_collections.pages
          .free.title
      ).toBeTruthy()
      expect(
        store[locale].common.seo.course_archive
      ).toBeTruthy()
    }
  )
})
