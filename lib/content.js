// Build-time only: import this from getStaticProps, never from a component.
// It pulls in node:fs and the markdown parser, and Next only strips those
// from the client bundle when the import is confined to a data function.
//
// Every read happens during `next build`, which is why the Dockerfile's
// runner stage never copies content/.
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import { imageSize } from 'image-size'
import { visit } from 'unist-util-visit'
import { isSafeContentUrl } from './contentUrls.mjs'
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

// content/ is not a webpack module, so nothing invalidates a parsed corpus in
// `next dev` and an author would have to restart to see an edit. Outside a
// production build the cache is keyed on the directory's newest mtime, which
// costs one stat per file and rebuilds only after a real change.
const IMMUTABLE_CONTENT =
  process.env.NODE_ENV === 'production'

function fingerprint(dir) {
  if (IMMUTABLE_CONTENT) return 'build'
  if (!fs.existsSync(dir)) return 'missing'
  let newest = 0
  let count = 0
  for (const file of fs.readdirSync(dir)) {
    if (!file.endsWith('.md')) continue
    count += 1
    const { mtimeMs } = fs.statSync(path.join(dir, file))
    if (mtimeMs > newest) newest = mtimeMs
  }
  return `${count}:${newest}`
}

// Measured off the files rather than frontmatter, so replacing an image needs
// no second edit.
let measured = new Map()

// Frontmatter is as untrusted as the markdown body: both arrive by pull
// request. Every url a page turns into an href, a src or a filesystem read
// gets checked here as well as at the sink.
function requireLocalPath(value, field, slug) {
  const url = String(value)
  if (!url.startsWith('/') || url.includes('..'))
    throw new Error(
      `content: "${slug}" has a ${field} that is not a repository path ("${url}"); self-host the asset under public/content/`
    )
  return url
}
function requireSafeUrl(value, field, slug) {
  if (!value) return null
  const url = String(value)
  if (!isSafeContentUrl(url))
    throw new Error(
      `content: "${slug}" has an unsafe ${field} ("${url}")`
    )
  return url
}

function measureImage(publicPath, context) {
  if (!publicPath) return null
  if (measured.has(publicPath))
    return measured.get(publicPath)
  const file = path.join(
    PUBLIC_DIR,
    requireLocalPath(publicPath, 'image path', context)
  )
  let size
  try {
    size = imageSize(fs.readFileSync(file))
  } catch (cause) {
    // A missing asset is a repository error, so fail the build rather than
    // ship a broken image.
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

// Intrinsic dimensions let the browser reserve layout before the bytes land.
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

// YAML types a bare `date: 2023-12-15` as a Date, and stringifying that gives
// "Fri Dec 15 2023 …", which sorts lexically against the quoted dates and
// drifts by the build machine's timezone.
function dateText(value) {
  if (!value) return null
  return value instanceof Date
    ? value.toISOString()
    : String(value)
}

// The listing sort depends on this shape, so a malformed date fails the build
// instead of quietly ordering itself wrong.
function requireDate(value, field, slug) {
  const date = String(
    dateText(requireField(value, field, slug))
  ).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error(
      `content: "${slug}" has an unparseable ${field} "${value}"`
    )
  return date
}

// ---- articles -------------------------------------------------------------

let articleCache = null
let articleStamp = null

function loadArticles() {
  const stamp = fingerprint(ARTICLE_DIR)
  if (articleCache && articleStamp === stamp)
    return articleCache
  // Dimensions belong to the files the corpus references, so they expire with
  // it.
  measured = new Map()

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
        date: requireDate(data.date, 'date', slug),
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

  // Sorted on the date a reader can see, not an upstream publish timestamp;
  // the two disagreed on 6 of 135 migrated documents. Slug breaks ties so the
  // order is stable across builds.
  articles.sort(
    (a, b) =>
      b.date.localeCompare(a.date) ||
      a.slug.localeCompare(b.slug)
  )
  articleCache = articles
  articleStamp = stamp
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

// The card clamps to two lines, and the full text stays both on the detail
// page and in the search corpus, so cutting here costs nothing but bytes.
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

// Only what the cards and filters read. The body tree would put all 123k
// words of the corpus in the /articles document, and dimensions are dead
// weight because every consumer renders these in a fixed-size box.
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

// Most shared tags first, padded with recent articles so the 38 untagged ones
// still get a full row instead of an empty carousel.
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
let courseStamp = null

function loadCourses() {
  const stamp = fingerprint(COURSE_DIR)
  if (courseCache && courseStamp === stamp)
    return courseCache

  const courses = readCollection(COURSE_DIR).map(
    ({ slug, data, body }) => {
      const context = `course "${slug}"`
      return {
        slug,
        title: String(
          requireField(data.title, 'title', slug)
        ),
        description: String(data.description || ''),
        start: dateText(data.start),
        end: dateText(data.end),
        enrollBy: dateText(data.enroll_by),
        tags: Array.isArray(data.tags) ? data.tags : [],
        cover: measureImage(
          requireField(data.cover, 'cover', slug),
          context
        ),
        lessons: (Array.isArray(data.lessons)
          ? data.lessons
          : []
        ).map((lesson) => ({
          date: dateText(lesson.date),
          title: String(lesson.title || ''),
          link: requireSafeUrl(
            lesson.link,
            'lesson link',
            slug
          ),
        })),
        files: (Array.isArray(data.files)
          ? data.files
          : []
        ).map((file) => ({
          name: String(file.name || ''),
          path: file.path
            ? requireLocalPath(file.path, 'file path', slug)
            : '',
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
  courseStamp = stamp
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
  }
}

export function getCourseSummaries() {
  return loadCourses().map(toCourseSummary)
}
