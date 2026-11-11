import { describe, expect, it } from 'vitest'
import { getSeoRoute } from './seoRoutes'

describe('getSeoRoute', () => {
  it('gives translated pages their own canonical and reciprocal alternates', () => {
    const metadata = getSeoRoute('/about?ref=home', 'es')
    expect(metadata.canonical).toBe(
      'https://sciteens.org/es/about'
    )
    expect(metadata.alternates).toEqual([
      {
        language: 'en',
        href: 'https://sciteens.org/about',
      },
      {
        language: 'es',
        href: 'https://sciteens.org/es/about',
      },
      {
        language: 'fr',
        href: 'https://sciteens.org/fr/about',
      },
      {
        language: 'hi',
        href: 'https://sciteens.org/hi/about',
      },
      {
        language: 'x-default',
        href: 'https://sciteens.org/about',
      },
    ])
  })

  it('does not advertise translations for English-only article bodies', () => {
    expect(
      getSeoRoute('/es/article/research', 'es')
    ).toEqual({
      canonical: 'https://sciteens.org/article/research',
      noindex: false,
      alternates: [],
    })
  })

  it.each([
    '/project/invite',
    '/es/newsletter/confirmed',
    '/signup/student',
  ])('noindexes utility route %s', (path) => {
    const metadata = getSeoRoute(path, 'en')
    expect(metadata.noindex).toBe(true)
    expect(metadata.alternates).toEqual([])
  })

  it('keeps numbered archives self-canonical', () => {
    expect(
      getSeoRoute('/articles/page/2', 'fr').canonical
    ).toBe('https://sciteens.org/fr/articles/page/2')
  })

  it('consolidates program aliases at the canonical URL', () => {
    expect(
      getSeoRoute(
        '/program/research-science-institute-rsi-massachusetts-institute-of-technology',
        'en'
      ).canonical
    ).toBe('https://sciteens.org/program/rsi')
  })
})
