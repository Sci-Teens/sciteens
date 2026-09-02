const MAX_OPENING_PARAGRAPHS = 3
const MAX_OPPORTUNITIES = 6

function text(value, field, maxLength) {
  if (typeof value !== 'string') {
    throw new Error(`${field} must be text.`)
  }
  const normalized = value.replace(/\s+/g, ' ').trim()
  if (!normalized) {
    throw new Error(`${field} is required.`)
  }
  if (normalized.length > maxLength) {
    throw new Error(
      `${field} must be ${maxLength} characters or less.`
    )
  }
  return normalized
}

function httpsUrl(value, field) {
  const url = text(value, field, 2048)
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') {
      throw new Error('invalid protocol')
    }
    return parsed.toString()
  } catch {
    throw new Error(`${field} must be an HTTPS URL.`)
  }
}

function optionalHttpsUrl(value, field) {
  if (
    value === undefined ||
    value === null ||
    value === ''
  ) {
    return null
  }
  return httpsUrl(value, field)
}

function record(value, field) {
  if (
    !value ||
    typeof value !== 'object' ||
    Array.isArray(value)
  ) {
    throw new Error(`${field} must be an object.`)
  }
  return value
}

function feature(value, field) {
  const item = record(value, field)
  const title = text(item.title, `${field}.title`, 140)
  return {
    title,
    description: text(
      item.description,
      `${field}.description`,
      600
    ),
    href: httpsUrl(item.href, `${field}.href`),
    imageUrl: optionalHttpsUrl(
      item.imageUrl,
      `${field}.imageUrl`
    ),
    imageAlt: item.imageUrl
      ? text(
          item.imageAlt || title,
          `${field}.imageAlt`,
          180
        )
      : null,
  }
}

function opportunity(value, index) {
  const item = record(value, `opportunities[${index}]`)
  return {
    title: text(
      item.title,
      `opportunities[${index}].title`,
      140
    ),
    description: text(
      item.description,
      `opportunities[${index}].description`,
      420
    ),
    deadline: text(
      item.deadline,
      `opportunities[${index}].deadline`,
      80
    ),
    href: httpsUrl(
      item.href,
      `opportunities[${index}].href`
    ),
  }
}

function normalizeMonthlyNewsletter(value) {
  const newsletter = record(value, 'newsletter')
  if (!Array.isArray(newsletter.opening)) {
    throw new Error('opening must be an array.')
  }
  if (
    newsletter.opening.length === 0 ||
    newsletter.opening.length > MAX_OPENING_PARAGRAPHS
  ) {
    throw new Error(
      `opening must contain 1 to ${MAX_OPENING_PARAGRAPHS} paragraphs.`
    )
  }
  if (!Array.isArray(newsletter.opportunities)) {
    throw new Error('opportunities must be an array.')
  }
  if (
    newsletter.opportunities.length === 0 ||
    newsletter.opportunities.length > MAX_OPPORTUNITIES
  ) {
    throw new Error(
      `opportunities must contain 1 to ${MAX_OPPORTUNITIES} items.`
    )
  }

  return {
    name: text(newsletter.name, 'name', 100),
    subject: text(newsletter.subject, 'subject', 160),
    preview: text(newsletter.preview, 'preview', 180),
    title: text(newsletter.title, 'title', 140),
    opening: newsletter.opening.map((paragraph, index) =>
      text(paragraph, `opening[${index}]`, 700)
    ),
    featuredArticle: feature(
      newsletter.featuredArticle,
      'featuredArticle'
    ),
    featuredProject: feature(
      newsletter.featuredProject,
      'featuredProject'
    ),
    opportunities:
      newsletter.opportunities.map(opportunity),
  }
}

module.exports = {
  MAX_OPPORTUNITIES,
  normalizeMonthlyNewsletter,
}
