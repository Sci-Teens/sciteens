// Build-time only: getStaticProps and scripts/build-search-index.mjs. Parsing
// here rather than in the browser keeps the markdown parser out of the client
// bundle, so readers receive plain JSON.
//
// `.mjs` because the prebuild script loads this under plain node, which reads
// a `.js` file in this package as CommonJS.
//
// Never add rehype-raw. remark-rehype drops `html` nodes by default, and that
// is the only thing keeping a raw-HTML sink out of content while script-src
// carries 'unsafe-inline'.
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkDirective from 'remark-directive'
import remarkRehype from 'remark-rehype'
import { visit } from 'unist-util-visit'
import matter from 'gray-matter'
import {
  isAllowedEmbedUrl,
  isSafeContentUrl,
} from './contentUrls.mjs'

// gray-matter picks its engine from the text after the opening delimiter, and
// its `js` engine parses by calling eval() in a scope that has `require`. A
// `---js` file is therefore build-time code execution, so the engine is
// replaced rather than left registered.
const FRONTMATTER = {
  engines: {
    javascript: () => {
      throw new Error(
        'content: frontmatter must be YAML delimited by ---'
      )
    },
  },
}

export function parseFrontmatter(source) {
  return matter(source, FRONTMATTER)
}

const DIRECTIVE_TYPES = [
  'leafDirective',
  'containerDirective',
  'textDirective',
]

function asElement(node, hName, hProperties = {}) {
  node.data = { ...node.data, hName, hProperties }
}

function toLinkParagraph(node, url) {
  node.type = 'paragraph'
  node.children = isSafeContentUrl(url)
    ? [
        {
          type: 'link',
          url,
          children: [{ type: 'text', value: url }],
        },
      ]
    : []
}

function remarkContentDirectives() {
  return (tree) => {
    visit(tree, (node) => {
      if (!DIRECTIVE_TYPES.includes(node.type)) return
      const attributes = node.attributes || {}

      if (
        node.name === 'embed' &&
        node.type === 'leafDirective'
      ) {
        if (isAllowedEmbedUrl(attributes.url)) {
          asElement(node, 'x-embed', {
            url: attributes.url,
            title: attributes.title || '',
          })
        } else {
          toLinkParagraph(node, attributes.url)
        }
        return
      }

      if (
        node.name === 'interview' &&
        node.type === 'containerDirective'
      ) {
        asElement(node, 'x-interview', {
          name: attributes.name || '',
          headshot: attributes.headshot || '',
        })
        return
      }

      // Keep the prose, drop the wrapper, so a misspelt directive reviews as
      // unstyled text rather than a blank gap. A div inside a paragraph would
      // be invalid nesting.
      asElement(
        node,
        node.type === 'textDirective' ? 'span' : 'div'
      )
    })

    // One Prismic interview slice held several people under a single
    // "Interview" heading, so a heading per directive would repeat it three
    // times in extracurriculars-science-olympiad. Only the first of a run
    // carries it.
    let previousWasInterview = false
    for (const child of tree.children) {
      const isInterview =
        child.data?.hName === 'x-interview'
      if (isInterview)
        child.data.hProperties.lead = !previousWasInterview
      previousWasInterview = isInterview
    }
  }
}

function blank(node) {
  node.tagName = 'span'
  node.children = []
}

// Second guard behind the checks above, and the place `position` is stripped
// so the JSON in props carries no source offsets.
function rehypeCleanTree() {
  return (tree) => {
    visit(tree, 'element', (node) => {
      const props = node.properties || {}
      if (
        node.tagName === 'a' &&
        !isSafeContentUrl(props.href)
      )
        delete props.href
      if (
        node.tagName === 'img' &&
        !isSafeContentUrl(props.src)
      ) {
        blank(node)
        delete props.src
      }
      if (
        node.tagName === 'x-embed' &&
        !isAllowedEmbedUrl(props.url)
      ) {
        blank(node)
        delete props.url
      }
      // Dropped rather than blanked: the interview still renders, just
      // without a portrait, and lib/content.js never tries to measure it.
      if (
        node.tagName === 'x-interview' &&
        props.headshot &&
        !isSafeContentUrl(props.headshot)
      )
        delete props.headshot
      node.properties = props
    })
    visit(tree, (node) => {
      delete node.position
    })
  }
}

const processor = unified()
  .use(remarkParse)
  .use(remarkDirective)
  .use(remarkContentDirectives)
  .use(remarkRehype)
  .use(rehypeCleanTree)

export function markdownToHast(markdown) {
  if (!markdown || !String(markdown).trim())
    return { type: 'root', children: [] }
  return processor.runSync(
    processor.parse(String(markdown))
  )
}

export function hastToText(hast) {
  const parts = []
  visit(hast, 'text', (node) => {
    parts.push(node.value)
  })
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

const WORDS_PER_MINUTE = 200

// Counted off the tree, so image paths and directive attributes cannot inflate
// it.
export function readingMinutes(hast) {
  const words = (hastToText(hast).match(/\S+/g) || [])
    .length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}
