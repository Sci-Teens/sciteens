'use strict'

const { Readability } = require('@mozilla/readability')
const { JSDOM } = require('jsdom')
const TurndownService = require('turndown')

const MAX_PAGE_CONTENT_CHARS = 8000
const RELEVANT_SECTION_PATTERN =
  /\b(dates?|deadlines?|schedules?|calendar|apply|application|admission|eligib\w*|grades?|age|tuition|cost|fee|scholarship|stipend|housing|residen\w*|location)\b/gi
const HIGH_VALUE_HEADING_PATTERN =
  /\b(course description|program details|key dates|important dates|schedule|calendar|eligib\w*|summer|fall|spring|winter)\b/i
const LOW_VALUE_HEADING_PATTERN =
  /\b(faq|questions?|cancellation|refund|privacy|contact)\b/i
const EXCLUDED_SELECTOR =
  'script, style, noscript, svg, nav, footer, header, iframe, aside, form, dialog, [role="navigation"], [role="banner"], [role="contentinfo"]'

function sectionScore(section) {
  const heading = section.split('\n', 1)[0] || ''
  let score = (
    section.match(RELEVANT_SECTION_PATTERN) || []
  ).length
  if (HIGH_VALUE_HEADING_PATTERN.test(heading)) score += 25
  if (LOW_VALUE_HEADING_PATTERN.test(heading)) score -= 25
  return score
}

function fitCompleteBlocks(section, budget) {
  if (section.length <= budget) return section
  const blocks = section.split(/\n\n+/)
  const kept = []
  let length = 0
  for (const block of blocks) {
    const nextLength =
      length + block.length + (kept.length ? 2 : 0)
    if (nextLength > budget) continue
    kept.push(block)
    length = nextLength
  }
  return kept.join('\n\n')
}

function compactMarkdown(markdown) {
  if (markdown.length <= MAX_PAGE_CONTENT_CHARS)
    return markdown

  const sections = markdown
    .split(/(?=^#{1,4} )/m)
    .map((text, index) => ({ index, text: text.trim() }))
    .filter((section) => section.text)
  if (!sections.length) {
    return fitCompleteBlocks(
      markdown,
      MAX_PAGE_CONTENT_CHARS
    )
  }

  const selected = new Map()
  let length = 0
  const addSection = (section) => {
    if (selected.has(section.index)) return
    const budget =
      MAX_PAGE_CONTENT_CHARS -
      length -
      (selected.size ? 2 : 0)
    const text = fitCompleteBlocks(section.text, budget)
    if (!text) return
    selected.set(section.index, text)
    length += text.length + (selected.size > 1 ? 2 : 0)
  }

  for (const section of [...sections].sort((a, b) => {
    const scoreDifference =
      sectionScore(b.text) - sectionScore(a.text)
    return scoreDifference || a.index - b.index
  })) {
    if (sectionScore(section.text) > 0) addSection(section)
  }
  addSection(sections[0])
  for (const section of sections) addSection(section)

  return [...selected.entries()]
    .sort(([a], [b]) => a - b)
    .map(([, text]) => text)
    .join('\n\n')
}

function structuralContent(document) {
  const source =
    document.querySelector(
      'main, article, [role="main"]'
    ) || document.body
  const root = source.cloneNode(true)
  root
    .querySelectorAll(EXCLUDED_SELECTOR)
    .forEach((element) => {
      element.remove()
    })
  return root.innerHTML
}

function extractPageMarkdown(html, pageUrl) {
  const dom = new JSDOM(html, { url: pageUrl })
  try {
    const document = dom.window.document
    const article = new Readability(
      document.cloneNode(true),
      {
        charThreshold: 0,
      }
    ).parse()
    const content =
      article && article.content
        ? article.content
        : structuralContent(document)
    const turndown = new TurndownService({
      bulletListMarker: '-',
      codeBlockStyle: 'fenced',
      headingStyle: 'atx',
    })
    return compactMarkdown(
      turndown.turndown(content).trim()
    )
  } finally {
    dom.window.close()
  }
}

module.exports = {
  compactMarkdown,
  extractPageMarkdown,
  structuralContent,
  sectionScore,
}
