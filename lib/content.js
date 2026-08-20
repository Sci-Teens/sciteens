// Build-time only. Reads content/ from disk and hands finished, serialisable
// records to getStaticProps/getStaticPaths.
//
// Never import this from a component or any client path: it pulls in node:fs,
// gray-matter and the markdown parser. Pages import it inside getStaticProps
// only, which Next strips from the client bundle along with its imports.
//
// Every read happens during `next build`, so nothing here needs content/ to
// exist at container runtime. That is why the Dockerfile's runner stage does
// not copy it: article and course routes are all `fallback: false`.
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { imageSize } from 'image-size'
import { visit } from 'unist-util-visit'
import {
  markdownToHast,
  readingMinutes,
} from './markdown.mjs'

const ARTICLE_DIR = path.join(
  process.cwd(),
  'content/articles'
)
const COURSE_DIR = path.join(
  process.cwd(),
  'content/courses'
)
const PUBLIC_DIR = path.join(process.cwd(), 'public')

// Dimensions come off the file itself rather than frontmatter, so dropping a
// replacement image into public/content/media is enough and there is no
// sidecar to fall out of step. Cached because the listing measures the same
// covers once per page render.
const measured = new Map()

function measureImage(publicPath, context) {
  if (!publicPath) return null
  if (measured.has(publicPath))
    return measured.get(publicPath)
  const file = path.join(PUBLIC_DIR, publicPath)
  let size
  try {
    size = imageSize(fs.readFileSync(file))
  } catch (cause) {
    // Loud on purpose: the asset is in the repository, so a missing file is
    // a content error that belongs in CI, not a broken image in production.
    throw new Error(
      `${context}: cannot read image "${publicPath}" (${file})`,
      { cause }
    )
  }
  const result = {
    src: publicPath,
    width: size.width,
    height: size.height,
  }
  measured.set(publicPath, result)
  return result
}

// The renderer needs intrinsic width/height on every <img> to reserve layout
// before the bytes arrive. Body images live inside the markdown, so they are
// measured here rather than in frontmatter.
function attachImageSizes(tree, context) {
  visit(tree, 'element', (node) => {
    const props = node.properties || {}
    if (node.tagName === 'img' && props.src) {
      const size = measureImage(props.src, context)
      props.width = size.width
      props.height = size.height
    }
    if (node.tagName === 'x-interview' && props.headshot) {
      const size = measureImage(props.headshot, context)
      props.headshotWidth = size.width
      props.headshotHeight = size.height
    }
    node.properties = props
  })
  return tree
}

function readCollection(dir) {
  if (!fs.existsSync(dir)) return []
  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.md'))
    .map((file) => {
      const slug = file.replace(/\.md$/, '')
      const parsed = matter(
        fs.readFileSync(path.join(dir, file), 'utf8')
      )
      return {
        slug,
        data: parsed.data,
        body: parsed.content,
      }
    })
}

function requireField(value, field, slug) {
  if (value === undefined || value === null || value === '')
    throw new Error(
      `content: "${slug}" is missing required frontmatter field "${field}"`
    )
  return value
}

// ---- articles -------------------------------------------------------------

let articleCache = null

function loadArticles() {
  if (articleCache) return articleCache

  const articles = readCollection(ARTICLE_DIR).map(
    ({ slug, data, body }) => {
      const context = `article "${slug}"`
      const hast = attachImageSizes(
        markdownToHast(body),
        context
      )
      const bio = data.author_bio
        ? attachImageSizes(
            markdownToHast(data.author_bio),
            context
          )
        : null

      return {
        slug,
        title: String(
          requireField(data.title, 'title', slug)
        ),
        date: String(requireField(data.date, 'date', slug)),
        author: String(
          requireField(data.author, 'author', slug)
        ),
        description: String(data.description || ''),
        tags: Array.isArray(data.tags) ? data.tags : [],
        cover: measureImage(
          requireField(data.cover, 'cover', slug),
          context
        ),
        authorBio: bio,
        authorHeadshot: data.author_headshot
          ? measureImage(data.author_headshot, context)
          : null,
        body: hast,
        minutes: readingMinutes(hast),
      }
    }
  )

  // Ordered by the date the article displays, not by an upstream publish
  // timestamp. The two disagreed on 6 of 135 Prismic documents, which showed
  // up as a listing sorted differently from the dates a reader could see.
  // Slug breaks ties so the order is stable across builds.
  articles.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.slug.localeCompare(b.slug)
  )
  articleCache = articles
  return articles
}

export function getArticleSlugs() {
  return loadArticles().map((article) => article.slug)
}

export function getArticle(slug) {
  const article = loadArticles().find(
    (candidate) => candidate.slug === slug
  )
  return article || null
}

// The listing card clamps the description to two lines, so shipping the full
// text for all 135 articles would send roughly 20 kB nobody can read. The
// untruncated description stays on the detail page, and
// scripts/build-search-index.mjs puts the whole thing in the search corpus,
// so nothing becomes unsearchable by being cut here.
const SUMMARY_DESCRIPTION_LIMIT = 200

function summaryDescription(description) {
  const text = String(description || '')
  if (text.length <= SUMMARY_DESCRIPTION_LIMIT) return text
  const clipped = text.slice(0, SUMMARY_DESCRIPTION_LIMIT)
  const lastSpace = clipped.lastIndexOf(' ')
  return `${clipped
    .slice(0, lastSpace > 0 ? lastSpace : undefined)
    .trimEnd()}…`
}

// Listing payload: everything the cards and the client-side filters need,
// and nothing else. The body tree stays out, or the /articles document would
// carry all 123k words of the corpus. Covers and headshots are bare paths
// because every consumer renders them in a fixed-size box (next/image `fill`,
// or an explicit 24px avatar), so the measured dimensions would be 10 kB of
// numbers nothing reads.
function toArticleSummary(article) {
  return {
    slug: article.slug,
    title: article.title,
    description: summaryDescription(article.description),
    author: article.author,
    date: article.date,
    tags: article.tags,
    cover: article.cover.src,
    headshot: article.authorHeadshot?.src || null,
    minutes: article.minutes,
  }
}

export function getArticleSummaries() {
  return loadArticles().map(toArticleSummary)
}

// Articles sharing at least one tag, most shared tags first. Padded with the
// most recent remaining articles so an untagged article (38 of them) still
// gets a full row instead of an empty carousel.
export function getRecommendations(slug, limit = 5) {
  const articles = loadArticles()
  const current = articles.find((a) => a.slug === slug)
  if (!current) return []
  const tags = new Set(current.tags)

  const others = articles.filter((a) => a.slug !== slug)
  const scored = others
    .map((article) => ({
      article,
      shared: article.tags.filter((tag) => tags.has(tag))
        .length,
    }))
    .filter((entry) => entry.shared > 0)
    .sort(
      (a, b) =>
        b.shared - a.shared ||
        b.article.date.localeCompare(a.article.date)
    )
    .map((entry) => entry.article)

  const picked = scored.slice(0, limit)
  if (picked.length < limit) {
    const chosen = new Set(picked.map((a) => a.slug))
    for (const article of others) {
      if (picked.length >= limit) break
      if (chosen.has(article.slug)) continue
      picked.push(article)
    }
  }
  return picked.map(toArticleSummary)
}

// ---- courses --------------------------------------------------------------

let courseCache = null

function loadCourses() {
  if (courseCache) return courseCache

  const courses = readCollection(COURSE_DIR).map(
    ({ slug, data, body }) => {
      const context = `course "${slug}"`
      return {
        slug,
        title: String(
          requireField(data.title, 'title', slug)
        ),
        description: String(data.description || ''),
        start: data.start ? String(data.start) : null,
        end: data.end ? String(data.end) : null,
        enrollBy: data.enroll_by
          ? String(data.enroll_by)
          : null,
        tags: Array.isArray(data.tags) ? data.tags : [],
        cover: measureImage(
          requireField(data.cover, 'cover', slug),
          context
        ),
        lessons: (Array.isArray(data.lessons)
          ? data.lessons
          : []
        ).map((lesson) => ({
          date: lesson.date ? String(lesson.date) : null,
          title: String(lesson.title || ''),
          link: lesson.link ? String(lesson.link) : null,
        })),
        files: (Array.isArray(data.files)
          ? data.files
          : []
        ).map((file) => ({
          name: String(file.name || ''),
          path: String(file.path || ''),
        })),
        body: attachImageSizes(
          markdownToHast(body),
          context
        ),
      }
    }
  )

  courses.sort(
    (a, b) =>
      String(b.start || '').localeCompare(
        String(a.start || '')
      ) || a.slug.localeCompare(b.slug)
  )
  courseCache = courses
  return courses
}

export function getCourseSlugs() {
  return loadCourses().map((course) => course.slug)
}

export function getCourse(slug) {
  return (
    loadCourses().find((course) => course.slug === slug) ||
    null
  )
}

function toCourseSummary(course) {
  return {
    slug: course.slug,
    title: course.title,
    description: summaryDescription(course.description),
    start: course.start,
    end: course.end,
    tags: course.tags,
    cover: course.cover.src,
    lessonCount: course.lessons.length,
  }
}

export function getCourseSummaries() {
  return loadCourses().map(toCourseSummary)
}
