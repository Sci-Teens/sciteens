// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  render,
  screen,
} from '@testing-library/react'
import ProjectCard from './ProjectCard'

// Regression guard for the zero-member "By" label bug (the render gate
// is `member_arr?.length > 0`, not a truthy-empty-array check — an
// empty array is truthy in JS, so a naive `member_arr &&` gate would
// render a dangling "By" with no names), and confirms the field badge
// resolves the same label for both legacy-lowercase and Title-Case
// `fields` values via `getFieldLabel`'s case-insensitive fallback.

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

  // Regression guard for the mobile date-misalignment bug: the date used
  // to get a hardcoded `ml-10` that only lined up with a specific avatar
  // count/breakpoint. The date now shares a CSS grid column with the "By"
  // label so it lines up regardless of member count or breakpoint.
  it('aligns the date under the "By" label via a shared grid column when members are present', () => {
    const { container } = render(
      <ProjectCard
        project={{
          id: 'p6',
          title: 'Dated Project',
          member_arr: [
            { uid: 'u1', display: 'Ada Lovelace' },
          ],
        }}
        date="Mar 15, 2024"
      />
    )

    const dateNode = screen.getByText('Mar 15, 2024')
    expect(dateNode.className).toContain('col-start-2')
    expect(container.textContent).toMatch(/Mar 15, 2024/)
  })

  it('spans the full row for the date when there are no members to align under', () => {
    render(
      <ProjectCard
        project={{ id: 'p7', title: 'Solo Dated Project' }}
        date="Mar 15, 2024"
      />
    )

    expect(
      screen.getByText('Mar 15, 2024').className
    ).toContain('col-span-2')
  })

  // Regression guard: a missing project photo used to fall back to the
  // sciteens logo stretched over a gray box (`sciteens_initials.jpg`),
  // which looked broken. It should render a neutral image placeholder
  // icon instead, and never request the logo asset.
  it('renders an icon placeholder instead of the sciteens logo when there is no project photo', () => {
    const { container } = render(
      <ProjectCard
        project={{ id: 'p8', title: 'No Photo Project' }}
      />
    )

    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('renders the real photo when present', () => {
    const { container } = render(
      <ProjectCard
        project={{
          id: 'p9',
          title: 'Photo Project',
          project_photo: 'https://example.com/photo.jpg',
        }}
      />
    )

    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img.getAttribute('alt')).toBe('Photo Project')
  })
})
