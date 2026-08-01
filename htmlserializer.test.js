// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, render } from '@testing-library/react'
import { RichText } from 'prismic-reactjs'
import htmlSerializer from './htmlserializer'

afterEach(cleanup)

vi.mock('next/image', () => ({
  default: (props) => (
    <img alt={props.alt} src={props.src} />
  ),
}))

const YT = 'https://www.youtube.com/embed/L6dx0pO5MSw'

function renderEmbed({
  html,
  embed_url = 'https://www.youtube.com/watch?v=L6dx0pO5MSw',
  provider_name = 'YouTube',
}) {
  return render(
    <RichText
      render={[
        {
          type: 'embed',
          oembed: {
            html,
            embed_url,
            provider_name,
            type: 'video',
          },
        },
      ]}
      htmlSerializer={htmlSerializer}
    />
  )
}

describe('oEmbed rendering', () => {
  it('renders an allowlisted provider as an iframe we built ourselves', () => {
    const { container } = renderEmbed({
      html: `<iframe width="200" height="113" src="${YT}?feature=oembed" frameborder="0" allowfullscreen></iframe>`,
    })
    const frame = container.querySelector('iframe')
    expect(frame).not.toBeNull()
    expect(frame.getAttribute('src')).toBe(
      `${YT}?feature=oembed`
    )
    // Our own attribute set, not the provider's.
    expect(frame.hasAttribute('srcdoc')).toBe(false)
    expect(frame.getAttribute('loading')).toBe('lazy')
  })

  // Each of these renders through the real prismic-reactjs pipeline, so
  // a regression that lets provider markup reach the DOM shows up as a
  // surviving script/handler/attribute rather than a passing unit call.
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
      'handler with no space before it',
      `<iframe src="${YT}"onload="window.__pwned = 1"></iframe>`,
    ],
    [
      'handler separated by a slash',
      `<iframe src="${YT}"/onload="window.__pwned = 1"></iframe>`,
    ],
    [
      'srcdoc alongside a valid src',
      `<iframe src="${YT}" srcdoc="&lt;script&gt;window.__pwned = 1&lt;/script&gt;"></iframe>`,
    ],
    [
      'javascript: src shadowed by a later valid src',
      `<iframe src="javascript:window.__pwned = 1" src="${YT}"></iframe>`,
    ],
    [
      'iframe followed by a script',
      `<iframe src="${YT}"></iframe><script>window.__pwned = 1</script>`,
    ],
    [
      'off-allowlist host',
      '<iframe src="https://evil.example/x"></iframe>',
    ],
  ])(
    'never injects provider markup: %s',
    (_label, html) => {
      const { container } = renderEmbed({ html })
      expect(container.querySelector('script')).toBeNull()
      expect(container.querySelector('img')).toBeNull()
      expect(container.querySelector('[srcdoc]')).toBeNull()
      expect(container.innerHTML).not.toContain('onload')
      expect(container.innerHTML).not.toContain('onerror')
      expect(container.innerHTML).not.toContain(
        'javascript:'
      )
      const frame = container.querySelector('iframe')
      if (frame) {
        expect(frame.getAttribute('src')).toBe(YT)
      }
    }
  )

  // prismic-reactjs falls back to its own dangerouslySetInnerHTML
  // serializer on a falsy return, so the reject path has to render a
  // real node or it renders the payload instead.
  it('does not fall through to the default serializer when it rejects', () => {
    const { container } = renderEmbed({
      html: '<img src=x onerror="window.__pwned = 1">',
      embed_url: 'http://evil.example/x',
      provider_name: 'Evil',
    })
    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).not.toContain('onerror')
  })

  it('offers a plain link when the embed has an https url but no usable frame', () => {
    const { container } = renderEmbed({
      html: '<blockquote>a tweet</blockquote>',
      embed_url: 'https://example.com/post/1',
      provider_name: 'Somewhere',
    })
    const anchor = container.querySelector('a')
    expect(anchor.getAttribute('href')).toBe(
      'https://example.com/post/1'
    )
    expect(anchor.getAttribute('rel')).toContain('noopener')
    expect(container.querySelector('blockquote')).toBeNull()
  })
})
