import { useState, useEffect } from 'react'
import { useContext } from 'react'

import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import { useFirestore, useAuth } from 'reactfire'
import { doc, setDoc, updateDoc } from '@firebase/firestore'
import { updateProfile } from '@firebase/auth'
import {
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
} from '../../context/helpers'

export default function MentorSignUp() {
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
  const [institution, setInstitution] = useState('')
  const [position, setPosition] = useState('')
  const [ethnicity, setEthnicity] = useState('Cuban')
  const [race, setRace] = useState(
    'American Indian or Alaska Native'
  )
  const [gender, setGender] = useState('Male')
  const [terms, setTerms] = useState(false)
  const [loading, setLoading] = useState(false)
  const [recaptchaSolved, setRecaptchaSolved] =
    useState(false)

  const [error_name, setErrorName] = useState('')
  const [error_email, setErrorEmail] = useState('')
  const [error_password, setErrorPassword] = useState('')
  const [error_institution, setErrorInstitution] =
    useState('')
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

  async function finishSignUp() {
    if (!terms) {
      setErrorTerms(t('auth.error_terms'))
    } else {
      try {
        setLoading(true)
        await updateDoc(
          doc(firestore, 'profiles', user.uid),
          {
            display: first_name + ' ' + last_name,
            birthday: moment(birthday).toISOString(),
            race: race,
            ethnicity: ethnicity,
          }
        )
        await updateProfile(user, {
          displayName: first_name + ' ' + last_name,
        })
        router.push('/dashboard')
      } catch {
        setLoading(false)
        setErrorName(t('auth.unable_to_create'))
      }
    }
  }

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
          setErrorName('auth.error_first_name')
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
      case 'institution':
        setInstitution(e.target.value.trim())
        if (
          !isAlpha(e.target.value.trim()) ||
          e.target.value.trim().length < 1
        ) {
          setErrorInstitution(t('auth.valid_institution'))
        } else {
          setErrorInstitution('')
        }
    }
  }

  async function emailSignUp(event) {
    event.preventDefault()
    setLoading(true)
    try {
      const res = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      )
      const unique_slug = await createUniqueSlug(
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
        birthday: '',
        institution: institution,
        position: position,
        race: race,
        gender: gender,
        subs_p: [],
        subs_e: [],
        mentor: true,
      }
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
      console.log(e.code)
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
        <title>Educator Sign Up | SciTeens</title>
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
            {t('auth.educate_on_sciteens')}
          </h1>
          <b className='text-red-700'>
            We currently aren't accepting new educator signups.
          </b>
          <p className="mb-6 text-center text-gray-700">
            {t('auth.why_educate_on_sciteens')}
          </p>

          <form onSubmit={emailSignUp}>
            <div className="flex flex-row">
              <div className="mr-1">
                <label
                  htmlFor="first-name"
                  className="uppercase text-gray-600"
                >
                  {t('auth.first_name')}
                </label>
                <input
                  disabled
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
                  htmlFor="last-name"
                  className="mt-4 uppercase text-gray-600"
                >
                  {t('auth.last_name')}
                </label>
                <input
                disabled
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
              htmlFor="email"
              className="uppercase text-gray-600"
            >
              {t('auth.email')}
            </label>
            <input
            disabled
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
              htmlFor="password"
              className="uppercase text-gray-600"
            >
              {t('auth.password')}
            </label>
            <input
            disabled
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
              htmlFor="institution"
              className="mt-4 uppercase text-gray-600"
            >
              {t('auth.institution')}
            </label>
            <input
            disabled
              onChange={(e) => onChange(e, 'institution')}
              value={institution}
              name="institution"
              required
              className={`focus:outline-none mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight ${
                error_institution
                  ? 'border-red-700 text-red-800 placeholder-red-700'
                  : 'text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white'
              }`}
              type="text"
              aria-label="name"
              maxLength="50"
            />
            <p className="mb-4 text-sm text-red-800">
              {error_institution}
            </p>

            <label
              htmlFor="position"
              className="uppercase text-gray-600"
            >
              {t('auth.position')}
            </label>
            <div className="relative w-full">
              <select
              disabled
                name="position"
                id="position"
                onChange={(e) =>
                  setPosition(e.target.value)
                }
                value={position}
                className="focus:outline-none mb-4 mr-3 block w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white focus:placeholder-gray-700"
              >
                <option selected value="Educator">
                  {t('auth.educator')}
                </option>
                <option value="Professional">
                  {t('auth.professional')}
                </option>
                <option value="Researcher">
                  {t('auth.researcher')}
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
              htmlFor="gender"
              className="uppercase text-gray-600"
            >
              {t('auth.gender')}
            </label>
            <div className="relative w-full">
              <select
              disabled
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
              htmlFor="race"
              className="uppercase text-gray-600"
            >
              {t('auth.race')}
            </label>
            <div className="relative w-full">
              <select
              disabled
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
                  htmlFor="terms"
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
                true ||
                loading ||
                error_name ||
                !first_name ||
                !last_name ||
                error_institution ||
                !institution ||
                error_email ||
                !email ||
                error_password ||
                !password ||
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
          <div className="mt-4 flex justify-center">
            <p className="text-gray-700">
              {t('auth.have_account')}&nbsp;
              <Link
                href={
                  router.query?.ref
                    ? {
                        pathname: '/signin/educator',
                        query: {
                          ref: router.query?.ref,
                        },
                      }
                    : '/signin/educator'
                }
                className="font-bold"
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
