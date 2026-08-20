import { Fragment, useMemo } from 'react'
import { useTranslation } from 'next-i18next'
import {
  Fragment as JsxFragment,
  jsx,
  jsxs,
} from 'react/jsx-runtime'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import {
  isAllowedEmbedUrl,
  isSafeContentUrl,
} from '../lib/contentUrls.mjs'
import { INLINE_LINK } from '../lib/typography'
import { cn } from '@/lib/utils'

// Renders the hast tree lib/content.js produced at build time. No markdown
// parser reaches the browser: this walks plain JSON.
//
// Every url is checked again here even though lib/markdown.mjs already checked
// it. That is deliberate. This component is the only place a url becomes an
// href, an <img src> or an <iframe src>, so the check belongs next to the sink
// as well as at the source. If the two ever disagree, the sink wins.

// Article and course media is pre-converted to WebP at exactly the widths the
// layout needs, so it is served as a plain <img> straight from public/ rather
// than through next/image. Cloud Run runs `min-instances 0` with an ephemeral
// per-instance image cache, so /_next/image would re-encode the same file
// after every cold start and on every new instance, burning billed CPU to
// produce a file we already generated.
function ContentImage({ src, alt, width, height, title }) {
  if (!isSafeContentUrl(src)) return null
  return (
    <img
      src={src}
      alt={alt || ''}
      title={title || undefined}
      width={width || undefined}
      height={height || undefined}
      loading="lazy"
      decoding="async"
      className="mx-auto h-auto w-full rounded-lg"
    />
  )
}

function ContentLink({ href, children, ...rest }) {
  if (!isSafeContentUrl(href))
    return <span {...rest}>{children}</span>
  const external = /^https?:/i.test(href)
  return (
    <a
      href={href}
      className={INLINE_LINK}
      {...(external
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
      {...rest}
    >
      {children}
    </a>
  )
}

// Our own iframe, built from a validated origin. The provider's own oEmbed
// markup is never injected: that was the dangerouslySetInnerHTML sink the
// Prismic serializer existed to remove, and script-src still carries
// 'unsafe-inline' for Next's bootstrap, so inline handlers or a `srcdoc` in
// provider markup would execute same-origin.
function ContentEmbed({ url, title }) {
  if (!isAllowedEmbedUrl(url)) return null
  return (
    <span className="not-prose my-6 flex w-full items-center justify-center">
      <iframe
        src={url}
        title={title || 'Embedded media'}
        loading="lazy"
        allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="aspect-video w-full rounded-lg border-0"
      />
    </span>
  )
}

// `:::interview{name=… headshot=…}` from the markdown body. Replaces the
// Prismic `interview` slice and renders in the same position, including the
// "Interview" heading that slice used to supply.
function ContentInterview({
  name,
  headshot,
  headshotWidth,
  headshotHeight,
  children,
}) {
  const { t } = useTranslation('common')
  return (
    <section>
      <h2>{t('article.interview')}</h2>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        {isSafeContentUrl(headshot) && (
          <span className="not-prose bg-muted relative block h-20 w-20 shrink-0 overflow-hidden rounded-full">
            <img
              src={headshot}
              alt=""
              width={headshotWidth || undefined}
              height={headshotHeight || undefined}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          </span>
        )}
        {name && (
          <h3 className="my-0 text-center sm:text-left">
            {name}
          </h3>
        )}
      </div>
      {children}
    </section>
  )
}

const components = {
  img: ContentImage,
  a: ContentLink,
  'x-embed': ContentEmbed,
  'x-interview': ContentInterview,
}

export default function MarkdownContent({
  hast,
  className,
  as: Wrapper = 'div',
}) {
  const rendered = useMemo(() => {
    if (!hast || !hast.children?.length) return null
    return toJsxRuntime(hast, {
      Fragment: JsxFragment,
      jsx,
      jsxs,
      components,
      // hast property names are already React-shaped for the tags we emit;
      // custom elements keep their attributes verbatim.
      passNode: false,
    })
  }, [hast])

  if (!rendered) return null
  if (Wrapper === Fragment) return rendered
  return (
    <Wrapper className={cn(className)}>{rendered}</Wrapper>
  )
}
