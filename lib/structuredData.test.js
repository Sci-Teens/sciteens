import { describe, expect, it } from 'vitest'
import {
  articleStructuredData,
  breadcrumbStructuredData,
  serializeStructuredData,
} from './structuredData'

describe('structured data', () => {
  it('prevents user-controlled text from ending the script', () => {
    const value = {
      name: '</script><script>alert(1)</script>\u2028\u2029',
    }
    const serialized = serializeStructuredData(value)
    expect(serialized).not.toContain('<')
    expect(serialized).not.toContain('\u2028')
    expect(serialized).not.toContain('\u2029')
    expect(JSON.parse(serialized)).toEqual(value)
  })

  it('keeps original authorship and only emits a real update date', () => {
    const article = {
      title: 'A student project',
      description: 'An experiment with open data.',
      cover: { src: '/content/media/example.webp' },
      author: 'Student Author',
      slug: 'student-project',
      date: '2020-05-13',
    }
    expect(
      articleStructuredData(article)
    ).not.toHaveProperty('dateModified')
    const revised = articleStructuredData({
      ...article,
      updated: '2026-11-10',
    })
    expect(revised.datePublished).toBe('2020-05-13')
    expect(revised.dateModified).toBe('2026-11-10')
    expect(revised.author.name).toBe('Student Author')
  })

  it('uses absolute URLs and ordered breadcrumb positions', () => {
    const data = breadcrumbStructuredData([
      { name: 'Home', path: '/' },
      { name: 'Articles', path: '/articles' },
    ])
    expect(
      data.itemListElement.map((item) => item.position)
    ).toEqual([1, 2])
    expect(data.itemListElement[1].item).toBe(
      'https://sciteens.org/articles'
    )
  })
})
