import { describe, expect, it } from 'vitest'
import {
  getArticle,
  getArticleSlugs,
  getArticleSummaries,
  getCourseSlugs,
  getCourseSummaries,
  getCourse,
  getRecommendations,
} from './content'
import { isSafeContentUrl } from './contentUrls.mjs'
import { parseFrontmatter } from './markdown.mjs'

// Runs against the real content/ directory rather than fixtures. The markdown
// and its images are repository files now, so "does every article still parse,
// and does every image it references exist" is a question CI should answer
// before a deploy, not something a reader discovers.

const slugs = getArticleSlugs()
const summaries = getArticleSummaries()

describe('article corpus', () => {
  it('loads every markdown file', () => {
    expect(slugs.length).toBeGreaterThan(100)
    expect(summaries).toHaveLength(slugs.length)
  })

  it('has a unique slug per article', () => {
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  // Slugs are the Firestore key for comment threads
  // (article/{slug}/discussion) and the public url, so they are frozen: one
  // legacy Prismic uid contains a period ("tldr-math-probability-pt.-1") and
  // renaming it would orphan its thread and break inbound links.
  it('uses url-safe slugs', () => {
    const bad = slugs.filter(
      (slug) => !/^[a-z0-9][a-z0-9.-]*$/.test(slug)
    )
    expect(bad).toEqual([])
  })

  it('gives every article the fields the listing and detail pages read', () => {
    const missing = summaries.filter(
      (a) =>
        !a.title ||
        !a.author ||
        !a.date ||
        !a.cover ||
        !a.minutes
    )
    expect(missing.map((a) => a.slug)).toEqual([])
  })

  // The summary ships a bare path, not the measured object: every consumer
  // renders it in a fixed-size box, so the dimensions would be dead weight in
  // the /articles payload. The detail page still gets measured covers.
  it('ships covers as plain paths in summaries and measured on the detail page', () => {
    expect(summaries[0].cover).toMatch(
      /^\/content\/media\/.+\.webp$/
    )
    const detail = getArticle(summaries[0].slug)
    expect(detail.cover.width).toBeGreaterThan(0)
    expect(detail.cover.height).toBeGreaterThan(0)
  })

  // Truncated for payload size, so it must stay short but never empty.
  it('truncates long listing descriptions at a word boundary', () => {
    const long = summaries.filter(
      (a) => a.description.length > 0
    )
    expect(long.length).toBeGreaterThan(0)
    for (const a of long) {
      expect(a.description.length).toBeLessThanOrEqual(201)
      if (a.description.endsWith('…'))
        expect(a.description).not.toMatch(/\s…$/)
    }
  })

  // A bare `date: 2023-12-15` in frontmatter is a Date, not a string, and
  // stringifying one yields "Fri Dec 15 2023 …" which breaks the sort below.
  it('normalises every date to a plain ISO day', () => {
    const bad = summaries.filter(
      (a) => !/^\d{4}-\d{2}-\d{2}$/.test(a.date)
    )
    expect(bad.map((a) => a.date)).toEqual([])
  })

  it('orders newest first', () => {
    const dates = summaries.map((a) => a.date)
    expect([...dates].sort().reverse()).toEqual(dates)
  })

  it('parses a body for every article', () => {
    const empty = slugs.filter(
      (slug) => !getArticle(slug).body.children.length
    )
    expect(empty).toEqual([])
  })

  // Every image path in the tree was measured off a real file by
  // lib/content.js, so a width of 0 means a file that is not an image.
  it('measures every image it renders', () => {
    const offenders = []
    for (const slug of slugs) {
      const article = getArticle(slug)
      const walk = (node) => {
        if (
          node.tagName === 'img' &&
          (!node.properties?.width ||
            !node.properties?.height)
        )
          offenders.push(`${slug}: ${node.properties?.src}`)
        for (const child of node.children || []) walk(child)
      }
      walk(article.body)
      if (article.authorBio) walk(article.authorBio)
    }
    expect(offenders).toEqual([])
  })

  it('returns null for an unknown slug rather than throwing', () => {
    expect(getArticle('not-a-real-article')).toBeNull()
  })
})

// gray-matter chooses its parser from the text after the opening delimiter,
// and its `js` engine is a direct eval() in a scope holding `require`. Every
// markdown file arrives by pull request, so a `---js` header would be build
// and CI code execution.
describe('frontmatter parsing', () => {
  it('refuses a non-yaml frontmatter engine instead of evaluating it', () => {
    const payload = [
      '---js',
      "{title: (() => { globalThis.__frontmatterEscaped = true; return 'x' })()}",
      '---',
      '',
      'body',
    ].join('\n')
    expect(() => parseFrontmatter(payload)).toThrow(
      /must be YAML/
    )
    // eslint-disable-next-line no-undef
    expect(globalThis.__frontmatterEscaped).toBeUndefined()
  })

  it('still parses the yaml the corpus uses', () => {
    const parsed = parseFrontmatter(
      '---\ntitle: Hi\ntags:\n  - Biology\n---\n\nbody\n'
    )
    expect(parsed.data.title).toBe('Hi')
    expect(parsed.data.tags).toEqual(['Biology'])
    expect(parsed.content.trim()).toBe('body')
  })
})

describe('recommendations', () => {
  it('never recommends the article itself', () => {
    for (const slug of slugs.slice(0, 20)) {
      expect(
        getRecommendations(slug).map((r) => r.slug)
      ).not.toContain(slug)
    }
  })

  // 38 articles carry no tags. The Prismic page looped a tag query until it
  // had five and walked off the end of the results array when it could not,
  // which turned the page into a 404.
  it('returns a full set even for an untagged article', () => {
    const untagged = summaries.find(
      (a) => a.tags.length === 0
    )
    expect(untagged).toBeDefined()
    expect(getRecommendations(untagged.slug)).toHaveLength(
      5
    )
  })

  it('prefers articles that share the most tags', () => {
    const tagged = summaries.find((a) => a.tags.length > 1)
    const first = getRecommendations(tagged.slug)[0]
    expect(
      first.tags.some((tag) => tagged.tags.includes(tag))
    ).toBe(true)
  })
})

describe('course corpus', () => {
  const courseSlugs = getCourseSlugs()

  it('loads every course with the fields its pages read', () => {
    expect(courseSlugs.length).toBeGreaterThan(0)
    for (const summary of getCourseSummaries()) {
      expect(summary.title).toBeTruthy()
      expect(summary.cover).toMatch(
        /^\/content\/media\/.+\.webp$/
      )
    }
    for (const slug of courseSlugs)
      expect(getCourse(slug).cover.width).toBeGreaterThan(0)
  })

  it('keeps lesson rows intact, with a link per lesson', () => {
    const course = getCourse(
      'sciteens-online-learning-in-physics-datascience'
    )
    expect(course.lessons).toHaveLength(4)
    for (const lesson of course.lessons) {
      expect(lesson.title).toBeTruthy()
      expect(lesson.link).toMatch(/^https:\/\//)
    }
  })

  it('keeps the course files that were attached to it', () => {
    const course = getCourse(
      'sciteens-online-learning-in-physics-datascience'
    )
    expect(course.files).toHaveLength(3)
    for (const file of course.files) {
      expect(file.path).toMatch(
        /^\/content\/files\/.+\.pdf$/
      )
    }
  })

  // Frontmatter arrives by pull request like the markdown body does, and
  // lesson links are rendered as an <a href>, so they are allowlisted at the
  // source as well as at the sink.
  it('only exposes lesson links and file paths that are safe to render', () => {
    for (const slug of courseSlugs) {
      const course = getCourse(slug)
      for (const lesson of course.lessons)
        if (lesson.link)
          expect(isSafeContentUrl(lesson.link)).toBe(true)
      for (const file of course.files)
        if (file.path) {
          expect(file.path.startsWith('/')).toBe(true)
          expect(file.path).not.toContain('..')
        }
    }
  })
})
