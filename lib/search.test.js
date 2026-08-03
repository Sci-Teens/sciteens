import { describe, expect, it } from 'vitest'
import {
  HIGHLIGHT_POST_TAG,
  HIGHLIGHT_PRE_TAG,
  RANKING_SCORE_THRESHOLD,
  buildProjectSearchFilter,
  buildProjectSearchParams,
  buildProjectSearchQueries,
  formatFieldFacets,
  mapSearchHitToProject,
  requiresSearchIndex,
  splitHighlightedText,
} from './search'

const mark = (text) =>
  `${HIGHLIGHT_PRE_TAG}${text}${HIGHLIGHT_POST_TAG}`

describe('buildProjectSearchFilter', () => {
  it('returns undefined with no constraints', () => {
    expect(buildProjectSearchFilter({})).toBeUndefined()
    expect(buildProjectSearchFilter()).toBeUndefined()
  })

  it('builds a field-only filter', () => {
    expect(
      buildProjectSearchFilter({ field: 'Biology' })
    ).toBe('fields_facet = "Biology"')
  })

  it('escapes embedded quotes in field', () => {
    expect(
      buildProjectSearchFilter({ field: 'Foo"Bar' })
    ).toBe('fields_facet = "Foo\\"Bar"')
  })

  // A trailing backslash would otherwise escape the closing quote and
  // let the rest of the expression fall outside the string literal.
  it('escapes backslashes in field before quotes', () => {
    expect(
      buildProjectSearchFilter({ field: 'Foo\\' })
    ).toBe('fields_facet = "Foo\\\\"')
    expect(
      buildProjectSearchFilter({
        field: 'Foo\\" OR date > 0 OR "',
      })
    ).toBe('fields_facet = "Foo\\\\\\" OR date > 0 OR \\""')
  })

  it('builds a date range filter in unix ms', () => {
    const filter = buildProjectSearchFilter({
      dateFrom: '2024-01-01T00:00:00.000Z',
      dateTo: '2024-06-01T00:00:00.000Z',
    })
    expect(filter).toBe(
      'date >= 1704067200000 AND date <= 1717200000000'
    )
  })

  it('combines field and date constraints with AND', () => {
    const filter = buildProjectSearchFilter({
      field: 'Physics',
      dateFrom: '2024-01-01T00:00:00.000Z',
    })
    expect(filter).toBe(
      'fields_facet = "Physics" AND date >= 1704067200000'
    )
  })

  it('ignores an unparseable date', () => {
    expect(
      buildProjectSearchFilter({ dateFrom: 'not-a-date' })
    ).toBeUndefined()
  })
})

describe('requiresSearchIndex', () => {
  it('is false with no search text or dates', () => {
    expect(requiresSearchIndex({})).toBe(false)
    expect(requiresSearchIndex({ field: 'Biology' })).toBe(
      false
    )
  })

  it('is false for whitespace-only search text', () => {
    expect(requiresSearchIndex({ search: '   ' })).toBe(
      false
    )
  })

  it('is true once free-text search is present', () => {
    expect(requiresSearchIndex({ search: 'dna' })).toBe(
      true
    )
  })

  it('is true once a date bound is present', () => {
    expect(
      requiresSearchIndex({ dateFrom: '2024-01-01' })
    ).toBe(true)
    expect(
      requiresSearchIndex({ dateTo: '2024-01-01' })
    ).toBe(true)
  })

  // Firestore would need a composite (fields array-contains-any +
  // upvote_count) index to answer this; the search index already sorts on
  // upvote_count.
  it('is true for the upvote ordering, but not for date orderings', () => {
    expect(requiresSearchIndex({ sort: 'upvotes' })).toBe(
      true
    )
    expect(requiresSearchIndex({ sort: 'newest' })).toBe(
      false
    )
  })
})

describe('buildProjectSearchParams', () => {
  it('defaults to an empty query and page 0', () => {
    const params = buildProjectSearchParams()
    expect(params.q).toBe('')
    expect(params.offset).toBe(0)
    expect(params.filter).toBeUndefined()
  })

  it('paginates via limit/offset', () => {
    const params = buildProjectSearchParams({
      page: 2,
      hitsPerPage: 12,
    })
    expect(params.limit).toBe(12)
    expect(params.offset).toBe(24)
  })

  it('maps sort=newest/oldest to a Meilisearch sort array', () => {
    expect(
      buildProjectSearchParams({
        search: 'dna',
        sort: 'newest',
      }).sort
    ).toEqual(['date:desc'])
    expect(
      buildProjectSearchParams({
        search: 'dna',
        sort: 'oldest',
      }).sort
    ).toEqual(['date:asc'])
  })

  it('breaks upvote ties by date so the ordering is total', () => {
    expect(
      buildProjectSearchParams({ sort: 'upvotes' }).sort
    ).toEqual(['upvote_count:desc', 'date:desc'])
  })

  it('omits sort for relevance once there is query text', () => {
    expect(
      buildProjectSearchParams({ search: 'dna' }).sort
    ).toBeUndefined()
  })

  // Relevance cannot order an empty query, and Meilisearch then answers in
  // internal document order — which looks random to someone who only
  // picked a date range.
  it('falls back to newest-first when there is no query text', () => {
    expect(buildProjectSearchParams().sort).toEqual([
      'date:desc',
    ])
    expect(
      buildProjectSearchParams({ search: '   ' }).sort
    ).toEqual(['date:desc'])
  })

  it('requests highlighting with non-HTML sentinels', () => {
    const params = buildProjectSearchParams({
      search: 'dna',
    })
    expect(params.attributesToHighlight).toEqual([
      'title',
      'abstract',
    ])
    expect(params.highlightPreTag).toBe(HIGHLIGHT_PRE_TAG)
    expect(params.highlightPostTag).toBe(HIGHLIGHT_POST_TAG)
    expect(/[<>]/.test(HIGHLIGHT_PRE_TAG)).toBe(false)
    expect(/[<>]/.test(HIGHLIGHT_POST_TAG)).toBe(false)
  })

  it('applies the relevance floor', () => {
    expect(
      buildProjectSearchParams({ search: 'dna' })
        .rankingScoreThreshold
    ).toBe(RANKING_SCORE_THRESHOLD)
  })
})

describe('buildProjectSearchQueries', () => {
  it('pairs the hits query with a hit-free facet query', () => {
    const [hits, facets] = buildProjectSearchQueries({
      search: 'dna',
    })
    expect(hits.indexUid).toBe('projects')
    expect(hits.limit).toBeGreaterThan(0)
    expect(facets.indexUid).toBe('projects')
    expect(facets.limit).toBe(0)
    expect(facets.facets).toEqual(['fields_facet'])
  })

  // The whole point: counted against the topic-filtered hits, every other
  // topic reads 0 and the sidebar becomes a dead end.
  it('keeps the query and dates but drops the topic from the facet filter', () => {
    const [hits, facets] = buildProjectSearchQueries({
      search: 'dna',
      field: 'Biology',
      dateFrom: '2024-01-01',
    })
    expect(hits.filter).toContain(
      'fields_facet = "Biology"'
    )
    expect(hits.filter).toContain('date >=')
    expect(facets.q).toBe('dna')
    expect(facets.filter).not.toContain('fields_facet')
    expect(facets.filter).toContain('date >=')
  })

  it('scores the facet query on the same floor as the hits', () => {
    const [, facets] = buildProjectSearchQueries({
      search: 'dna',
    })
    expect(facets.rankingScoreThreshold).toBe(
      RANKING_SCORE_THRESHOLD
    )
  })

  // The facet query is built as a fresh literal, not spread from the hits
  // query. The obvious refactor to `{ indexUid, ...hits, limit: 0 }` would
  // pass every other test here while shipping a sort, an offset and crop
  // work onto a query that returns no hits.
  it('carries no hits-only parameters onto the facet query', () => {
    const [, facets] = buildProjectSearchQueries({
      search: 'dna',
      sort: 'upvotes',
      page: 2,
    })
    expect(facets.sort).toBeUndefined()
    expect(facets.offset).toBeUndefined()
    expect(facets.attributesToCrop).toBeUndefined()
    expect(facets.attributesToHighlight).toBeUndefined()
  })
})

describe('splitHighlightedText', () => {
  it('returns nothing for a missing or empty value', () => {
    expect(splitHighlightedText(undefined)).toEqual([])
    expect(splitHighlightedText('')).toEqual([])
    expect(splitHighlightedText(null)).toEqual([])
  })

  it('returns one plain run when nothing matched', () => {
    expect(splitHighlightedText('no matches here')).toEqual(
      [{ text: 'no matches here', match: false }]
    )
  })

  it('splits marked terms out of the surrounding text', () => {
    expect(
      splitHighlightedText(
        `A study of ${mark('DNA')} in ${mark('plants')}`
      )
    ).toEqual([
      { text: 'A study of ', match: false },
      { text: 'DNA', match: true },
      { text: ' in ', match: false },
      { text: 'plants', match: true },
    ])
  })

  // A crop can cut the closing sentinel off. Rendering a stray control
  // character is worse than losing the mark.
  it('drops an unclosed sentinel instead of rendering it', () => {
    expect(
      splitHighlightedText(
        `abstract ${HIGHLIGHT_PRE_TAG}DNA`
      )
    ).toEqual([{ text: 'abstract DNA', match: false }])
  })

  it('drops a stray closing sentinel with no opener', () => {
    expect(
      splitHighlightedText(`a${HIGHLIGHT_POST_TAG}b`)
    ).toEqual([{ text: 'ab', match: false }])
  })

  it('recovers when a closing sentinel precedes an opening one', () => {
    expect(
      splitHighlightedText(
        `a${HIGHLIGHT_POST_TAG}b${mark('c')}d`
      )
    ).toEqual([
      { text: 'ab', match: false },
      { text: 'c', match: true },
      { text: 'd', match: false },
    ])
  })

  it('emits no empty run for a zero-length match', () => {
    expect(
      splitHighlightedText(
        `a${HIGHLIGHT_PRE_TAG}${HIGHLIGHT_POST_TAG}b`
      )
    ).toEqual([
      { text: 'a', match: false },
      { text: 'b', match: false },
    ])
    expect(
      splitHighlightedText(
        `${HIGHLIGHT_PRE_TAG}${HIGHLIGHT_POST_TAG}`
      )
    ).toEqual([])
  })

  // The invariant the whole sentinel scheme rests on: a control character
  // that reached project text must never be rendered, and a literal one
  // mis-anchors the scan so it can land inside a MATCH run, not just a
  // plain one.
  it('never returns a sentinel in any run, matched or not', () => {
    const hostile = `A${HIGHLIGHT_PRE_TAG}B ${mark('DNA')}`
    for (const segment of splitHighlightedText(hostile)) {
      expect(segment.text).not.toContain(HIGHLIGHT_PRE_TAG)
      expect(segment.text).not.toContain(HIGHLIGHT_POST_TAG)
    }
  })
})

describe('mapSearchHitToProject', () => {
  it('passes through falsy input unchanged', () => {
    expect(mapSearchHitToProject(null)).toBeNull()
  })

  it('normalizes a hit into ProjectCard shape', () => {
    const project = mapSearchHitToProject({
      id: 'abc123',
      title: 'DNA Origami',
      abstract: 'A study of <b>DNA</b> folding.',
      project_photo: 'https://example.com/photo.jpg',
      fields: ['Biology'],
      member_arr: [{ uid: 'u1', display: 'Ada' }],
      date: 1700000000000,
    })
    expect(project).toMatchObject({
      id: 'abc123',
      title: 'DNA Origami',
      abstract: 'A study of DNA folding.',
      project_photo: 'https://example.com/photo.jpg',
      fields: ['Biology'],
      member_arr: [{ uid: 'u1', display: 'Ada' }],
      date: 1700000000000,
    })
  })

  // title/abstract feed alt text, aria-labels and meta descriptions, so the
  // marked-up copies have to live somewhere else.
  it('keeps highlights beside the plain title and abstract', () => {
    const project = mapSearchHitToProject({
      id: 'abc123',
      title: 'DNA Origami',
      abstract: 'Full abstract text goes on for a while.',
      _formatted: {
        title: `${mark('DNA')} Origami`,
        abstract: `Full ${mark('abstract')}…`,
      },
    })
    expect(project.title).toBe('DNA Origami')
    expect(project.abstract).toBe(
      'Full abstract text goes on for a while.'
    )
    expect(project.highlight.title).toBe(
      `${mark('DNA')} Origami`
    )
    expect(project.highlight.abstract).toBe(
      `Full ${mark('abstract')}…`
    )
  })

  it('nulls the highlights when Meilisearch returned none', () => {
    const project = mapSearchHitToProject({
      id: 'abc123',
      title: 'DNA Origami',
    })
    expect(project.highlight).toEqual({
      title: null,
      abstract: null,
    })
  })
})

describe('formatFieldFacets', () => {
  it('returns an empty list when the distribution is missing', () => {
    expect(formatFieldFacets(undefined)).toEqual([])
    expect(formatFieldFacets({})).toEqual([])
  })

  it('sorts by count desc, then field name asc', () => {
    expect(
      formatFieldFacets({
        fields_facet: {
          Chemistry: 3,
          Biology: 5,
          Physics: 5,
        },
      })
    ).toEqual([
      { field: 'Biology', count: 5 },
      { field: 'Physics', count: 5 },
      { field: 'Chemistry', count: 3 },
    ])
  })
})
