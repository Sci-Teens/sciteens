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

// TESTING.md's Priority 3 ("Signup/signin forms") intent for the signin
// page: submit stays disabled until both fields (email + password) pass
// their zod validation, driven through the real react-hook-form + zod
// wiring rather than internal state.
//
// Lives under tests/pages/, not pages/signin/ — see the comment in
// tests/pages/signup/student.test.js for why (Next's Pages Router
// treats every `.js` under `pages/` as a route).

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn(), query: {} }),
}))

vi.mock('next-i18next', () => ({
  useTranslation: () => ({ t: (key) => key }),
}))

vi.mock('@/lib/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}))

vi.mock('@firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => false,
    data: () => ({}),
  }),
}))

vi.mock('@firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  getAdditionalUserInfo: vi.fn(),
}))

afterEach(cleanup)

describe('StudentSignIn', () => {
  it('keeps submit disabled until both email and password are valid', async () => {
    const user = userEvent.setup()
    render(<StudentSignIn />)

    const submit = screen.getByRole('button', {
      name: 'auth.sign_in',
    })
    expect(submit).toBeDisabled()

    // An invalid email keeps it disabled and surfaces the zod error.
    await user.type(
      screen.getByLabelText('auth.email'),
      'not-an-email'
    )
    await user.tab()
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'auth.valid_email'
      )
    )
    expect(submit).toBeDisabled()

    // A password missing the digit/symbol/uppercase requirements also
    // keeps it disabled, even once the email above is fixed.
    await user.clear(screen.getByLabelText('auth.email'))
    await user.type(
      screen.getByLabelText('auth.email'),
      'student@example.com'
    )
    await user.type(
      screen.getByLabelText('auth.password'),
      'weak'
    )
    await waitFor(() => expect(submit).toBeDisabled())

    // A fully valid form enables it.
    await user.clear(screen.getByLabelText('auth.password'))
    await user.type(
      screen.getByLabelText('auth.password'),
      'Passw0rd!'
    )
    await waitFor(() => expect(submit).toBeEnabled())
  })
})
