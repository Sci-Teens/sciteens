import { afterEach, describe, expect, it, vi } from 'vitest'

const {
  indexOpportunity,
  indexProject,
  opportunityLocationFacets,
  toOpportunitySearchDocument,
  toSearchDocument,
} = require('./search')
const realFetch = globalThis.fetch

afterEach(() => {
  globalThis.fetch = realFetch
  delete process.env.MEILI_HOST
  delete process.env.MEILI_MASTER_KEY
  vi.restoreAllMocks()
})

describe('toSearchDocument', () => {
  it('maps a project into the indexed shape', () => {
    expect(
      toSearchDocument('p1', {
        title: 'DNA Origami',
        abstract: 'A study of <b>DNA</b>&nbsp;folding.',
        project_photo: 'https://example.com/p.jpg',
        fields: ['Biology'],
        member_arr: [
          { uid: 'u1', display: 'Ada Lovelace' },
        ],
        date: '2024-03-11T00:00:00.000Z',
        upvote_count: 7,
      })
    ).toEqual({
      id: 'p1',
      title: 'DNA Origami',
      abstract: 'A study of DNA folding.',
      project_photo: 'https://example.com/p.jpg',
      fields: ['Biology'],
      fields_facet: ['Biology'],
      member_arr: [{ uid: 'u1', display: 'Ada Lovelace' }],
      member_names: ['Ada Lovelace'],
      date: 1710115200000,
      upvote_count: 7,
    })
  })

  // Without this attribute a search for a student or mentor's name returns
  // nothing at all, since member_arr itself is not searchable.
  it('flattens member display names, deduped and trimmed', () => {
    expect(
      toSearchDocument('p2', {
        member_arr: [
          { uid: 'u1', display: '  Ada Lovelace ' },
          { uid: 'u2', display: 'Ada Lovelace' },
          { uid: 'u3', display: 'Grace Hopper' },
        ],
      }).member_names
    ).toEqual(['Ada Lovelace', 'Grace Hopper'])
  })

  // Legacy project docs predate the current member shape, so the mapper is
  // fed entries that are not objects at all. A regression from `member?.display`
  // to `member.display` throws on these.
  it('skips members with no usable display name', () => {
    expect(
      toSearchDocument('p3', {
        member_arr: [
          { uid: 'u1' },
          { uid: 'u2', display: '' },
          { uid: 'u3', display: '   ' },
          { uid: 'u4', display: 42 },
          { uid: 'u5', display: {} },
          null,
          undefined,
          'legacy-uid-string',
          7,
        ],
      }).member_names
    ).toEqual([])
  })

  // The refactor that introduced member_names hoisted this fallback out of
  // the return object; a non-array member_arr must still reach `members`.
  it('falls back to `members` when member_arr is not an array', () => {
    expect(
      toSearchDocument('p3b', {
        member_arr: { u1: 'not an array' },
        members: [{ uid: 'u1', display: 'Grace Hopper' }],
      })
    ).toMatchObject({
      member_arr: [{ uid: 'u1', display: 'Grace Hopper' }],
      member_names: ['Grace Hopper'],
    })
  })

  it('reads member names off the legacy `members` key', () => {
    expect(
      toSearchDocument('p4', {
        members: [{ uid: 'u1', display: 'Ada Lovelace' }],
      }).member_names
    ).toEqual(['Ada Lovelace'])
  })

  it('folds legacy lowercase fields into one facet bucket', () => {
    const doc = toSearchDocument('p5', {
      fields: ['biology', 'Biology', 'computer science'],
    })
    expect(doc.fields).toEqual([
      'biology',
      'Biology',
      'computer science',
    ])
    expect(doc.fields_facet).toEqual([
      'Biology',
      'Computer Science',
    ])
  })
})

describe('toOpportunitySearchDocument', () => {
  it('maps searchable student fit fields without private pipeline data', () => {
    const document = toOpportunitySearchDocument('global', {
      name: 'Global <Research>',
      about: 'Study <b>biology</b>&nbsp;abroad.',
      location: 'Cambridge, MA',
      sourceCategory: 'University research programs',
      startDate: '2027-06-01T00:00:00.000Z',
      applicationDeadline: {
        toMillis: () => 1800000000000,
      },
      deadlineStatus: 'dated',
      gradeRangeLow: 8,
      gradeRangeHigh: 11,
      fields: ['biology', 'Computer Science'],
      eligibilityNotes: 'High school students',
      cost: 'Free',
      financialAid: 'Program is Free',
      stipend: 'Not specified',
      programType: 'Research Experience',
      durationText: 'Six weeks',
      residential: 'Residential',
      contactEmail: 'private@example.com',
      reasoning: 'Private pipeline note',
      consultedPages: [{ url: 'https://example.com' }],
    })

    expect(document).toMatchObject({
      id: 'global',
      name: 'Global <Research>',
      about: 'Study biology abroad.',
      location: 'Cambridge, MA',
      location_facets: ['Massachusetts', 'Cambridge'],
      grade_levels: [9, 10, 11],
      fields_facet: ['Biology', 'Computer Science'],
      applicationDeadline: 1800000000000,
      programType: 'Research Experience',
    })
    expect(document.contactEmail).toBeUndefined()
    expect(document.reasoning).toBeUndefined()
    expect(document.consultedPages).toBeUndefined()
    expect(document.sourceCategory).toBeUndefined()
  })

  it('uses international source categories and future location segments', () => {
    expect(
      opportunityLocationFacets('Unsure', 'Australia')
    ).toEqual(['Australia'])
    expect(
      opportunityLocationFacets('', 'Singapore')
    ).toEqual(['Singapore'])
    expect(
      opportunityLocationFacets('Nairobi, Kenya', '')
    ).toEqual(['Nairobi', 'Kenya'])
  })

  it('does not treat West Virginia as Virginia', () => {
    expect(
      opportunityLocationFacets(
        'Charleston, West Virginia',
        ''
      )
    ).toEqual(['West Virginia', 'Charleston'])
  })

  it('normalizes remote and United States locations', () => {
    expect(
      opportunityLocationFacets(
        'Remote; Washington, DC',
        'USA (general)'
      )
    ).toEqual([
      'Virtual',
      'District of Columbia',
      'Washington',
      'United States',
    ])
  })
})

describe('opportunity index sync', () => {
  it('writes opportunity documents with the server master key', async () => {
    process.env.MEILI_HOST = 'https://search.example'
    process.env.MEILI_MASTER_KEY = 'secret'
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ taskUid: 44 }, { status: 202 })
      )
      .mockResolvedValueOnce(
        Response.json({ taskUid: 44, status: 'succeeded' })
      )

    await indexOpportunity('global', {
      name: 'Global Program',
      location: 'Singapore',
    })

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      1,
      'https://search.example/indexes/opportunities/documents',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer secret',
        }),
      })
    )
    const request = globalThis.fetch.mock.calls[0][1]
    expect(JSON.parse(request.body)[0]).toMatchObject({
      id: 'global',
      location_facets: ['Singapore'],
    })
  })
})

describe('Meilisearch mutation acknowledgement', () => {
  it('polls a mutation task until it succeeds', async () => {
    process.env.MEILI_HOST = 'https://search.example'
    process.env.MEILI_MASTER_KEY = 'secret'
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ taskUid: 42 }, { status: 202 })
      )
      .mockResolvedValueOnce(
        Response.json({ taskUid: 42, status: 'succeeded' })
      )

    await indexProject('p1', { title: 'Safe' })

    expect(globalThis.fetch).toHaveBeenNthCalledWith(
      2,
      'https://search.example/tasks/42',
      expect.any(Object)
    )
  })

  it('rejects a failed asynchronous mutation for retry', async () => {
    process.env.MEILI_HOST = 'https://search.example'
    process.env.MEILI_MASTER_KEY = 'secret'
    globalThis.fetch = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({ taskUid: 43 }, { status: 202 })
      )
      .mockResolvedValueOnce(
        Response.json({
          taskUid: 43,
          status: 'failed',
          error: { message: 'index unavailable' },
        })
      )

    await expect(
      indexProject('p1', { title: 'Safe' })
    ).rejects.toThrow('Meilisearch task 43 failed')
  })
})
