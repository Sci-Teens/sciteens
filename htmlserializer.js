import Image from 'next/image'
import { maxWidthImageLoader } from './lib/prismicImageLoader'

var PrismicDOM = require('prismic-dom')
var Elements = PrismicDOM.RichText.Elements

// oEmbed markup is provider HTML relayed verbatim by Prismic, and it
// lands in dangerouslySetInnerHTML below. Prismic will resolve an
// embed against whatever URL an editor pastes, so the provider is not
// automatically one we trust, and script-src still carries
// 'unsafe-inline' for Next's bootstrap — an inline <script> in that
// payload would run. Only render the markup when it is a bare iframe
// from a known video host; anything else degrades to a plain link.
const EMBED_PROVIDERS = [
  'YouTube',
  'Vimeo',
  'SoundCloud',
  'Spotify',
]

function isSafeEmbedHtml(html) {
  if (typeof html !== 'string' || !html) return false
  if (html.length > 4000) return false
  // A single <iframe …></iframe>, optionally wrapped in whitespace,
  // with no event handlers and no javascript:/data: source.
  if (!/^\s*<iframe\b[^>]*>\s*<\/iframe>\s*$/i.test(html))
    return false
  if (/\son[a-z]+\s*=/i.test(html)) return false
  return /\bsrc\s*=\s*["']https:\/\//i.test(html)
}

export default function htmlSerializer(
  type,
  element,
  content,
  children
) {
  switch (type) {
    case Elements.embed:
      if (
        !EMBED_PROVIDERS.includes(
          element.oembed.provider_name
        ) ||
        !isSafeEmbedHtml(element.oembed.html)
      ) {
        if (!/^https:\/\//i.test(element.oembed.embed_url))
          return null
        const url = element.oembed.embed_url
        return (
          <p key={url}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {url}
            </a>
          </p>
        )
      }
      return (
        <div
          data-oembed={element.oembed.embed_url}
          data-oembed-type={element.oembed.type}
          data-oembed-provider={
            element.oembed.provider_name
          }
          className="flex w-full items-center justify-center"
          dangerouslySetInnerHTML={{
            __html: element.oembed.html,
          }}
        ></div>
      )

    case Elements.image:
      return (
        <Image
          loader={maxWidthImageLoader}
          src={element.url}
          alt={element.alt || ''}
          width={element.dimensions.width}
          height={element.dimensions.height}
          sizes="100vw"
          className="mx-auto h-auto w-full"
        />
      )

    // Return null to stick with the default behavior for all other elements
    default:
      return null
  }
}
