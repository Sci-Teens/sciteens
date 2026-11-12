import { describe, expect, it, vi } from 'vitest'

vi.mock('next-i18next/serverSideTranslations', () => ({
  serverSideTranslations: vi.fn(async () => ({
    _nextI18Next: {},
  })),
}))

vi.mock('@/lib/opportunityCollectionImages', () => ({
  fetchCollectionProgramImages: vi.fn(async (programs) =>
    programs.map((program) => ({
      ...program,
      imageUrl: '/program-photo.webp',
      imageFit: 'contain',
    }))
  ),
}))

import {
  getStaticPaths,
  getStaticProps,
} from '../../pages/opportunities/[collection]'

describe('opportunity collection routes', () => {
  it('prerenders each guide in each supported language', async () => {
    const { paths, fallback } = await getStaticPaths({
      locales: ['en', 'es', 'fr', 'hi'],
    })
    expect(paths).toHaveLength(24)
    expect(fallback).toBe(false)
    expect(paths).toContainEqual({
      params: { collection: 'international-students' },
      locale: 'hi',
    })
  })

  it('returns a real 404 for an unknown guide', async () => {
    await expect(
      getStaticProps({
        params: { collection: 'made-up-programs' },
        locale: 'en',
      })
    ).resolves.toEqual({ notFound: true })
  })

  it('passes curated source records into the initial page response', async () => {
    const { props } = await getStaticProps({
      params: { collection: 'biology-research' },
      locale: 'fr',
    })
    expect(props.locale).toBe('fr')
    expect(props.collection.programs).toHaveLength(4)
    expect(props.collection.programs[0].sources[0]).toMatch(
      /^https:\/\//
    )
    expect(props.collection.programs[0].imageUrl).toBe(
      '/program-photo.webp'
    )
  })
})
