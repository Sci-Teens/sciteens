// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  render,
  screen,
} from '@testing-library/react'
import Article from '@/pages/article/[slug]'

// Lives under tests/pages/ rather than pages/article/ — see the comment in
// tests/pages/signup/student.test.js for why (Next's Pages Router treats
// every `.js` under `pages/` as a route).
//
// Regression coverage for three of the reported visual bugs, all rooted in
// the article detail page markup rather than the shared prismicImageLoader
// fix (covered directly in lib/prismicImageLoader.test.js):
// - tag "buttons" rendering as a bare `<p>` link (no `<button>` semantics,
//   underlined by the surrounding `.prose` typography styles) instead of
//   the same field-filter Button used on /articles.
// - avatar images missing a fixed-size, `object-cover` box, which is what
//   let a mismatched loader aspect ratio stretch them.
// - the "More on this topic" recommendations rendering as plain links
//   instead of the shadcn Carousel's swipeable items.

vi.mock('next/router', () => ({
  useRouter: () => ({ query: { slug: 'test-article' } }),
}))

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}))

vi.mock('firebase/analytics', () => ({
  getAnalytics: vi.fn(),
  logEvent: vi.fn(),
}))

// Fetches Firestore comments through onSnapshot; irrelevant to the
// article body markup under test here.
vi.mock('@/components/Discussion', () => ({
  default: () => null,
}))

afterEach(cleanup)

function buildArticle() {
  return {
    uid: 'test-article',
    tags: ['Biology', 'Made Up Tag'],
    data: {
      title: [{ type: 'heading1', text: 'Test Article' }],
      description: 'A test article',
      author: 'Test Author',
      date: '2024-01-01',
      image: {
        url: 'https://images.prismic.io/test/cover.jpg',
      },
      text: [
        {
          type: 'paragraph',
          text: 'Body text',
          spans: [],
        },
      ],
      body: [
        {
          slice_type: 'about_the_author',
          primary: {
            headshot: {
              url: 'https://images.prismic.io/test/headshot.jpg',
            },
            information: [
              { type: 'paragraph', text: 'Author bio' },
            ],
          },
        },
      ],
    },
  }
}

function buildRecommendations(count) {
  return Array.from({ length: count }, (_, i) => ({
    uid: `rec-${i}`,
    data: {
      title: [
        { type: 'heading1', text: `Recommendation ${i}` },
      ],
      description: 'A recommendation',
      author: 'Rec Author',
      date: '2024-01-01',
      image: {
        url: 'https://images.prismic.io/test/rec.jpg',
      },
      image_slider: [],
      text: [],
    },
  }))
}

describe('Article', () => {
  it('renders each tag as a Button, not a bare underlined link', () => {
    render(
      <Article
        article={buildArticle()}
        recommendations={buildRecommendations(5)}
      />
    )

    const tagButton = screen.getByRole('link', {
      name: 'fields.biology',
    })
    // The Button primitive renders via a `render={<Link ... />}` prop,
    // so the resulting element keeps the anchor's "link" role and its
    // own `data-slot="button"` — the old markup was a plain,
    // unstyled-by-Button <p> inside that same <Link>.
    expect(tagButton).toHaveAttribute('data-slot', 'button')
    expect(tagButton.closest('.not-prose')).toBeTruthy()
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

  it('wraps every avatar image in a fixed-size, object-cover, not-prose box', () => {
    render(
      <Article
        article={buildArticle()}
        recommendations={buildRecommendations(5)}
      />
    )

    const avatarImages = screen
      .getAllByRole('img')
      .filter((img) =>
        img.getAttribute('src')?.includes('headshot.jpg')
      )
    // One in the byline, one in the "About the Author" block.
    expect(avatarImages).toHaveLength(2)
    avatarImages.forEach((img) => {
      expect(img).toHaveClass('object-cover')
      const box = img.parentElement
      expect(box).toHaveClass(
        'not-prose',
        'overflow-hidden'
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
})
