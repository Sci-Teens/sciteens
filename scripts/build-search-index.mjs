#!/usr/bin/env node
// Writes public/content/article-search.json, the body-text corpus that
// /articles fetches the first time a reader types a query.
//
// Prismic's `fulltext` predicate searched the whole document, so matching only
// on titles and descriptions would be a visible regression: a reader who
// searches a term that appears mid-article would get nothing. The corpus is
// not in the page props because all 135 bodies are roughly 800 KB of text,
// which would land in the /articles HTML for every visitor whether they search
// or not. As a separate static file it costs nothing until a search happens,
// and then it is cached.
//
// Runs before `next dev` and `next build`, the same way
// scripts/copy-pdf-worker.js does. The output is generated, so it is
// gitignored.
import fs from 'node:fs'
import path from 'node:path'
import matter from 'gray-matter'
import {
  hastToText,
  markdownToHast,
} from '../lib/markdown.mjs'

const ROOT = path.join(import.meta.dirname, '..')
const ARTICLE_DIR = path.join(ROOT, 'content/articles')
const OUT_DIR = path.join(ROOT, 'public/content')
const OUT_FILE = path.join(OUT_DIR, 'article-search.json')

const files = fs.existsSync(ARTICLE_DIR)
  ? fs
      .readdirSync(ARTICLE_DIR)
      .filter((f) => f.endsWith('.md'))
  : []

const entries = files.map((file) => {
  const slug = file.replace(/\.md$/, '')
  const parsed = matter(
    fs.readFileSync(path.join(ARTICLE_DIR, file), 'utf8')
  )
  // Lowercased once here so the client does not lowercase 135 bodies on every
  // keystroke. The description is included even though the listing summary
  // already carries one: that copy is truncated for payload size
  // (lib/content.js#summaryDescription), so the full text has to live here or
  // a word past the cut would become unsearchable.
  const body = hastToText(markdownToHast(parsed.content))
  const bio = parsed.data.author_bio
    ? hastToText(markdownToHast(parsed.data.author_bio))
    : ''
  const description = String(parsed.data.description || '')
  return {
    slug,
    text: `${description} ${body} ${bio}`
      .toLowerCase()
      .trim(),
  }
})

// Sorted by slug so the file is byte-stable across builds and does not churn
// the container layer when no content changed.
entries.sort((a, b) => a.slug.localeCompare(b.slug))

fs.mkdirSync(OUT_DIR, { recursive: true })
fs.writeFileSync(OUT_FILE, JSON.stringify(entries))

const bytes = fs.statSync(OUT_FILE).size
console.log(
  `Wrote ${OUT_FILE} (${entries.length} articles, ${(
    bytes / 1024
  ).toFixed(0)} KB)`
)
