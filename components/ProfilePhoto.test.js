// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
} from '@testing-library/react'
import ProfilePhoto from './ProfilePhoto'

vi.mock('../lib/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}))

const getDoc = vi.fn()
vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, _collection, uid) => ({ uid })),
  getDoc: (...args) => getDoc(...args),
}))

afterEach(() => {
  cleanup()
  getDoc.mockReset()
})

describe('ProfilePhoto', () => {
  it('renders a user icon, not raw alt text, when no picture doc exists', async () => {
    getDoc.mockResolvedValue({
      exists: () => false,
      data: () => ({}),
    })

    const { container } = render(<ProfilePhoto uid="u1" />)

    await waitFor(() => expect(getDoc).toHaveBeenCalled())
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  it('skips the Firestore lookup and shows the icon when uid is missing', () => {
    const { container } = render(
      <ProfilePhoto uid={undefined} />
    )

    expect(getDoc).not.toHaveBeenCalled()
    expect(container.querySelector('img')).toBeNull()
    expect(container.querySelector('svg')).not.toBeNull()
  })

  // Regression guard: a stored picture URL that fails to load (dead
  // link, expired Google photoURL, deleted storage object) used to
  // render next/image's broken-image box with the alt text overlaid.
  // onError must swap back to the icon instead.
  it('falls back to the icon when the stored picture URL fails to load', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        picture: 'https://example.com/dead.jpg',
      }),
    })

    const { container } = render(<ProfilePhoto uid="u2" />)

    const img = await waitFor(() => {
      const node = container.querySelector('img')
      expect(node).not.toBeNull()
      return node
    })

    fireEvent.error(img)

    await waitFor(() => {
      expect(container.querySelector('img')).toBeNull()
      expect(container.querySelector('svg')).not.toBeNull()
    })
  })

  it('renders the photo once a picture doc resolves', async () => {
    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({
        picture: 'https://example.com/ok.jpg',
      }),
    })

    const { container } = render(<ProfilePhoto uid="u3" />)

    await waitFor(() => {
      expect(container.querySelector('img')).not.toBeNull()
    })
    expect(container.querySelector('svg')).toBeNull()
  })
})
