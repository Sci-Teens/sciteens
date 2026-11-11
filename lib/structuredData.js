import { SITE_URL } from './ogImage'

export function serializeStructuredData(value) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

export function articleStructuredData(article) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: article.title,
    description: article.description,
    image: new URL(article.cover.src, SITE_URL).href,
    datePublished: article.date,
    ...(article.updated
      ? { dateModified: article.updated }
      : {}),
    author: { '@type': 'Person', name: article.author },
    publisher: {
      '@type': 'Organization',
      name: 'SciTeens',
      url: SITE_URL,
    },
    mainEntityOfPage: `${SITE_URL}/article/${article.slug}`,
    inLanguage: 'en',
  }
}

export function breadcrumbStructuredData(items) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map(({ name, path }, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name,
      item: new URL(path, SITE_URL).href,
    })),
  }
}

export const organizationStructuredData = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: 'SciTeens',
  url: SITE_URL,
}
