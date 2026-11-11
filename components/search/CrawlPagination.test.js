// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import {
  cleanup,
  render,
  screen,
} from '@testing-library/react'
import CrawlPagination from './CrawlPagination'

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}))
afterEach(cleanup)

it('renders real previous and next links for crawlers and keyboard navigation', () => {
  render(
    <CrawlPagination
      section="articles"
      page={2}
      hasNextPage
    />
  )
  expect(
    screen.getByRole('link', {
      name: 'seo.pagination.previous',
    })
  ).toHaveAttribute('href', '/articles')
  expect(
    screen.getByRole('link', {
      name: 'seo.pagination.next',
    })
  ).toHaveAttribute('href', '/articles/page/3')
})

it('does not link to a page after the last page', () => {
  render(
    <CrawlPagination
      section="projects"
      page={3}
      hasNextPage={false}
    />
  )
  expect(
    screen.queryByRole('link', {
      name: 'seo.pagination.next',
    })
  ).not.toBeInTheDocument()
})

it('opens the full opportunity archive without hiding closed programs', () => {
  render(
    <CrawlPagination section="opportunities" archiveLink />
  )
  expect(
    screen.getByRole('link', {
      name: 'seo.pagination.browse',
    })
  ).toHaveAttribute('href', '/opportunities/page/1')
})
