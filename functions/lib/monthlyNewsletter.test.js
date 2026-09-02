import { describe, expect, it } from 'vitest'
const { render } = require('@react-email/render')
const {
  normalizeMonthlyNewsletter,
} = require('./monthlyNewsletter')
const {
  monthlyNewsletterTemplate,
} = require('./emailTemplates')

const newsletter = {
  name: 'September 2026',
  subject: 'September at SciTeens',
  preview:
    'A project, an article, and closing opportunities.',
  title: 'See what is next at SciTeens',
  opening: [
    'Welcome to this month at SciTeens.',
    'We selected new work and opportunities for you.',
  ],
  featuredArticle: {
    title: 'How students can start research',
    description: 'A guide for an early research project.',
    href: 'https://sciteens.org/article/start-research',
    imageUrl: 'https://sciteens.org/content/article.webp',
    imageAlt: 'Students work in a science laboratory.',
  },
  featuredProject: {
    title: 'Low-cost water sensor',
    description:
      'A student team built a sensor for local streams.',
    href: 'https://sciteens.org/project/water-sensor',
  },
  opportunities: [
    {
      title: 'Research internship',
      description: 'Apply for a summer research placement.',
      deadline: 'Sep 25',
      href: 'https://sciteens.org/program/research-internship',
    },
  ],
}

describe('monthly newsletter data', () => {
  it('normalizes content before it reaches the email template', () => {
    expect(
      normalizeMonthlyNewsletter({
        ...newsletter,
        title: '  See what is next at SciTeens  ',
      }).title
    ).toBe('See what is next at SciTeens')
  })

  it('rejects a non-HTTPS article link', () => {
    expect(() =>
      normalizeMonthlyNewsletter({
        ...newsletter,
        featuredArticle: {
          ...newsletter.featuredArticle,
          href: 'javascript:alert(1)',
        },
      })
    ).toThrow('featuredArticle.href must be an HTTPS URL.')
  })

  it('requires at least one closing opportunity', () => {
    expect(() =>
      normalizeMonthlyNewsletter({
        ...newsletter,
        opportunities: [],
      })
    ).toThrow('opportunities must contain 1 to 6 items.')
  })
})

describe('monthly newsletter template', () => {
  it('renders every required newsletter section', async () => {
    const html = await render(
      monthlyNewsletterTemplate(newsletter)
    )

    expect(html).toContain('Featured article')
    expect(html).toContain('Featured project')
    expect(html).toContain('Opportunities closing soon')
    expect(html).toContain('Research internship')
    expect(html).toContain('background-color:#f5fff5')
    expect(html).toContain(
      'href="https://sciteens.org/article/start-research"'
    )
    expect(html).toContain(
      'src="https://sciteens.org/assets/sciteens-logo-main.png"'
    )
    expect(html).toContain('width="154"')
    expect(html).toContain('height="48"')
  })

  it('keeps the per-contact newsletter unsubscribe link', async () => {
    const html = await render(
      monthlyNewsletterTemplate(newsletter)
    )

    expect(html).toContain(
      'href="{{{contact.properties.newsletter_unsubscribe_url}}}"'
    )
  })
})
