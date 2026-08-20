import { useMemo } from 'react'
import { useTranslation } from 'next-i18next'
import { Fragment, jsx, jsxs } from 'react/jsx-runtime'
import { toJsxRuntime } from 'hast-util-to-jsx-runtime'
import {
  isAllowedEmbedUrl,
  isSafeContentUrl,
} from '../lib/contentUrls.mjs'
import { INLINE_LINK } from '../lib/typography'

// Renders the hast tree lib/content.js built at build time. Urls are checked
// again here because this is where they become an href, an <img src> or an
// <iframe src>; if the two checks ever disagree, the sink wins.

// Content media is pre-converted WebP at the width it renders, so it skips
// next/image: Cloud Run runs min-instances 0 with a per-instance optimizer
// cache, and /_next/image would re-encode after every cold start.
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
  return (
    <a
      href={href}
      className={INLINE_LINK}
      {...(/^https?:/i.test(href)
        ? { target: '_blank', rel: 'noopener noreferrer' }
        : {})}
      {...rest}
    >
      {children}
    </a>
  )
}

// Our own iframe from a validated origin. Provider oEmbed markup is never
// injected, which is what removes the dangerouslySetInnerHTML sink.
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
  const rendered = useMemo(
    () =>
      hast?.children?.length
        ? toJsxRuntime(hast, {
            Fragment,
            jsx,
            jsxs,
            components,
          })
        : null,
    [hast]
  )

  if (!rendered) return null
  return <Wrapper className={className}>{rendered}</Wrapper>
}
