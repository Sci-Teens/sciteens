#!/usr/bin/env node
// Writes public/content/article-search.json, the body-text corpus /articles
// fetches on the first search. Kept out of the page props because all 135
// bodies are ~800 KB of text that most visitors never search.
//
// Runs before `next dev` and `next build`, like scripts/copy-pdf-worker.js.
// Generated, so gitignored.
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
  // Lowercased once so the client does not redo it per keystroke. The full
  // description belongs here because the listing copy is truncated.
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
