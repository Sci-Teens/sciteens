// @vitest-environment jsdom
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'

const push = vi.fn()
const toggleMock = vi.fn()

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}))

vi.mock('next/router', () => ({
  useRouter: () => ({ push }),
}))

vi.mock('../context/AuthContext', () => ({
  useSigninCheck: vi.fn(),
}))

vi.mock('../lib/firebase', () => ({
  db: {},
}))

vi.mock('../lib/firestoreData', () => ({
  useFirestoreDocData: vi.fn(() => ({
    status: 'success',
    data: undefined,
  })),
}))

vi.mock('../lib/projectUpvotes', async () => {
  const actual = await vi.importActual(
    '../lib/projectUpvotes'
  )
  return {
    ...actual,
    toggleProjectUpvote: (...args) => toggleMock(...args),
    getProjectUpvoteRef: (_db, projectId, uid) => ({
      path: `projects/${projectId}/upvotes/${uid}`,
    }),
  }
})

import ProjectUpvoteButton from './ProjectUpvoteButton'
import { useSigninCheck } from '../context/AuthContext'
import { useFirestoreDocData } from '../lib/firestoreData'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

beforeEach(() => {
  useSigninCheck.mockReturnValue({
    status: 'success',
    data: {
      signedIn: true,
      user: { uid: 'u1', displayName: 'Ada' },
    },
  })
  useFirestoreDocData.mockReturnValue({
    status: 'success',
    data: undefined,
  })
  toggleMock.mockResolvedValue({
    upvoted: true,
    upvote_count: 1,
  })
})

describe('ProjectUpvoteButton', () => {
  it('renders a gray bolt and the count by default', () => {
    render(<ProjectUpvoteButton projectId="p1" count={4} />)
    expect(screen.getByText('4')).toBeInTheDocument()
    const btn = screen.getByRole('button', {
      name: 'projects.support',
    })
    expect(btn).toHaveAttribute('aria-pressed', 'false')
  })

  it('shows pressed/yellow state when the user already upvoted', () => {
    useFirestoreDocData.mockReturnValue({
      status: 'success',
      data: { uid: 'u1', projectId: 'p1' },
    })
    render(<ProjectUpvoteButton projectId="p1" count={2} />)
    const btn = screen.getByRole('button', {
      name: 'projects.remove_support',
    })
    expect(btn).toHaveAttribute('aria-pressed', 'true')
  })

  it('redirects signed-out users to sign in', () => {
    useSigninCheck.mockReturnValue({
      status: 'success',
      data: { signedIn: false, user: null },
    })
    render(<ProjectUpvoteButton projectId="p1" count={0} />)
    fireEvent.click(
      screen.getByRole('button', {
        name: 'projects.support',
      })
    )
    expect(push).toHaveBeenCalledWith({
      pathname: '/signin/student',
      query: { ref: 'project|p1' },
    })
    expect(toggleMock).not.toHaveBeenCalled()
  })

  it('optimistically toggles and commits via toggleProjectUpvote', async () => {
    render(<ProjectUpvoteButton projectId="p1" count={0} />)
    fireEvent.click(
      screen.getByRole('button', {
        name: 'projects.support',
      })
    )
    expect(screen.getByText('1')).toBeInTheDocument()
    await waitFor(() => {
      expect(toggleMock).toHaveBeenCalledWith(
        {},
        'p1',
        'u1'
      )
    })
  })
})
