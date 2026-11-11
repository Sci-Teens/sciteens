import fs from 'node:fs'
import { afterEach, expect, it, vi } from 'vitest'
import configuration from '../next-sitemap'

afterEach(() => {
  vi.restoreAllMocks()
  delete globalThis.__sitemapFrontmatterEscaped
})

function mockArticle(source) {
  const read = fs.readFileSync.bind(fs)
  vi.spyOn(fs, 'readFileSync').mockImplementation(
    (file, ...args) => {
      return String(file).endsWith(
        '/content/articles/great-datasets.md'
      )
        ? source
        : read(file, ...args)
    }
  )
}

it('uses an actual content update date rather than the build date', async () => {
  mockArticle(
    "---\ntitle: Datasets\ndate: '2020-05-13'\nupdated: '2026-11-10'\n---\nContent"
  )
  expect(
    await configuration.transform(
      {},
      '/article/great-datasets'
    )
  ).toEqual({
    loc: '/article/great-datasets',
    lastmod: '2026-11-10T00:00:00.000Z',
  })
})

it('refuses executable frontmatter when generating sitemap dates', async () => {
  mockArticle(
    "---js\n{date: (() => { globalThis.__sitemapFrontmatterEscaped = true; return '2026-11-10' })()}\n---\nContent"
  )
  await expect(
    configuration.transform({}, '/article/great-datasets')
  ).rejects.toThrow('frontmatter must be YAML')
  expect(
    globalThis.__sitemapFrontmatterEscaped
  ).toBeUndefined()
})

it('dates reviewed collections and does not invent dates for archives', async () => {
  expect(
    await configuration.transform(
      {},
      '/es/opportunities/free-research-programs'
    )
  ).toEqual({
    loc: '/es/opportunities/free-research-programs',
    lastmod: '2026-11-10T00:00:00.000Z',
  })
  expect(
    await configuration.transform({}, '/projects/page/2')
  ).toEqual({ loc: '/projects/page/2' })
})
/* global globalThis */
