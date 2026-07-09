import { describe, expect, it } from 'vitest'
import { normalizeProject } from './projects'

describe('normalizeProject', () => {
  it('passes through falsy input unchanged', () => {
    expect(normalizeProject(null)).toBeNull()
    expect(normalizeProject(undefined)).toBeUndefined()
  })

  it('defaults every derived field on a bare object', () => {
    expect(normalizeProject({})).toEqual({
      title: '',
      abstract: '',
      project_photo: '',
      member_arr: [],
      member_uids: [],
    })
  })

  it('falls back title -> name', () => {
    expect(normalizeProject({ name: 'Foo' }).title).toBe(
      'Foo'
    )
  })

  it('prefers title over name when both are present', () => {
    expect(
      normalizeProject({ title: 'Bar', name: 'Foo' }).title
    ).toBe('Bar')
  })

  // Regression test: legacy project docs stored raw rich-text HTML in a
  // field that is now rendered as plain text — must never be rendered
  // dangerouslySetInnerHTML.
  it('strips HTML tags from abstract', () => {
    expect(
      normalizeProject({
        abstract: '<p>Hello&nbsp;<b>World</b></p>',
      }).abstract
    ).toBe('Hello World')
  })

  it('falls back abstract -> about, also stripping HTML', () => {
    expect(
      normalizeProject({ about: '<div>About text</div>' })
        .abstract
    ).toBe('About text')
  })

  it('prefers abstract over about when both are present', () => {
    expect(
      normalizeProject({
        abstract: 'Real abstract',
        about: 'Ignored',
      }).abstract
    ).toBe('Real abstract')
  })

  it('collapses repeated whitespace left by stripped tags', () => {
    expect(
      normalizeProject({
        abstract: '<p>Line one</p>\n\n<p>Line two</p>',
      }).abstract
    ).toBe('Line one Line two')
  })

  it('falls back project_photo -> photo', () => {
    expect(
      normalizeProject({ photo: 'https://x/photo.png' })
        .project_photo
    ).toBe('https://x/photo.png')
  })

  it('prefers project_photo over photo when both are present', () => {
    expect(
      normalizeProject({
        project_photo: 'https://x/a.png',
        photo: 'https://x/b.png',
      }).project_photo
    ).toBe('https://x/a.png')
  })

  it('falls back member_arr -> members', () => {
    const members = [{ uid: 'a' }, { uid: 'b' }]
    expect(normalizeProject({ members }).member_arr).toBe(
      members
    )
  })

  it('derives member_uids from members[].uid when absent, dropping falsy uids', () => {
    const members = [
      { uid: 'a' },
      { name: 'no-uid' },
      { uid: 'b' },
      { uid: null },
    ]
    expect(
      normalizeProject({ members }).member_uids
    ).toEqual(['a', 'b'])
  })

  it('keeps an explicit member_uids instead of re-deriving it', () => {
    expect(
      normalizeProject({
        member_uids: ['x'],
        members: [{ uid: 'a' }],
      }).member_uids
    ).toEqual(['x'])
  })

  it('passes through unrelated fields untouched', () => {
    expect(
      normalizeProject({ id: 'p1', field: 'Biology' })
    ).toMatchObject({ id: 'p1', field: 'Biology' })
  })
})
