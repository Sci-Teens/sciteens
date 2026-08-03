import { describe, expect, it } from 'vitest'

const { toSearchDocument } = require('./search')

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
