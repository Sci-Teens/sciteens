import { describe, expect, it } from 'vitest'

import {
  carouselAltText,
  carouselAssetUrls,
  createDeadlineCarousels,
  deadlineCarouselPostId,
  selectUpcomingOpportunities,
  startOfUtcWeek,
} from './socialDeadlinePosts.mjs'

const NOW = new Date('2026-08-31T12:00:00.000Z')

function opportunity(slug, deadline) {
  return {
    slug,
    name: `${slug} Summer Program`,
    applicationDeadline: deadline,
    deadlineStatus: 'dated',
    fields: ['Biology', 'Research'],
  }
}

describe('selectUpcomingOpportunities', () => {
  it('keeps only the next 30 days in deadline order', () => {
    const selected = selectUpcomingOpportunities(
      [
        opportunity('later', '2026-09-22T00:00:00.000Z'),
        opportunity('expired', '2026-08-30T00:00:00.000Z'),
        opportunity('soonest', '2026-09-02T00:00:00.000Z'),
        opportunity(
          'outside-window',
          '2026-09-30T12:00:00.000Z'
        ),
        {
          ...opportunity(
            'rolling',
            '2026-09-01T00:00:00.000Z'
          ),
          deadlineStatus: 'rolling',
        },
      ],
      NOW
    )

    expect(selected.map(({ slug }) => slug)).toEqual([
      'soonest',
      'later',
    ])
  })

  it('keeps every eligible opportunity for carousel chunks', () => {
    const opportunities = Array.from(
      { length: 12 },
      (_, index) =>
        opportunity(
          `program-${index}`,
          new Date(
            Date.UTC(2026, 8, index + 1)
          ).toISOString()
        )
    )

    expect(
      selectUpcomingOpportunities(opportunities, NOW)
    ).toHaveLength(12)
  })
})

describe('createDeadlineCarousels', () => {
  it('adds a weekly cover before nearest-first opportunities', () => {
    const [carousel] = createDeadlineCarousels(
      [
        opportunity('later', '2026-09-22T00:00:00.000Z'),
        opportunity('soonest', '2026-09-02T00:00:00.000Z'),
      ],
      { now: NOW }
    )

    expect(carousel).toMatchObject({
      id: 'opportunity-deadlines-2026-08-31',
      slides: [
        {
          type: 'cover',
          week: 'August 31, 2026',
          programCount: 2,
        },
        {
          type: 'opportunity',
          slug: 'soonest',
          deadline: '2026-09-02T00:00:00.000Z',
        },
        {
          type: 'opportunity',
          slug: 'later',
        },
      ],
    })
    expect(carousel.caption).toContain('next 30 days')
  })

  it('splits every eligible deadline into ordered carousel parts', () => {
    const opportunities = Array.from(
      { length: 12 },
      (_, index) =>
        opportunity(
          `program-${index}`,
          new Date(
            Date.UTC(2026, 8, index + 1)
          ).toISOString()
        )
    )
    const carousels = createDeadlineCarousels(
      opportunities,
      {
        now: NOW,
      }
    )

    expect(carousels).toHaveLength(2)
    expect(carousels.map(({ id }) => id)).toEqual([
      'opportunity-deadlines-2026-08-31-part-1',
      'opportunity-deadlines-2026-08-31-part-2',
    ])
    expect(carousels.map(({ slides }) => slides)).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          expect.objectContaining({
            type: 'cover',
            part: 1,
            totalParts: 2,
            programCount: 9,
          }),
          expect.objectContaining({ slug: 'program-0' }),
          expect.objectContaining({ slug: 'program-8' }),
        ]),
        expect.arrayContaining([
          expect.objectContaining({
            type: 'cover',
            part: 2,
            totalParts: 2,
            programCount: 3,
          }),
          expect.objectContaining({ slug: 'program-9' }),
          expect.objectContaining({ slug: 'program-11' }),
        ]),
      ])
    )
  })

  it('returns no carousel when no dated deadline is current', () => {
    expect(
      createDeadlineCarousels(
        [
          opportunity(
            'expired',
            '2026-08-30T00:00:00.000Z'
          ),
        ],
        { now: NOW }
      )
    ).toEqual([])
  })
})

describe('carousel identity and asset URLs', () => {
  it('uses Monday as the stable weekly post key', () => {
    expect(startOfUtcWeek(NOW).toISOString()).toBe(
      '2026-08-31T00:00:00.000Z'
    )
    expect(deadlineCarouselPostId(NOW)).toBe(
      'opportunity-deadlines-2026-08-31'
    )
  })

  it('uses direct, ordered, encoded image URLs', () => {
    expect(
      carouselAssetUrls(
        'https://sciteens.com',
        'opportunity-deadlines-2026-08-31',
        [{}, {}, {}]
      )
    ).toEqual([
      'https://sciteens.com/api/social/deadline-carousel/opportunity-deadlines-2026-08-31/0',
      'https://sciteens.com/api/social/deadline-carousel/opportunity-deadlines-2026-08-31/1',
      'https://sciteens.com/api/social/deadline-carousel/opportunity-deadlines-2026-08-31/2',
    ])
  })

  it('describes the cover and each opportunity image', () => {
    expect(
      carouselAltText({
        type: 'cover',
        week: 'August 31, 2026',
      })
    ).toBe(
      'SciTeens upcoming program deadlines for the week of August 31, 2026.'
    )
    expect(
      carouselAltText({
        type: 'opportunity',
        name: 'Research Science Institute',
        deadline: '2026-09-02T00:00:00.000Z',
      })
    ).toBe(
      'Research Science Institute. Application deadline: Sep 2.'
    )
  })
})
