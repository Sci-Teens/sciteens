import Head from 'next/head'
import { getOgImageUrl, SITE_URL } from '@/lib/ogImage'

// Consistent, correct social meta tags (title/description, Open Graph,
// Twitter Card) for every page, backed by the dynamically generated
// card at pages/api/og.jsx. Replaces the previously duplicated,
// inconsistent per-page <Head> blocks (og:image used `name` instead of
// `property`, no twitter:card tags existed anywhere).
export default function SocialMeta({
  title,
  description,
  path,
  type = 'website',
  eyebrow,
  badge,
  keywords,
}) {
  const image = getOgImageUrl({
    title,
    description,
    eyebrow,
    badge,
  })
  const url = path ? `${SITE_URL}${path}` : undefined

  return (
    <Head>
      <title>{title}</title>
      <link rel="icon" href="/favicon.ico" />
      {description && (
        <meta name="description" content={description} />
      )}
      {keywords && (
        <meta name="keywords" content={keywords} />
      )}
      {url && <meta property="og:url" content={url} />}
      <meta property="og:site_name" content="SciTeens" />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title} />
      {description && (
        <meta
          property="og:description"
          content={description}
        />
      )}
      <meta property="og:image" content={image} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta
        name="twitter:card"
        content="summary_large_image"
      />
      <meta name="twitter:title" content={title} />
      {description && (
        <meta
          name="twitter:description"
          content={description}
        />
      )}
      <meta name="twitter:image" content={image} />
    </Head>
  )
}
