// @vitest-environment jsdom
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
  beforeEach,
} from 'vitest'
import {
  cleanup,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import moment from 'moment'
import StudentSignUp from '@/pages/signup/student'

// Covers the submit button's gated-disabled logic (form validity AND,
// on this page, a solved reCAPTCHA) and the birthday-under-13 zod
// rejection, all driven through real react-hook-form + zod validation
// rather than asserting on internal state.
//
// Lives under tests/pages/ rather than pages/signup/ — Next's Pages
// Router treats every `.js` file under `pages/` as a route, so a
// colocated `*.test.js` there breaks `next build` (it tries to render
// the test file itself as a page). `vi.mock` below targets the same
// modules via the `@/*` alias so it still intercepts what
// pages/signup/student.js imports, regardless of this file's location.

vi.mock('next/router', () => ({
  useRouter: () => ({ push: vi.fn(), query: {} }),
}))

// RTL's automatic per-test cleanup only self-registers when it detects a
// global `afterEach` (i.e. `test.globals: true`); this repo's vitest
// config deliberately doesn't set that, so unmount explicitly instead.
afterEach(cleanup)

// Identity translator, same convention as context/helpers.test.js: lets
// assertions check against the raw key instead of needing real i18n JSON.
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
  setDoc: vi.fn().mockResolvedValue(undefined),
  getDoc: vi.fn().mockResolvedValue({
    exists: () => false,
    data: () => ({}),
  }),
}))

// `mock`-prefixed names are required by vitest's hoisting: `vi.mock`
// factories may only close over variables named with that prefix.
const mockRecaptchaVerify = vi.fn()
const mockRecaptchaRender = vi
  .fn()
  .mockResolvedValue(undefined)

vi.mock('@firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  getAdditionalUserInfo: vi.fn(),
  // `mockImplementation` can't take an arrow function here — the
  // component calls `new RecaptchaVerifier(...)`, and arrow functions
  // aren't constructable.
  RecaptchaVerifier: vi
    .fn()
    .mockImplementation(function () {
      return {
        render: mockRecaptchaRender,
        verify: mockRecaptchaVerify,
      }
    }),
}))

const validFields = {
  first_name: 'Jane',
  last_name: 'Doe',
  email: 'jane.doe@example.com',
  password: 'Passw0rd!',
  birthday: moment()
    .subtract(20, 'years')
    .format('YYYY-MM-DD'),
}

async function fillValidForm(user) {
  await user.type(
    screen.getByLabelText('auth.first_name'),
    validFields.first_name
  )
  await user.type(
    screen.getByLabelText('auth.last_name'),
    validFields.last_name
  )
  await user.type(
    screen.getByLabelText('auth.email'),
    validFields.email
  )
  await user.type(
    screen.getByLabelText('auth.password'),
    validFields.password
  )
  await user.type(
    screen.getByLabelText('auth.birthday'),
    validFields.birthday
  )
  await user.click(
    screen.getByRole('checkbox', { name: /auth\.terms/ })
  )
}

describe('StudentSignUp', () => {
  beforeEach(() => {
    mockRecaptchaVerify.mockReset().mockResolvedValue('')
    mockRecaptchaRender.mockClear()
  })

  it('keeps submit disabled until every field is valid', async () => {
    mockRecaptchaVerify.mockResolvedValue('solved-token')
    const user = userEvent.setup()
    render(<StudentSignUp />)

    const submit = screen.getByRole('button', {
      name: 'auth.create_account',
    })
    expect(submit).toBeDisabled()

    await fillValidForm(user)

    await waitFor(() => expect(submit).toBeEnabled())
  })

  it('rejects a birthday under 13 years old with the expected zod error', async () => {
    const user = userEvent.setup()
    render(<StudentSignUp />)

    const birthday = screen.getByLabelText('auth.birthday')
    await user.type(
      birthday,
      moment().subtract(5, 'years').format('YYYY-MM-DD')
    )
    await user.tab()

    await waitFor(() => {
      expect(birthday).toHaveAttribute(
        'aria-invalid',
        'true'
      )
    })
    expect(screen.getByRole('alert')).toHaveTextContent(
      'auth.error_birthday'
    )

    await user.clear(birthday)
    await user.type(
      birthday,
      moment().subtract(20, 'years').format('YYYY-MM-DD')
    )
    await user.tab()

    await waitFor(() => {
      expect(birthday).toHaveAttribute(
        'aria-invalid',
        'false'
      )
    })
    expect(
      screen.queryByRole('alert')
    ).not.toBeInTheDocument()
  })

  it('keeps submit disabled while the reCAPTCHA is unsolved, even with an otherwise-valid form', async () => {
    // Default beforeEach resolves verify() to '' (unsolved).
    const user = userEvent.setup()
    render(<StudentSignUp />)

    const submit = screen.getByRole('button', {
      name: 'auth.create_account',
    })

    await fillValidForm(user)

    // Give any pending recaptcha microtasks a chance to flush; it must
    // still be disabled because verify() resolved empty.
    await waitFor(() =>
      expect(mockRecaptchaRender).toHaveBeenCalled()
    )
    expect(submit).toBeDisabled()
  })
})
