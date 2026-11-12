// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import {
  cleanup,
  render,
  screen,
} from '@testing-library/react'
import Home from '@/pages/index'
import translations from '@/public/locales/en/common.json'

vi.mock('next/router', () => ({
  useRouter: () => ({ locale: 'en' }),
}))
vi.mock('next-i18next', () => ({
  useTranslation: () => ({
    t: (key) =>
      key
        .split('.')
        .reduce(
          (value, part) => value?.[part],
          translations
        ) || key,
  }),
}))
vi.mock('next/image', () => ({
  default: ({ src, alt, ...attributes }) => {
    delete attributes.fill
    delete attributes.priority
    return <img src={src} alt={alt} {...attributes} />
  },
}))
vi.mock('@react-spring/web', () => ({
  animated: Object.assign((component) => component, {
    div: 'div',
    a: 'a',
    h2: 'h2',
    span: 'span',
  }),
  config: {},
  useSpring: (value) =>
    value.countUp === undefined
      ? {}
      : { countUp: { to: (render) => render(1) } },
  useTrail: (length) => Array.from({ length }, () => ({})),
}))
vi.mock('@/lib/reveal', () => ({
  riseUp: () => ({}),
  useSectionReveal: () => ({}),
}))

afterEach(cleanup)

it('includes each guide description inside one clearly named destination link', () => {
  render(<Home />)
  for (const [slug, key] of [
    ['free-research-programs', 'free_programs'],
    ['virtual-research-programs', 'virtual_programs'],
    ['international-students', 'international_programs'],
  ]) {
    const link = screen.getByRole('link', {
      name: translations.seo[key],
      exact: true,
    })
    const description = screen.getByText(
      translations.seo[`${key}_description`]
    )
    expect(description.closest('a')).toBe(link)
    expect(link).toHaveAttribute(
      'href',
      `/opportunities/${slug}`
    )
    expect(link.querySelectorAll('a')).toHaveLength(0)
  }
})
