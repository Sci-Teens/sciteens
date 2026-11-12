// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react'
import CollectionProgramCard from './CollectionProgramCard'
import { OPPORTUNITY_COLLECTION_PROGRAMS } from '@/lib/opportunityCollections'
import translations from '@/public/locales/en/common.json'

vi.mock('next/image', () => ({
  default: ({ src, alt, ...attributes }) => {
    delete attributes.fill
    delete attributes.priority
    return <img src={src} alt={alt} {...attributes} />
  },
}))

vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key, values = {}) => {
      const text =
        key
          .split('.')
          .reduce(
            (value, part) => value?.[part],
            translations
          ) || key
      return Object.entries(values).reduce(
        (value, [name, replacement]) =>
          value.replace(`{{${name}}}`, replacement),
        text
      )
    },
  }),
}))

afterEach(cleanup)

it('keeps descriptive captions separate from their source action', () => {
  render(
    <CollectionProgramCard
      program={OPPORTUNITY_COLLECTION_PROGRAMS.rsi}
    />
  )
  const caption = screen.getByText(
    translations.opportunity_collections.images.rsi
  )
  expect(caption.closest('a')).toBeNull()
  expect(
    screen.getByRole('link', {
      name: /View image source for/,
    })
  ).toHaveAttribute(
    'href',
    OPPORTUNITY_COLLECTION_PROGRAMS.rsi.imageSource
  )
  expect(
    screen.getByAltText(
      translations.opportunity_collections.image_alt.rsi
    )
  ).toBeInTheDocument()
})

it('keeps program details available when an image fails', () => {
  render(
    <CollectionProgramCard
      program={OPPORTUNITY_COLLECTION_PROGRAMS.rsi}
    />
  )
  fireEvent.error(
    screen.getByAltText(
      translations.opportunity_collections.image_alt.rsi
    )
  )
  expect(screen.queryByRole('figure')).toBeNull()
  expect(
    screen.getByRole('heading', {
      name: OPPORTUNITY_COLLECTION_PROGRAMS.rsi.name,
    })
  ).toBeInTheDocument()
  expect(
    screen.getByRole('link', {
      name: 'Program details on SciTeens',
    })
  ).toHaveAttribute('href', '/program/rsi')
})
