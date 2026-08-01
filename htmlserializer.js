import Image from 'next/image'
import { maxWidthImageLoader } from './lib/prismicImageLoader'

var PrismicDOM = require('prismic-dom')
var Elements = PrismicDOM.RichText.Elements

// Prismic relays oEmbed markup verbatim from whatever endpoint the
// pasted URL discovers, so `html`, `embed_url` and `provider_name` all
// come from the same untrusted response and none of them can vouch for
// the others. Rather than trying to sanitize that markup, this never
// injects it: it lifts out the single iframe source, checks that
// origin against the hosts we actually support, and builds our own
// iframe. That removes the dangerouslySetInnerHTML sink entirely,
// which matters because script-src still carries 'unsafe-inline' for
// Next's bootstrap, so an inline handler or a `srcdoc` in provider
// markup would execute same-origin.
const EMBED_SRC_HOSTS = [
  'www.youtube.com',
  'www.youtube-nocookie.com',
  'player.vimeo.com',
  'w.soundcloud.com',
  'open.spotify.com',
]

function embedSrc(html) {
  if (typeof html !== 'string' || html.length > 4000)
    return null
  const found = html.match(/src\s*=\s*("[^"]*"|'[^']*')/gi)
  // Exactly one. HTML keeps the first of a repeated attribute and
  // discards the rest, so a second `src` only ever exists to make a
  // reader validate the wrong one.
  if (!found || found.length !== 1) return null
  const raw = found[0]
    .replace(/^src\s*=\s*/i, '')
    .slice(1, -1)
  let parsed
  try {
    parsed = new URL(raw)
  } catch {
    return null
  }
  if (parsed.protocol !== 'https:') return null
  return EMBED_SRC_HOSTS.includes(
    parsed.hostname.toLowerCase()
  )
    ? parsed.href
    : null
}

// prismic-richtext falls back to its own raw-HTML serializer on any
// falsy return, so every branch here has to hand back a real node.
function embedFallback(embedUrl) {
  const url = String(embedUrl ?? '')
  if (!/^https:\/\//i.test(url)) return <span />
  return (
    <p>
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

export default function htmlSerializer(
  type,
  element,
  content,
  children
) {
  switch (type) {
    case Elements.embed: {
      const src = embedSrc(element?.oembed?.html)
      if (!src)
        return embedFallback(element?.oembed?.embed_url)
      return (
        <div className="flex w-full items-center justify-center">
          <iframe
            src={src}
            title={
              element?.oembed?.title || 'Embedded media'
            }
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="aspect-video w-full rounded-lg border-0"
          />
        </div>
      )
    }

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
