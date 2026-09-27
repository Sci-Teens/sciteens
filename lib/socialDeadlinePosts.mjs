import { opportunityHashtags } from './socialOpportunityHashtags.mjs'

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

const CAPTION_OPENERS = [
  'What will you explore next?',
  'Your next opportunity starts with a shortlist.',
  'Make room on your calendar for something new.',
  'Looking for a program that fits your interests?',
  'A little planning now can open up your next step.',
  'Turn your curiosity into an application plan.',
  'Ready to take an interest further?',
  'Start with the possibilities. Then check the deadlines.',
  'Still exploring your options? Start here.',
  'Bring your next application into focus.',
  'Find a program worth making time for.',
  'Explore a new skill or subject. Start with the possibilities.',
]

const CAPTION_ACTIONS = [
  'Review the program details and check who can apply.',
  'Pick a program that interests you and review its requirements.',
  'Check the dates before adding a program to your shortlist.',
  'Review eligibility and give yourself time to prepare.',
  'Explore the options and plan your next application step.',
]

function captionSequence(carousel) {
  const week = Math.floor(
    startOfUtcWeek(carousel.weekStart).getTime() /
      (7 * 24 * 60 * 60 * 1000)
  )
  return week + (carousel.slides[0].part || 1) - 1
}

export function deadlineCaption(carousel, service) {
  const cover = carousel.slides[0]
  const count = cover.programCount
  const sequence = captionSequence(carousel)
  const pick = (items) =>
    items[
      ((sequence % items.length) + items.length) %
        items.length
    ]
  const opportunities = carousel.slides.filter(
    (slide) => slide.type === 'opportunity'
  )
  const names = opportunities
    .slice(0, 2)
    .map((slide) => text(slide.name, 90))
    .filter(Boolean)
  const featured = names.length
    ? `Featured: ${names.join(' and ')}${
        count > names.length ? ', plus more' : ''
      }.`
    : ''
  const deadlineLabel =
    count === 1 ? 'deadline' : 'deadlines'
  const timing = `${count} program ${deadlineLabel} in the next ${DEADLINE_WINDOW_DAYS} days.`
  const partCaption = cover.part
    ? `Part ${cover.part} of ${cover.totalParts}.`
    : ''
  const link =
    service === 'instagram'
      ? "Swipe for details. The link's in our bio."
      : 'Browse details and application links: https://sciteens.org/opportunities.'

  return [
    pick(CAPTION_OPENERS),
    [timing, partCaption].filter(Boolean).join(' '),
    featured,
    `${pick(CAPTION_ACTIONS)} ${link}`,
    opportunityHashtags(opportunities, service).join(' '),
  ]
    .filter(Boolean)
    .join('\n\n')
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
        description: text(opportunity.about, 360),
        deadline: isoDate(opportunity.applicationDeadline),
        fields: fieldsForSlide(opportunity),
        location: text(opportunity.location, 160),
        locationState: text(opportunity.locationState, 80),
        locationCountry: text(
          opportunity.locationCountry,
          80
        ),
        programType: text(opportunity.programType, 60),
        gradeRangeLow: opportunity.gradeRangeLow ?? null,
        gradeRangeHigh: opportunity.gradeRangeHigh ?? null,
      })),
    ]

    return {
      id: deadlineCarouselPostId(
        now,
        totalParts > 1 ? part : null
      ),
      weekStart: weekStart.toISOString(),
      deadlineWindowStart: window.start.toISOString(),
      deadlineWindowEnd: window.end.toISOString(),
      slides,
      caption: deadlineCaption(
        {
          weekStart: weekStart.toISOString(),
          slides,
        },
        'facebook'
      ),
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
