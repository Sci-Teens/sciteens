import { describe, expect, it, vi } from 'vitest'
import {
  getStaticPaths,
  getStaticProps,
} from '@/pages/articles/page/[page]'

vi.mock('next-i18next/serverSideTranslations', () => ({
  serverSideTranslations: vi.fn(async () => ({
    _nextI18Next: {},
  })),
}))

vi.mock('@/components/search/ListingArchive', () => ({
  default: () => null,
}))

describe('article archives', () => {
  it('builds every language without reading markdown at runtime', async () => {
    const locales = ['en', 'es', 'fr', 'hi']
    const result = await getStaticPaths({ locales })
    expect(result.fallback).toBe(false)
    const english = result.paths.filter(
      ({ locale }) => locale === 'en'
    )
    expect(english.length).toBeGreaterThan(1)
    for (const locale of locales) {
      expect(
        result.paths.filter(
          (path) => path.locale === locale
        )
      ).toHaveLength(english.length)
      expect(result.paths).toContainEqual({
        locale,
        params: { page: '2' },
      })
    }
  })

  it('does not create empty or invalid archive pages', async () => {
    for (const page of ['0', '999', '100']) {
      await expect(
        getStaticProps({ params: { page }, locale: 'en' })
      ).resolves.toEqual({ notFound: true })
    }
  })
})
