import { useState, useEffect } from 'react'
import { useContext } from 'react'

import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import { useFirestore, useAuth } from 'reactfire'
import { doc, getDoc, setDoc } from '@firebase/firestore'
import {
  updateProfile,
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
} from '@firebase/auth'

import isAlpha from 'validator/lib/isAlpha'
import isEmail from 'validator/lib/isEmail'
import moment from 'moment'

import { AppContext } from '../../context/context'
import {
  validatePassword,
  createUniqueSlug,
  providerSignIn,
} from '../../context/helpers'

export default function StudentSignUp() {
  const { t } = useTranslation('common')
  const f_signup_errors = {
    'auth/invalid-email': t('auth.auth_invalid_email'),
    'auth/email-already-in-use': t(
      'auth.auth_email_in_use'
    ),
    'auth/weak-password': t('auth.auth_weak_password'),
    'Please verify your email before signing in': t(
      'auth.please_verify'
    ),
  }

  const [first_name, setFirstName] = useState('')
  const [last_name, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [birthday, setBirthday] = useState('')
  const [gender, setGender] = useState('Male')
  const [race, setRace] = useState(
    'American Indian or Alaska Native'
  )
  const [terms, setTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recaptchaSolved, setRecaptchaSolved] =
    useState(false)

  const [error_name, setErrorName] = useState('')
  const [error_email, setErrorEmail] = useState('')
  const [error_password, setErrorPassword] = useState('')
  const [error_birthday, setErrorBirthday] = useState('')
  const [error_terms, setErrorTerms] = useState('')

  const firestore = useFirestore()
  const auth = useAuth()
  const router = useRouter()
  const { setProfile } = useContext(AppContext)

  useEffect(async () => {
    if (
      process.browser &&
      !document
        .getElementById('recaptcha-container')
        .hasChildNodes()
    ) {
      const recaptchaVerifier = new RecaptchaVerifier(
        'recaptcha-container',
        {
          size: 'normal',
          callback: (response) => {
            setRecaptchaSolved(true)
          },
          'expired-callback': () => {
            setRecaptchaSolved(false)
          },
        },
        auth
      )
      const recaptchaId = await recaptchaVerifier.render()
      const verified = await recaptchaVerifier.verify()
      if (verified.length) {
        setRecaptchaSolved(true)
      }
    }
  })

  async function onChange(e, target) {
    switch (target) {
      case 'first_name':
        setFirstName(e.target.value.trim())

        if (
          !isAlpha(e.target.value.trim()) ||
          e.target.value.trim().length < 1
        ) {
          setErrorName(t('auth.error_name'))
        } else if (
          e.target.value.trim().split(' ').length > 1
        ) {
          setErrorName(t('auth.error_first_name'))
        } else {
          setErrorName('')
        }
        break
      case 'last_name':
        setLastName(e.target.value.trim())

        if (
          !isAlpha(e.target.value.trim()) ||
          e.target.value.trim().length < 1
        ) {
          setErrorName(t('auth.error_name'))
        } else if (
          e.target.value.trim().split(' ').length > 1
        ) {
          setErrorName(t('auth.error_last_name'))
        } else {
          setErrorName('')
        }
        break
      case 'birthday':
        setBirthday(e.target.value)
        if (
          moment(e.target.value).isAfter(
            moment().subtract(13, 'years')
          ) ||
          e.target.value.length < 1
        ) {
          setErrorBirthday(t('auth.error_birthday'))
        } else {
          setErrorBirthday('')
        }
        break
      case 'email':
        setEmail(e.target.value)
        if (
          e.target.value == '' ||
          !isEmail(e.target.value)
        ) {
          setErrorEmail(t('auth.valid_email'))
        } else {
          setErrorEmail('')
        }
        break
      case 'password':
        setPassword(e.target.value)
        setErrorPassword(
          validatePassword(e.target.value, t)
        )
        break
    }
  }

  async function emailSignUp(event) {
    event.preventDefault()
    setLoading(true)
    let res
    let unique_slug = await createUniqueSlug(
      firestore,
      first_name.toLowerCase() +
        '-' +
        last_name.toLowerCase(),
      'profile-slugs',
      1
    )
    const profile = {
      display: first_name + ' ' + last_name,
      authorized: true, // Only students are authorized upon signup
      slug: unique_slug,
      about: '',
      fields: [],
      programs: [],
      links: [],
      joined: moment().toISOString(),
      birthday: moment(birthday).toISOString(),
      institution: '',
      position: '',
      race: race,
      gender: gender,
      subs_p: [],
      subs_e: [],
      mentor: false,
    }

    try {
      res = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )
      await setDoc(
        doc(firestore, 'profiles', res.user.uid),
        profile
      )
      await setDoc(
        doc(firestore, 'profile-slugs', unique_slug),
        { slug: unique_slug }
      )
      await setDoc(doc(firestore, 'emails', res.user.uid), {
        email: res.user.email,
      })
      await updateProfile(res.user, {
        displayName: first_name + ' ' + last_name,
      })
      setProfile(profile)
      if (router.query.ref) {
        let ref = router.query.ref.split('|')
        let section = ref[0]
        let id = ref[1]
        if (section == 'projects') {
          section = 'project'
        }
        router.push(`/${section}/${id}`)
      } else {
        router.push('/')
      }
    } catch (e) {
      console.log(e)
      f_signup_errors[e.code]
        ? setErrorEmail(f_signup_errors[e.code])
        : setErrorEmail(t('auth.sign_in_failed'))
      setEmail('')
      setLoading(false)
    }
  }

  return (
    <div>
      <Head>
        <title>Student Sign Up | SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Mentor sign up for SciTeens"
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, sign up, teen science"
        />
        <meta property="og:type" content="website" />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
      </Head>
      <main>
        <div className="relative z-30 mx-auto mt-8 mb-24 w-11/12 rounded-lg bg-white px-4 py-8 text-left shadow md:w-2/3 md:px-12 md:py-12 lg:w-[45%] lg:px-20">
          <h1 className="mb-2 text-center text-3xl font-semibold">
            {t('auth.student_sign_up')}
          </h1>
          <p className="mb-6 text-center text-gray-700">
            {t('auth.why_student_sign_up')}
          </p>

          <form onSubmit={emailSignUp}>
            <div className="flex flex-row">
              <div className="mr-1">
                <label
                  for="first-name"
                  className="uppercase text-gray-600"
                >
                  {t('auth.first_name')}
                </label>
                <input
                  onChange={(e) =>
                    onChange(e, 'first_name')
                  }
                  value={first_name}
                  name="first-name"
                  required
                  className={`focus:outline-none mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight ${
                    error_name
                      ? 'border-red-700 text-red-800 placeholder-red-700'
                      : 'text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white'
                  }`}
                  type="text"
                  aria-label="name"
                  maxLength="50"
                />
                <div className="mb-4"></div>
              </div>

              <div className="ml-1">
                <label
                  for="last-name"
                  className="mt-4 uppercase text-gray-600"
                >
                  {t('auth.last_name')}
                </label>
                <input
                  onChange={(e) => onChange(e, 'last_name')}
                  value={last_name}
                  name="last-name"
                  required
                  className={`focus:outline-none mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight ${
                    error_name
                      ? 'border-red-700 text-red-800 placeholder-red-700'
                      : 'text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white'
                  }`}
                  type="text"
                  aria-label="name"
                  maxLength="50"
                />
                <p className="mb-4 text-sm text-red-800">
                  {error_name}
                </p>
              </div>
            </div>

            <label
              for="email"
              className="uppercase text-gray-600"
            >
              {t('auth.email')}
            </label>
            <input
              value={email}
              onChange={(e) => onChange(e, 'email')}
              name="email"
              required
              className={`focus:outline-none mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight ${
                error_email
                  ? 'border-red-700 text-red-800 placeholder-red-700'
                  : 'text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white'
              }`}
              type="email"
              aria-label="email"
            />
            <p className="mb-4 text-sm text-red-800">
              {error_email}
            </p>

            <label
              for="password"
              className="uppercase text-gray-600"
            >
              {t('auth.password')}
            </label>
            <input
              value={password}
              onChange={(e) => onChange(e, 'password')}
              name="password"
              required
              className={`focus:outline-none mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight ${
                error_password
                  ? 'border-red-700 text-red-800 placeholder-red-700'
                  : 'text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white'
              }`}
              type="password"
              aria-label="password"
            />
            <p className="mb-4 text-sm text-red-800">
              {error_password}
            </p>

            <label
              for="birthday"
              className="uppercase text-gray-600"
            >
              {t('auth.birthday')}
            </label>
            <input
              required
              onChange={(e) => onChange(e, 'birthday')}
              value={birthday}
              type="date"
              id="birthday"
              name="birthday"
              className={`focus:outline-none mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight ${
                error_birthday
                  ? 'border-red-700 text-red-800 placeholder-red-700'
                  : 'text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white'
              }`}
            />
            <p
              className={`mb-4 text-sm ${
                error_birthday
                  ? 'text-red-800'
                  : 'text-gray-700'
              }`}
            >
              {error_birthday
                ? error_birthday
                : t('auth.error_birthday')}
            </p>

            <label
              for="gender"
              className="uppercase text-gray-600"
            >
              {t('auth.gender')}
            </label>
            <div className="relative w-full">
              <select
                onChange={(e) => setGender(e.target.value)}
                name="gender"
                id="gender"
                value={gender}
                className="focus:outline-none mb-4 mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white focus:placeholder-gray-700"
              >
                <option selected value="Male">
                  {t('auth.male')}
                </option>
                <option value="Female">
                  {t('auth.female')}
                </option>
                <option value="Other">
                  {t('auth.other')}
                </option>
                <option value="Prefer not to answer">
                  {t('auth.prefer_not_answer')}
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg
                  className="h-4 w-4 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>

            <label
              for="race"
              className="uppercase text-gray-600"
            >
              {t('auth.race')}
            </label>
            <div className="relative w-full">
              <select
                onChange={(e) => setRace(e.target.value)}
                name="race"
                id="race"
                value={race}
                className="focus:outline-none mb-4 mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white focus:placeholder-gray-700"
              >
                <option
                  selected
                  value="American Indian or Alaska Native"
                >
                  {t('auth.american_indian')}
                </option>
                <option value="Asian (including Indian subcontinent and Philippines origin)">
                  {t('auth.asian')}
                </option>
                <option value="Black or African American">
                  {t('auth.black')}
                </option>
                <option value="Hispanic or Latino">
                  {t('auth.hispanic')}
                </option>
                <option value="White (including Middle Eastern origin)">
                  {t('auth.white')}
                </option>
                <option value="Native Hawaiian or Other Pacific Islander">
                  {t('auth.native_hawaiian')}
                </option>
                <option value="Prefer not to answer">
                  {t('auth.prefer_not_answer')}
                </option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                <svg
                  className="h-4 w-4 fill-current"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                </svg>
              </div>
            </div>
            <div
              id="recaptcha-container"
              className="mb-4 flex w-full justify-center"
            ></div>
            <div>
              <div className="flex flex-row">
                <input
                  onChange={() => {
                    setTerms(!terms)
                  }}
                  id="terms"
                  required
                  value={terms}
                  type="checkbox"
                  name="terms"
                  className="form-checkbox active:outline-none my-auto mr-2 leading-tight text-sciteensLightGreen-regular"
                />
                <label
                  for="terms"
                  className="whitespace-nowrap text-sm text-gray-600"
                >
                  <div className="flex flex-row">
                    {t('auth.terms')}&nbsp;
                    <Link href="/legal/terms">
                      <a className="font-semibold text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark">
                        {t('auth.terms_link')}
                      </a>
                    </Link>
                  </div>
                </label>
              </div>
              <p
                v-if="e_terms"
                className="mb-6 text-sm text-red-800"
              >
                {error_terms}
              </p>
            </div>
            <button
              type="submit"
              disabled={
                loading ||
                error_name ||
                error_birthday ||
                error_email ||
                error_password ||
                !recaptchaSolved
              }
              className="outline-none w-full rounded-lg bg-sciteensLightGreen-regular p-2 text-lg font-semibold text-white shadow hover:bg-sciteensLightGreen-dark disabled:opacity-50"
              onClick={emailSignUp}
            >
              {t('auth.create_account')}
              {loading && (
                <img
                  src="/assets/loading.svg"
                  alt="Loading Spinner"
                  className="inline-block h-5 w-5"
                />
              )}
            </button>
          </form>
          <div className="mb-8 mt-4 h-3 w-full border-b border-gray-300 text-center">
            <span className="bg-white p-2">
              {t('auth.or')}
            </span>
          </div>
          <button
            className="mb-2 flex w-full items-center justify-center rounded-lg bg-white p-3 shadow hover:shadow-md"
            onClick={() =>
              providerSignIn(
                auth,
                firestore,
                router,
                setProfile
              )
            }
          >
            <img
              src="/assets/logos/Google.png"
              alt="Google Logo"
              className="mr-2 h-5 w-5"
            />
            {t('auth.google_sign_in')}
          </button>
          <div className="mt-4 flex justify-center">
            <p className="text-gray-700">
              {t('auth.have_account')}&nbsp;
              <Link
                href={
                  router.query?.ref
                    ? {
                        pathname: '/signin/student',
                        query: {
                          ref: router.query?.ref,
                        },
                      }
                    : '/signin/student'
                }
              >
                <a className="font-bold">
                  {t('auth.sign_in_link')}
                </a>
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
