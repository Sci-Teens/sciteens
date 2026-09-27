import { describe, expect, it } from 'vitest'

import {
  carouselAltText,
  carouselAssetUrls,
  createDeadlineCarousels,
  deadlineCaption,
  deadlineCarouselPostId,
  selectUpcomingOpportunities,
  startOfUtcWeek,
} from './socialDeadlinePosts.mjs'

const NOW = new Date('2026-08-31T12:00:00.000Z')

function opportunity(slug, deadline) {
  return {
    slug,
    name: `${slug} Summer Program`,
    about: `A hands-on ${slug} program for students who want to explore STEM research.`,
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
          description:
            'A hands-on soonest program for students who want to explore STEM research.',
          deadline: '2026-09-02T00:00:00.000Z',
        },
        {
          type: 'opportunity',
          slug: 'later',
        },
      ],
    })
    expect(carousel.caption).toContain(
      'sciteens.org/opportunities'
    )
    expect(
      deadlineCaption(carousel, 'instagram')
    ).toContain("The link's in our bio.")
    expect(deadlineCaption(carousel, 'facebook')).toContain(
      'sciteens.org/opportunities'
    )
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

describe('deadlineCaption', () => {
  it('rotates through twelve weekly openers and repeats reruns exactly', () => {
    const captions = Array.from(
      { length: 12 },
      (_, index) => {
        const now = new Date(NOW)
        now.setUTCDate(now.getUTCDate() + index * 7)
        const deadline = new Date(now)
        deadline.setUTCDate(deadline.getUTCDate() + 20)
        const programs = [
          opportunity('research', deadline.toISOString()),
        ]
        const [carousel] = createDeadlineCarousels(
          programs,
          { now }
        )
        const [rerun] = createDeadlineCarousels(programs, {
          now,
        })
        const caption = deadlineCaption(
          carousel,
          'instagram'
        )

        expect(deadlineCaption(rerun, 'instagram')).toBe(
          caption
        )
        expect(caption).toContain(
          '1 program deadline in the next 30 days.'
        )
        expect(caption).not.toMatch(
          /fall in the week|this week/i
        )
        return caption
      }
    )

    expect(
      new Set(
        captions.map((caption) => caption.split('\n')[0])
      ).size
    ).toBe(12)
  })

  it('varies consecutive parts and uses only each part’s program metadata', () => {
    const programs = Array.from(
      { length: 10 },
      (_, index) => ({
        ...opportunity(
          `program-${index}`,
          new Date(
            Date.UTC(2026, 8, index + 1)
          ).toISOString()
        ),
        locationState:
          index < 9 ? 'Michigan' : 'California',
        locationCountry: 'United States',
        gradeRangeLow: 9,
        gradeRangeHigh: 12,
        programType: 'Summer Program',
      })
    )
    const [first, second] = createDeadlineCarousels(
      programs,
      { now: NOW }
    )
    const firstCaption = deadlineCaption(first, 'instagram')
    const secondCaption = deadlineCaption(
      second,
      'instagram'
    )

    expect(firstCaption.split('\n')[0]).not.toBe(
      secondCaption.split('\n')[0]
    )
    expect(firstCaption).toContain(
      '9 program deadlines in the next 30 days. Part 1 of 2.'
    )
    expect(secondCaption).toContain(
      '1 program deadline in the next 30 days. Part 2 of 2.'
    )
    expect(firstCaption).toMatch(/#Michigan\w*/)
    expect(firstCaption).not.toMatch(/#California\w*/)
    expect(secondCaption).toMatch(/#California\w*/)
    expect(secondCaption).not.toMatch(/#Michigan\w*/)
    expect(second.slides[1]).toMatchObject({
      locationState: 'California',
      locationCountry: 'United States',
      programType: 'Summer Program',
      gradeRangeLow: 9,
      gradeRangeHigh: 12,
    })
  })

  it('features program names and gives each platform its application route', () => {
    const [carousel] = createDeadlineCarousels(
      [
        opportunity('biology', '2026-09-02T00:00:00.000Z'),
        opportunity('robotics', '2026-09-03T00:00:00.000Z'),
        opportunity(
          'chemistry',
          '2026-09-04T00:00:00.000Z'
        ),
      ],
      { now: NOW }
    )
    const instagram = deadlineCaption(carousel, 'instagram')
    const facebook = deadlineCaption(carousel, 'facebook')

    expect(instagram).toContain(
      'Featured: biology Summer Program and robotics Summer Program, plus more.'
    )
    expect(instagram).toContain("The link's in our bio.")
    expect(instagram).not.toContain('https://')
    expect(facebook).toContain(
      'https://sciteens.org/opportunities'
    )
    expect(facebook).not.toContain('in our bio')
    expect(carousel.caption).toBe(facebook)
  })

  it('keeps captions bounded with oversized program names and metadata', () => {
    const [carousel] = createDeadlineCarousels(
      Array.from({ length: 9 }, (_, index) => ({
        ...opportunity(
          `program-${index}`,
          '2026-09-02T00:00:00.000Z'
        ),
        name: 'Long program name '.repeat(500),
        fields: ['Biology'.repeat(500)],
        location: 'Long location '.repeat(500),
        locationState: 'Michigan'.repeat(500),
        programType: 'Summer program '.repeat(500),
      })),
      { now: NOW }
    )
    const caption = deadlineCaption(carousel, 'instagram')

    expect(caption.length).toBeLessThanOrEqual(2200)
    expect(caption).toContain('Featured: Long program name')
    expect(caption).toContain("The link's in our bio.")
    expect(caption).not.toContain('undefined')
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
        'https://sciteens.org',
        'opportunity-deadlines-2026-08-31',
        [{}, {}, {}]
      )
    ).toEqual([
      'https://sciteens.org/api/social/deadline-carousel/opportunity-deadlines-2026-08-31/0',
      'https://sciteens.org/api/social/deadline-carousel/opportunity-deadlines-2026-08-31/1',
      'https://sciteens.org/api/social/deadline-carousel/opportunity-deadlines-2026-08-31/2',
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
