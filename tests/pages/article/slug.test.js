// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  render,
  screen,
} from '@testing-library/react'
import { markdownToHast } from '@/lib/markdown.mjs'
import Article from '@/pages/article/[slug]'

// Lives under tests/pages/ rather than pages/article/ — see the comment in
// tests/pages/signup/student.test.js for why (Next's Pages Router treats
// every `.js` under `pages/` as a route).
//
// Regression coverage for three of the reported visual bugs, all rooted in
// the article detail page markup:
// - tag "buttons" rendering as a bare `<p>` link (no chip styling,
//   underlined by the surrounding `.prose` typography styles) instead of
//   the same field-filter chip used on the project detail page.
// - avatar images missing a fixed-size, `object-cover` box, which is what
//   let a mismatched image aspect ratio stretch them.
// - the "More on this topic" recommendations rendering as plain links
//   instead of the shadcn Carousel's swipeable items.

vi.mock('next/router', () => ({
  useRouter: () => ({ query: { slug: 'test-article' } }),
}))

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}))

vi.mock('firebase/analytics', () => ({
  getAnalytics: () => ({}),
  logEvent: () => {},
}))

// Fetches Firestore comments through onSnapshot; irrelevant to the
// article body markup under test here.
vi.mock('@/components/Discussion', () => ({
  default: () => null,
}))

afterEach(cleanup)

const image = (src) => ({ src, width: 256, height: 256 })

function buildArticle() {
  return {
    slug: 'test-article',
    title: 'Test Article',
    description: 'A test article',
    author: 'Test Author',
    date: '2024-01-01',
    tags: ['Biology', 'Made Up Tag'],
    cover: {
      src: '/content/media/cover-abcd1234.webp',
      width: 1200,
      height: 800,
    },
    authorBio: markdownToHast('Author bio'),
    authorHeadshot: image(
      '/content/media/headshot-abcd1234.webp'
    ),
    body: markdownToHast('Body text'),
    minutes: 3,
  }
}

function buildRecommendations(count) {
  return Array.from({ length: count }, (_, i) => ({
    slug: `rec-${i}`,
    title: `Recommendation ${i}`,
    description: 'A recommendation',
    author: 'Rec Author',
    date: '2024-01-01',
    tags: [],
    cover: `/content/media/rec-${i}.webp`,
    headshot: null,
    minutes: 2,
  }))
}

describe('Article', () => {
  it('renders each tag as a chip link outside the prose flow', () => {
    render(
      <Article
        article={buildArticle()}
        recommendations={buildRecommendations(5)}
      />
    )

    const tagLink = screen.getByRole('link', {
      name: 'fields.biology',
    })
    // The old markup put a bare <p> inside a <Link> inside `.prose`, so
    // the tag picked up the prose link underline and none of the chip
    // styling. The surface classes are asserted too: the Button this
    // replaced also carried `rounded-full border`, so shape alone
    // cannot tell the shared chip from what was here before.
    expect(tagLink).toHaveClass(
      'rounded-full',
      'border',
      'bg-card',
      'px-3',
      'py-1'
    )
    expect(tagLink.closest('.prose')).toBeNull()
  })

  it('falls back to the raw tag when no translation exists for it', () => {
    render(
      <Article
        article={buildArticle()}
        recommendations={buildRecommendations(5)}
      />
    )

    expect(
      screen.getByRole('link', { name: 'Made Up Tag' })
    ).toBeInTheDocument()
  })

  it('wraps every avatar image in a fixed-size, object-cover, clipped box', () => {
    render(
      <Article
        article={buildArticle()}
        recommendations={buildRecommendations(5)}
      />
    )

    // Queried by src, not by role: both avatars sit next to the name
    // they belong to, so they carry `alt=""` and are correctly hidden
    // from the accessibility tree.
    const avatarImages = Array.from(
      document.querySelectorAll('img')
    ).filter((img) =>
      img.getAttribute('src')?.includes('headshot-')
    )
    // One in the byline, one in the "About the Author" block.
    expect(avatarImages).toHaveLength(2)
    avatarImages.forEach((img) => {
      // Empty alt is the contract, not an accident: the author's name
      // sits next to both avatars, and the old markup dumped the whole
      // bio into the alt text.
      expect(img).toHaveAttribute('alt', '')
      expect(img).toHaveClass('object-cover')
      const box = img.parentElement
      expect(box).toHaveClass(
        'overflow-hidden',
        'rounded-full',
        'shrink-0'
      )
    })
  })

  it('renders the recommendations as carousel slides', () => {
    render(
      <Article
        article={buildArticle()}
        recommendations={buildRecommendations(5)}
      />
    )

    const slides = document.querySelectorAll(
      '[data-slot="carousel-item"]'
    )
    expect(slides).toHaveLength(5)
    expect(
      screen.getByRole('link', { name: /Recommendation 0/ })
    ).toHaveAttribute('href', '/article/rec-0')
  })

  // The cover is the LCP candidate on this page, and it is deliberately not a
  // next/image: the file is already WebP at the rendered width, so
  // /_next/image would re-encode it on every Cloud Run cold start.
  it('serves the cover eagerly and straight from public/', () => {
    render(
      <Article
        article={buildArticle()}
        recommendations={buildRecommendations(5)}
      />
    )

    const cover = Array.from(
      document.querySelectorAll('img')
    ).find((img) =>
      img.getAttribute('src')?.includes('cover-')
    )
    expect(cover).toHaveAttribute(
      'src',
      '/content/media/cover-abcd1234.webp'
    )
    expect(cover).toHaveAttribute('loading', 'eager')
    expect(cover).toHaveAttribute('width', '1200')
    expect(cover).toHaveAttribute('height', '800')
  })

  // The Prismic page ran the bio through RichText.asText, which dropped
  // every link inside it. The bio is markdown now, so links survive.
  it('renders links inside the author bio', () => {
    const article = buildArticle()
    article.authorBio = markdownToHast(
      'Reach me at [my site](https://example.com/me).'
    )
    render(
      <Article
        article={article}
        recommendations={buildRecommendations(5)}
      />
    )

    expect(
      screen.getByRole('link', { name: 'my site' })
    ).toHaveAttribute('href', 'https://example.com/me')
  })
})
