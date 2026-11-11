// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import StudentSignIn from '@/pages/signin/student'
import { signInWithEmailAndPassword } from '@firebase/auth'

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn(), query: {} }),
}))

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}))

vi.mock('@/lib/firebase', () => ({ auth: {} }))
vi.mock('@/lib/firestore', () => ({ db: {} }))

vi.mock('@firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => false,
    data: () => ({}),
  }),
}))

vi.mock('@firebase/auth', () => ({
  browserPopupRedirectResolver: {},
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn(),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('StudentSignIn', () => {
  it('focuses the first invalid field on submit and exposes its error description', async () => {
    const user = userEvent.setup()
    render(<StudentSignIn />)

    const submit = screen.getByRole('button', {
      name: 'auth.sign_in',
    })
    const email = screen.getByLabelText('auth.email')

    expect(submit).toBeEnabled()
    expect(email).toHaveAttribute(
      'autocomplete',
      'username'
    )
    expect(
      screen.queryByRole('alert')
    ).not.toBeInTheDocument()

    await user.click(submit)

    await waitFor(() => expect(email).toHaveFocus())
    expect(email).toHaveAccessibleDescription(
      'auth.valid_email'
    )
    expect(
      signInWithEmailAndPassword
    ).not.toHaveBeenCalled()
  })

  it('keeps the entered email and links the server error to the field', async () => {
    const user = userEvent.setup()
    signInWithEmailAndPassword.mockRejectedValueOnce({
      code: 'auth/wrong-password',
    })
    render(<StudentSignIn />)

    const email = screen.getByLabelText('auth.email')
    await user.type(email, 'student@example.com')
    await user.type(
      screen.getByLabelText('auth.password'),
      'Passw0rd!'
    )
    await user.click(
      screen.getByRole('button', { name: 'auth.sign_in' })
    )

    await waitFor(() =>
      expect(email).toHaveAccessibleDescription(
        'auth.auth_wrong_password'
      )
    )
    expect(email).toHaveValue('student@example.com')
    expect(email).toHaveFocus()
  })
})
