// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  render,
  screen,
} from '@testing-library/react'
import ProjectCard from './ProjectCard'

// TESTING.md's Priority 3 intent for ProjectCard: (1) a regression guard
// for the zero-member "By" label bug (the render gate is
// `member_arr?.length > 0`, not a truthy-empty-array check — an empty
// array is truthy in JS, so a naive `member_arr &&` gate would render a
// dangling "By" with no names), and (2) that the field badge resolves
// the same label for both legacy-lowercase and Title-Case `fields`
// values via `getFieldLabel`'s case-insensitive fallback.

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}))

// ProfilePhoto (rendered per member) reads Firestore directly.
vi.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}))

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => false,
    data: () => ({}),
  }),
}))

afterEach(cleanup)

describe('ProjectCard', () => {
  it('renders a zero-member project without a dangling "By" label', () => {
    const { container } = render(
      <ProjectCard
        project={{
          id: 'p1',
          title: 'Solo Project',
          member_arr: [],
          fields: [],
        }}
      />
    )

    expect(container.textContent).not.toMatch(/By/)
  })

  it('also skips the "By" label when member_arr is absent entirely', () => {
    const { container } = render(
      <ProjectCard
        project={{ id: 'p2', title: 'No Members Field' }}
      />
    )

    expect(container.textContent).not.toMatch(/By/)
  })

  it('renders the "By" label once real members are present', () => {
    render(
      <ProjectCard
        project={{
          id: 'p3',
          title: 'Team Project',
          member_arr: [
            { uid: 'u1', display: 'Ada Lovelace' },
          ],
        }}
      />
    )

    expect(screen.getByText(/By/)).toBeInTheDocument()
    expect(
      screen.getByText(/Ada Lovelace/)
    ).toBeInTheDocument()
  })

  it('resolves the same field badge label for legacy-lowercase and Title-Case values', () => {
    const { unmount } = render(
      <ProjectCard
        project={{
          id: 'p4',
          title: 'Legacy Field Casing',
          fields: ['biology'],
        }}
      />
    )
    expect(
      screen.getByText('fields.biology')
    ).toBeInTheDocument()
    unmount()

    render(
      <ProjectCard
        project={{
          id: 'p5',
          title: 'Title Case Field',
          fields: ['Biology'],
        }}
      />
    )
    expect(
      screen.getByText('fields.biology')
    ).toBeInTheDocument()
  })
})
