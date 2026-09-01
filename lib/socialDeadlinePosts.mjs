export const CAROUSEL_WIDTH = 1080
export const CAROUSEL_HEIGHT = 1350
export const DEADLINE_WINDOW_DAYS = 30
export const MAX_INSTAGRAM_CAROUSEL_ASSETS = 10
export const MAX_OPPORTUNITIES_PER_CAROUSEL =
  MAX_INSTAGRAM_CAROUSEL_ASSETS - 1

function validDate(value) {
  const date =
    value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

function isoDate(value) {
  const date = validDate(value)
  return date ? date.toISOString() : null
}

function twoDigits(value) {
  return String(value).padStart(2, '0')
}

function dateKey(value) {
  const date = validDate(value)
  if (!date) throw new Error('A valid date is required.')
  return [
    date.getUTCFullYear(),
    twoDigits(date.getUTCMonth() + 1),
    twoDigits(date.getUTCDate()),
  ].join('-')
}

function deadlineTime(opportunity) {
  return (
    validDate(opportunity.applicationDeadline)?.getTime() ??
    Infinity
  )
}

function text(value, maxLength) {
  const normalized = String(value || '')
    .replace(/\s+/g, ' ')
    .trim()
  if (normalized.length <= maxLength) return normalized
  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`
}

export function startOfUtcWeek(value = new Date()) {
  const date = validDate(value)
  if (!date) throw new Error('A valid date is required.')
  const start = new Date(
    Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate()
    )
  )
  const weekday = start.getUTCDay() || 7
  start.setUTCDate(start.getUTCDate() - weekday + 1)
  return start
}

export function deadlineWindow(value = new Date()) {
  const start = validDate(value)
  if (!start) throw new Error('A valid date is required.')
  const end = new Date(start)
  end.setUTCDate(end.getUTCDate() + DEADLINE_WINDOW_DAYS)
  return { start, end }
}

export function deadlineCarouselPostId(
  value = new Date(),
  part = null
) {
  const id = `opportunity-deadlines-${dateKey(
    startOfUtcWeek(value)
  )}`
  return part ? `${id}-part-${part}` : id
}

export function formatDeadline(value) {
  const date = validDate(value)
  if (!date) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function formatWeek(value) {
  const date = validDate(value)
  if (!date) return null
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

export function selectUpcomingOpportunities(
  opportunities,
  now = new Date()
) {
  const { start, end } = deadlineWindow(now)
  return opportunities
    .filter((opportunity) => {
      const deadline = validDate(
        opportunity.applicationDeadline
      )
      return (
        opportunity.deadlineStatus === 'dated' &&
        deadline &&
        deadline >= start &&
        deadline < end
      )
    })
    .sort((a, b) => deadlineTime(a) - deadlineTime(b))
}

function fieldsForSlide(opportunity) {
  return Array.isArray(opportunity.fields)
    ? opportunity.fields
        .map((field) => text(field, 30))
        .filter(Boolean)
        .slice(0, 3)
    : []
}

export function createDeadlineCarousels(
  opportunities,
  { now = new Date() } = {}
) {
  const selected = selectUpcomingOpportunities(
    opportunities,
    now
  )
  if (selected.length === 0) return []

  const weekStart = startOfUtcWeek(now)
  const window = deadlineWindow(now)
  const totalParts = Math.ceil(
    selected.length / MAX_OPPORTUNITIES_PER_CAROUSEL
  )

  return Array.from({ length: totalParts }, (_, index) => {
    const part = index + 1
    const partOpportunities = selected.slice(
      index * MAX_OPPORTUNITIES_PER_CAROUSEL,
      part * MAX_OPPORTUNITIES_PER_CAROUSEL
    )
    const slides = [
      {
        type: 'cover',
        week: formatWeek(weekStart),
        deadlineWindow: `Next ${DEADLINE_WINDOW_DAYS} days`,
        programCount: partOpportunities.length,
        part: totalParts > 1 ? part : null,
        totalParts: totalParts > 1 ? totalParts : null,
      },
      ...partOpportunities.map((opportunity) => ({
        type: 'opportunity',
        slug: text(opportunity.slug, 120),
        name: text(opportunity.name, 90),
        deadline: isoDate(opportunity.applicationDeadline),
        fields: fieldsForSlide(opportunity),
      })),
    ]

    const partCaption =
      totalParts > 1
        ? ` This is part ${part} of ${totalParts}.`
        : ''
    return {
      id: deadlineCarouselPostId(
        now,
        totalParts > 1 ? part : null
      ),
      weekStart: weekStart.toISOString(),
      deadlineWindowStart: window.start.toISOString(),
      deadlineWindowEnd: window.end.toISOString(),
      slides,
      caption:
        `Program deadlines are coming up in the next ${DEADLINE_WINDOW_DAYS} days.` +
        partCaption +
        ' Swipe from the closest deadline to the latest, then explore every opportunity at sciteens.com/opportunities.\n\n' +
        '#SciTeens #STEMOpportunities #HighSchoolResearch',
    }
  })
}

export function carouselAssetUrls(siteUrl, postId, slides) {
  const baseUrl = new URL(siteUrl)
  if (baseUrl.protocol !== 'https:') {
    throw new Error('SITE_URL must use HTTPS.')
  }

  return slides.map((_, index) =>
    new URL(
      `/api/social/deadline-carousel/${encodeURIComponent(
        postId
      )}/${index}`,
      baseUrl
    ).toString()
  )
}

export function carouselAltText(slide) {
  if (slide.type === 'cover') {
    return `SciTeens upcoming program deadlines for the week of ${slide.week}.`
  }
  const deadline = formatDeadline(slide.deadline)
  return `${slide.name}. Application deadline: ${deadline}.`
}
