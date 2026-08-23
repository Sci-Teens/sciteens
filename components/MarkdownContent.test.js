// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { markdownToHast } from '../lib/markdown.mjs'
import MarkdownContent from './MarkdownContent'

afterEach(cleanup)

const YT = 'https://www.youtube.com/embed/L6dx0pO5MSw'

function renderMarkdown(markdown) {
  return render(
    <MarkdownContent hast={markdownToHast(markdown)} />
  )
}

describe('embed directives', () => {
  it('renders an allowlisted origin as an iframe we built ourselves', () => {
    const { container } = renderMarkdown(
      `::embed{url="${YT}?feature=oembed" title="A talk"}`
    )
    const frame = container.querySelector('iframe')
    expect(frame).not.toBeNull()
    expect(frame.getAttribute('src')).toBe(
      `${YT}?feature=oembed`
    )
    expect(frame.getAttribute('title')).toBe('A talk')
    expect(frame.getAttribute('loading')).toBe('lazy')
    // Our own attribute set, never a provider's.
    expect(frame.hasAttribute('srcdoc')).toBe(false)
  })

  it.each([
    ['off-allowlist host', 'https://evil.example/x'],
    ['http downgrade', 'http://www.youtube.com/embed/x'],
    [
      'javascript url',
      'javascript:window.__pwned = 1', // eslint-disable-line no-script-url
    ],
    ['protocol relative', '//www.youtube.com/embed/x'],
    [
      'lookalike host',
      'https://www.youtube.com.evil.test/x',
    ],
    ['not a url', 'nonsense'],
  ])('refuses to frame %s', (_label, url) => {
    const { container } = renderMarkdown(
      `::embed{url="${url}"}`
    )
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.innerHTML).not.toContain('javascript:')
  })

  it('falls back to a plain link for an https url it will not frame', () => {
    const { container } = renderMarkdown(
      '::embed{url="https://example.com/post/1"}'
    )
    expect(container.querySelector('iframe')).toBeNull()
    const anchor = container.querySelector('a')
    expect(anchor.getAttribute('href')).toBe(
      'https://example.com/post/1'
    )
    expect(anchor.getAttribute('rel')).toContain('noopener')
  })
})

// The markdown files are repository content, so a pull request is the
// untrusted vector. remark-rehype drops `html` nodes because
// allowDangerousHtml is never set; these assert that stays true, since adding
// rehype-raw would restore the exact sink the Prismic serializer removed.
describe('raw html in markdown', () => {
  it.each([
    [
      'inline script',
      '<script>window.__pwned = 1</script>',
    ],
    [
      'img with an error handler',
      '<img src=x onerror="window.__pwned = 1">',
    ],
    [
      'iframe to an off-allowlist origin',
      '<iframe src="https://evil.example/x"></iframe>',
    ],
    [
      'srcdoc iframe',
      `<iframe src="${YT}" srcdoc="<script>window.__pwned = 1</script>"></iframe>`,
    ],
    [
      'anchor with a handler',
      '<a href="#" onclick="window.__pwned = 1">x</a>',
    ],
  ])('never renders %s', (_label, markdown) => {
    const { container } = renderMarkdown(markdown)
    expect(container.querySelector('script')).toBeNull()
    expect(container.querySelector('iframe')).toBeNull()
    expect(container.querySelector('[srcdoc]')).toBeNull()
    expect(container.innerHTML).not.toContain('onerror')
    expect(container.innerHTML).not.toContain('onclick')
    expect(window.__pwned).toBeUndefined()
  })
})

describe('link and image urls', () => {
  it('renders a normal external link with noopener', () => {
    const { container } = renderMarkdown(
      '[docs](https://example.com/a)'
    )
    const anchor = container.querySelector('a')
    expect(anchor.getAttribute('href')).toBe(
      'https://example.com/a'
    )
    expect(anchor.getAttribute('target')).toBe('_blank')
    expect(anchor.getAttribute('rel')).toContain('noopener')
  })

  it('keeps an internal link in the same tab', () => {
    const { container } = renderMarkdown(
      '[an article](/article/some-slug)'
    )
    const anchor = container.querySelector('a')
    expect(anchor.getAttribute('href')).toBe(
      '/article/some-slug'
    )
    expect(anchor.hasAttribute('target')).toBe(false)
  })

  it.each([
    ['javascript', '[x](javascript:window.__pwned = 1)'], // eslint-disable-line no-script-url
    ['vbscript', '[x](vbscript:msgbox)'],
    ['protocol relative', '[x](//evil.test/a)'],
  ])('drops the href for a %s link', (_label, markdown) => {
    const { container } = renderMarkdown(markdown)
    expect(container.querySelector('a')).toBeNull()
    expect(container.innerHTML).not.toContain('javascript:')
    expect(container.innerHTML).not.toContain('vbscript:')
    // The link text still renders; only the sink is removed.
    expect(container.textContent).toContain('x')
  })

  it('renders a repository image with its measured dimensions', () => {
    const hast = markdownToHast(
      '![a diagram](/content/media/example-abcd1234.webp)'
    )
    // lib/content.js#attachImageSizes does this at build time.
    hast.children[0].children[0].properties.width = 1200
    hast.children[0].children[0].properties.height = 800
    const { container } = render(
      <MarkdownContent hast={hast} />
    )
    const img = container.querySelector('img')
    expect(img.getAttribute('src')).toBe(
      '/content/media/example-abcd1234.webp'
    )
    expect(img.getAttribute('alt')).toBe('a diagram')
    expect(img.getAttribute('width')).toBe('1200')
    expect(img.getAttribute('height')).toBe('800')
    expect(img.getAttribute('loading')).toBe('lazy')
  })

  it('drops a data: image rather than rendering it', () => {
    const { container } = renderMarkdown(
      '![x](data:image/svg+xml,<svg onload="window.__pwned = 1"/>)'
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).not.toContain('onload')
  })
})

describe('interview directives', () => {
  it('renders the name, headshot and body of an interview', () => {
    const hast = markdownToHast(
      [
        ':::interview{name="Keith Skaggs, MIT" headshot="/content/media/keith-abcd1234.webp"}',
        'What inspired you?',
        '',
        '_The brain._',
        ':::',
      ].join('\n')
    )
    const { container } = render(
      <MarkdownContent hast={hast} />
    )
    expect(container.textContent).toContain(
      'Keith Skaggs, MIT'
    )
    expect(container.textContent).toContain(
      'What inspired you?'
    )
    expect(container.querySelector('em').textContent).toBe(
      'The brain.'
    )
    expect(
      container.querySelector('img').getAttribute('src')
    ).toBe('/content/media/keith-abcd1234.webp')
  })

  it('omits the headshot when its path is unsafe', () => {
    const { container } = renderMarkdown(
      [
        ':::interview{name="X" headshot="javascript:1"}', // eslint-disable-line no-script-url
        'Body.',
        ':::',
      ].join('\n')
    )
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('Body.')
  })

  // Dropped in the pipeline, not only at the sink, so nothing downstream ever
  // sees the value. A merely non-local headshot is a different case: it is an
  // author mistake and lib/content.js fails the build by name for it.
  it('strips a dangerous headshot from the tree itself', () => {
    const hast = markdownToHast(
      [
        ':::interview{name="X" headshot="javascript:1"}', // eslint-disable-line no-script-url
        'Body.',
        ':::',
      ].join('\n')
    )
    const interview = hast.children.find(
      (node) => node.tagName === 'x-interview'
    )
    expect(interview.properties.headshot).toBeUndefined()
  })

  // One Prismic interview slice held several people under a single
  // "Interview" heading. extracurriculars-science-olympiad migrated to three
  // adjacent directives, so a heading per directive would repeat it.
  it('heads a run of adjacent interviews once', () => {
    const person = (name) =>
      [`:::interview{name="${name}"}`, 'Body.', ':::'].join(
        '\n'
      )
    const { container } = renderMarkdown(
      [person('Akash'), person('Sina'), person('Ohm')].join(
        '\n\n'
      )
    )
    expect(container.querySelectorAll('h2')).toHaveLength(1)
    expect(
      container.querySelectorAll('section')
    ).toHaveLength(3)
    for (const name of ['Akash', 'Sina', 'Ohm'])
      expect(container.textContent).toContain(name)
  })

  it('heads a lone interview and a later separated one', () => {
    const { container } = renderMarkdown(
      [
        ':::interview{name="A"}\nBody.\n:::',
        'A paragraph between them.',
        ':::interview{name="B"}\nBody.\n:::',
      ].join('\n\n')
    )
    expect(container.querySelectorAll('h2')).toHaveLength(2)
  })
})

describe('ordinary markdown', () => {
  it('renders headings, lists and emphasis', () => {
    const { container } = renderMarkdown(
      [
        '## A heading',
        '',
        '- one',
        '- two',
        '',
        '1. first',
        '',
        'Some **bold** and _italic_ text.',
      ].join('\n')
    )
    expect(container.querySelector('h2').textContent).toBe(
      'A heading'
    )
    expect(
      container.querySelectorAll('ul li')
    ).toHaveLength(2)
    expect(
      container.querySelector('ol li').textContent
    ).toBe('first')
    expect(
      container.querySelector('strong').textContent
    ).toBe('bold')
  })

  it('renders nothing for empty content instead of an empty wrapper', () => {
    const { container } = render(
      <MarkdownContent hast={markdownToHast('')} />
    )
    expect(container.innerHTML).toBe('')
  })
})
