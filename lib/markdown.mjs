// Build-time only. Turns a markdown string into a hast tree that
// components/MarkdownContent.js renders.
//
// This runs inside getStaticProps and in scripts/build-search-index.mjs, so
// the parser never reaches a client bundle: the browser receives plain JSON
// and renders it without parsing markdown. react-markdown would have shipped
// the whole unified pipeline to every reader and re-parsed on hydration to
// rebuild markup that is already in the HTML.
//
// `.mjs` on purpose: the prebuild script has to load this module under plain
// node, which reads a `.js` file in this package as CommonJS.
//
// The security property that matters is the absence of a raw-HTML sink.
// remark-rehype drops `html` nodes unless `allowDangerousHtml` is set, so
// markdown cannot inject markup. Do not add rehype-raw. script-src still
// carries 'unsafe-inline' for Next's bootstrap, which is exactly why the
// Prismic serializer this replaces refused dangerouslySetInnerHTML.
import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkDirective from 'remark-directive'
import remarkRehype from 'remark-rehype'
import { visit } from 'unist-util-visit'
import {
  isAllowedEmbedUrl,
  isSafeContentUrl,
} from './contentUrls.mjs'

// `::embed{url=…}` and `:::interview{name=… headshot=…}` are the only two
// directives the content uses. Both become custom hast element names that
// MarkdownContent maps to components.
function remarkContentDirectives() {
  return (tree) => {
    visit(tree, (node) => {
      if (
        node.type !== 'leafDirective' &&
        node.type !== 'containerDirective' &&
        node.type !== 'textDirective'
      )
        return

      const attributes = node.attributes || {}

      if (
        node.name === 'embed' &&
        node.type === 'leafDirective'
      ) {
        // Validated here, at build time, so an origin outside the allowlist
        // can never reach an iframe src in a browser.
        if (isAllowedEmbedUrl(attributes.url)) {
          node.data = {
            ...node.data,
            hName: 'x-embed',
            hProperties: {
              url: attributes.url,
              title: attributes.title || '',
            },
          }
          return
        }
        // Same fallback the Prismic serializer used: a plain link, never a
        // frame.
        node.type = 'paragraph'
        node.children = isSafeContentUrl(attributes.url)
          ? [
              {
                type: 'link',
                url: attributes.url,
                children: [
                  { type: 'text', value: attributes.url },
                ],
              },
            ]
          : []
        return
      }

      if (
        node.name === 'interview' &&
        node.type === 'containerDirective'
      ) {
        node.data = {
          ...node.data,
          hName: 'x-interview',
          hProperties: {
            name: attributes.name || '',
            headshot: attributes.headshot || '',
          },
        }
        return
      }

      // Unknown directive: keep its prose, drop the wrapper, so a typo shows
      // up in review as unstyled text instead of a blank gap.
      node.data = {
        ...node.data,
        hName: 'div',
        hProperties: {},
      }
    })
  }
}

// Drops hrefs and srcs the renderer must not trust, and strips `position` so
// the JSON shipped in props carries no source offsets.
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
        node.tagName = 'span'
        node.children = []
        delete props.src
      }
      if (
        node.tagName === 'x-embed' &&
        !isAllowedEmbedUrl(props.url)
      ) {
        node.tagName = 'span'
        node.children = []
        delete props.url
      }
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

// Plain text of a tree, for search indexing and reading time.
export function hastToText(hast) {
  const parts = []
  visit(hast, 'text', (node) => {
    parts.push(node.value)
  })
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

const WORDS_PER_MINUTE = 200

// Counted from the parsed tree, so image paths, directive attributes and link
// targets cannot inflate it. The Prismic page counted words in paragraph
// blocks only, for the same reason.
export function readingMinutes(hast) {
  const words = (hastToText(hast).match(/\S+/g) || [])
    .length
  return Math.max(1, Math.round(words / WORDS_PER_MINUTE))
}
