import { describe, expect, it } from 'vitest'
import {
  filterArticles,
  filterCourses,
  parseQuery,
  toCorpusMap,
} from './contentSearch'

// The Prismic listings ran a network query per keystroke. These are the pure
// replacements, so the behaviour a reader sees on /articles is asserted here
// rather than against a CMS.

const summaries = [
  {
    slug: 'photosynthesis-basics',
    title: 'How Plants Eat Light',
    description: 'A look at leaves.',
    author: 'Ada L.',
    tags: ['Biology'],
  },
  {
    slug: 'black-holes',
    title: 'Black Holes Explained',
    description: 'Gravity wells and event horizons.',
    author: 'Bo K.',
    tags: ['Physics', 'Space Science'],
  },
  {
    slug: 'untagged-piece',
    title: 'Miscellany',
    description: 'No topic at all.',
    author: 'Cy R.',
    tags: [],
  },
]

describe('parseQuery', () => {
  it('splits on whitespace and lowercases', () => {
    expect(parseQuery('  Black   HOLES ')).toEqual([
      'black',
      'holes',
    ])
  })

  it('returns no terms for an empty query', () => {
    expect(parseQuery('')).toEqual([])
    expect(parseQuery(null)).toEqual([])
  })
})

describe('filterArticles', () => {
  it('returns everything when nothing is filtered', () => {
    expect(filterArticles(summaries, {})).toHaveLength(3)
  })

  it('matches on title, description, author and tag', () => {
    const bySlug = (search) =>
      filterArticles(summaries, { search }).map(
        (a) => a.slug
      )
    expect(bySlug('plants')).toEqual([
      'photosynthesis-basics',
    ])
    expect(bySlug('event horizons')).toEqual([
      'black-holes',
    ])
    expect(bySlug('Cy R.')).toEqual(['untagged-piece'])
    // Searching a topic name behaves like picking the topic chip.
    expect(bySlug('biology')).toEqual([
      'photosynthesis-basics',
    ])
  })

  // A multi-word query narrows. Widening it to OR would make almost every
  // search return the whole corpus.
  it('requires every term to match, not just one', () => {
    expect(
      filterArticles(summaries, {
        search: 'black holes',
      })
    ).toHaveLength(1)
    expect(
      filterArticles(summaries, {
        search: 'black plants',
      })
    ).toHaveLength(0)
  })

  it('filters by topic, and excludes untagged articles from a topic', () => {
    expect(
      filterArticles(summaries, {
        field: 'Physics',
      }).map((a) => a.slug)
    ).toEqual(['black-holes'])
    expect(
      filterArticles(summaries, { field: 'Biology' })
    ).toHaveLength(1)
  })

  it('applies topic and search together', () => {
    expect(
      filterArticles(summaries, {
        field: 'Physics',
        search: 'plants',
      })
    ).toHaveLength(0)
  })

  // This is the Prismic `fulltext` capability: a term that appears only in
  // the body still finds the article.
  it('matches body text when the corpus is loaded', () => {
    const corpus = toCorpusMap([
      {
        slug: 'photosynthesis-basics',
        text: 'chlorophyll absorbs photons in the thylakoid',
      },
    ])
    expect(
      filterArticles(summaries, {
        search: 'chlorophyll',
      })
    ).toHaveLength(0)
    expect(
      filterArticles(summaries, {
        search: 'chlorophyll',
        corpus,
      }).map((a) => a.slug)
    ).toEqual(['photosynthesis-basics'])
  })

  // If the corpus request fails, search must degrade to the summary fields
  // rather than returning nothing at all.
  it('still matches summary fields when the corpus is missing', () => {
    expect(
      filterArticles(summaries, {
        search: 'plants',
        corpus: null,
      })
    ).toHaveLength(1)
  })
})

describe('filterCourses', () => {
  it('filters on the same fields as articles', () => {
    const courses = [
      {
        slug: 'solid-biology',
        title: 'Learning in Biological Datascience',
        description: 'One week of data.',
        tags: ['Biology'],
      },
    ]
    expect(
      filterCourses(courses, { search: 'biological' })
    ).toHaveLength(1)
    expect(
      filterCourses(courses, { field: 'Physics' })
    ).toHaveLength(0)
  })

  // Prismic's fulltext predicate searched the whole document, so a term that
  // appears only in the body or a lesson title still has to find the course.
  // Course summaries carry that text in props; articles need a fetched corpus.
  it('matches body and lesson text carried in the summary', () => {
    const courses = [
      {
        slug: 'solid-biology',
        title: 'Learning in Biological Datascience',
        description: 'One week of data.',
        tags: ['Biology'],
        text: 'eligibility requirements intro to jupyter notebooks',
      },
    ]
    expect(
      filterCourses(courses, { search: 'jupyter' })
    ).toHaveLength(1)
    expect(
      filterCourses(courses, { search: 'eligibility' })
    ).toHaveLength(1)
    expect(
      filterCourses(courses, { search: 'jupyter zzznope' })
    ).toHaveLength(0)
  })

  it('still filters when a summary carries no body text', () => {
    const courses = [
      { slug: 'a', title: 'Physics', tags: [] },
    ]
    expect(
      filterCourses(courses, { search: 'physics' })
    ).toHaveLength(1)
    expect(
      filterCourses(courses, { search: 'jupyter' })
    ).toHaveLength(0)
  })
})

describe('toCorpusMap', () => {
  it('returns null for a payload that is not an array', () => {
    expect(toCorpusMap(null)).toBeNull()
    expect(toCorpusMap({})).toBeNull()
  })

  it('skips entries with no slug', () => {
    expect(
      toCorpusMap([
        { text: 'orphan' },
        { slug: 'a', text: 'x' },
      ])
    ).toEqual({ a: 'x' })
  })
})
