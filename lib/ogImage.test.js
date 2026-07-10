import { describe, expect, it } from 'vitest'
import { getOgImageUrl, SITE_URL } from './ogImage'

describe('getOgImageUrl', () => {
  it('builds an absolute /api/og URL carrying title, description, eyebrow, and badge', () => {
    const url = getOgImageUrl({
      title: 'Detecting Microplastics',
      description: 'A research project on urban waterways.',
      eyebrow: 'Project',
      badge: 'Environmental Science',
    })
    expect(url.startsWith(`${SITE_URL}/api/og?`)).toBe(true)
    const params = new URL(url).searchParams
    expect(params.get('title')).toBe(
      'Detecting Microplastics'
    )
    expect(params.get('description')).toBe(
      'A research project on urban waterways.'
    )
    expect(params.get('eyebrow')).toBe('Project')
    expect(params.get('badge')).toBe(
      'Environmental Science'
    )
  })

  // Regression test: the card already renders the SciTeens wordmark in
  // its header, so repeating "| SciTeens" in the title text would be
  // visually redundant on the generated image (unlike the page <title>,
  // which keeps the suffix for the browser tab/SEO).
  it('strips a trailing "| SciTeens" suffix from the card title only', () => {
    const url = getOgImageUrl({
      title: 'About Us | SciTeens',
    })
    expect(new URL(url).searchParams.get('title')).toBe(
      'About Us'
    )
  })

  it('omits params that are not provided', () => {
    const url = getOgImageUrl({ title: 'SciTeens' })
    const params = new URL(url).searchParams
    expect(params.has('description')).toBe(false)
    expect(params.has('eyebrow')).toBe(false)
    expect(params.has('badge')).toBe(false)
  })

  it('returns a valid /api/og URL with no params when called without arguments', () => {
    const url = getOgImageUrl()
    expect(url).toBe(`${SITE_URL}/api/og?`)
  })
})
