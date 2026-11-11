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
import { createUserWithEmailAndPassword } from '@firebase/auth'

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

vi.mock('@/lib/firebase', () => ({ auth: {} }))
vi.mock('@/lib/firestore', () => ({ db: {} }))

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
  browserPopupRedirectResolver: {},
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  onAuthStateChanged: vi.fn(),
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

// Opens the already-focused birthday popover and selects the given date
// via the calendar's month/year dropdowns + day grid, since
// BirthdayField renders a Popover + Calendar instead of a native date
// input.
async function pickBirthday(user, momentDate) {
  await user.selectOptions(
    screen.getByLabelText('Choose the Year'),
    String(momentDate.year())
  )
  await user.selectOptions(
    screen.getByLabelText('Choose the Month'),
    momentDate.format('MMM')
  )
  await user.click(
    screen.getByRole('button', {
      name: momentDate.format('dddd, MMMM Do, YYYY'),
    })
  )
}

async function fillValidForm(
  user,
  { acceptTerms = true } = {}
) {
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
  await user.click(screen.getByLabelText('auth.birthday'))
  await pickBirthday(
    user,
    moment(validFields.birthday, 'YYYY-MM-DD')
  )
  if (acceptTerms) {
    await user.click(
      screen.getByRole('checkbox', { name: /auth\.terms/ })
    )
  }
}

describe('StudentSignUp', () => {
  beforeEach(() => {
    mockRecaptchaVerify.mockReset().mockResolvedValue('')
    mockRecaptchaRender.mockClear()
  })

  it('focuses unaccepted terms and exposes the localized error on submit', async () => {
    mockRecaptchaVerify.mockResolvedValue('solved-token')
    const user = userEvent.setup()
    render(<StudentSignUp />)

    await fillValidForm(user, { acceptTerms: false })
    await user.click(
      screen.getByRole('button', {
        name: 'auth.create_account',
      })
    )

    const terms = screen.getByRole('checkbox', {
      name: /auth\.terms/,
    })
    await waitFor(() => expect(terms).toHaveFocus())
    expect(terms).toHaveAccessibleDescription(
      'auth.error_terms'
    )
    expect(
      createUserWithEmailAndPassword
    ).not.toHaveBeenCalled()
  })

  it('rejects a birthday under 13 years old with the expected zod error', async () => {
    const user = userEvent.setup()
    render(<StudentSignUp />)

    const birthday = screen.getByLabelText('auth.birthday')
    await user.click(birthday)
    await pickBirthday(user, moment().subtract(5, 'years'))
    await user.click(
      screen.getByRole('button', {
        name: 'auth.create_account',
      })
    )

    await waitFor(() => {
      expect(birthday).toHaveAttribute(
        'aria-invalid',
        'true'
      )
    })
    expect(birthday).toHaveAccessibleDescription(
      /auth\.error_birthday/
    )

    await user.click(birthday)
    await pickBirthday(user, moment().subtract(20, 'years'))

    await waitFor(() => {
      expect(birthday).toHaveAttribute(
        'aria-invalid',
        'false'
      )
    })
    expect(birthday).toHaveAccessibleDescription(
      /auth\.birthday_info/
    )
  })

  it('requires a solved reCAPTCHA before creating an account', async () => {
    const user = userEvent.setup()
    render(<StudentSignUp />)

    await fillValidForm(user)
    await user.click(
      screen.getByRole('button', {
        name: 'auth.create_account',
      })
    )

    await waitFor(() =>
      expect(
        screen.getByText('auth.complete_recaptcha')
      ).toHaveFocus()
    )
    expect(
      createUserWithEmailAndPassword
    ).not.toHaveBeenCalled()
  })
})
