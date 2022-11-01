import { useState, useContext, useEffect } from 'react'
import isAlpha from 'validator/lib/isAlpha'
import { doc, setDoc } from '@firebase/firestore'
import { updateProfile } from '@firebase/auth'
import { useFirestore, useUser } from 'reactfire'
import { useRouter } from 'next/router'
import moment from 'moment'
import Head from 'next/head'
import Link from 'next/link'
import { AppContext } from '../../context/context'
import { createUniqueSlug } from '../../context/helpers'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function FinishSignUp() {
  const { t } = useTranslation('common')
  const [first_name, setFirstName] = useState('')
  const [last_name, setLastName] = useState('')
  const [birthday, setBirthday] = useState('')
  const [gender, setGender] = useState('Male')
  const [race, setRace] = useState(
    'American Indian or Alaska Native'
  )
  const [terms, setTerms] = useState(false)
  const [loading, setLoading] = useState(false)

  const [error_name, setErrorName] = useState('')
  const [error_birthday, setErrorBirthday] = useState('')
  const [error_terms, setErrorTerms] = useState('')

  const firestore = useFirestore()
  const { data: user } = useUser()
  const router = useRouter()

  const { setProfile } = useContext(AppContext)

  useEffect(() => {
    if (router.isReady) {
      setFirstName(
        router?.query?.first_name
          ? router.query.first_name
          : ''
      )
      setLastName(
        router?.query?.last_name
          ? router.query.last_name
          : ''
      )
    }
  }, [router])

  async function finishSignUp() {
    if (!terms) {
      setErrorTerms(t('auth.error_terms'))
    } else {
      setLoading(true)
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
        await setDoc(
          doc(firestore, 'profiles', user.uid),
          profile
        )
        await setDoc(
          doc(firestore, 'profile-slugs', unique_slug),
          { slug: unique_slug }
        )
        await setDoc(doc(firestore, 'emails', user.uid), {
          email: user.email,
        })
        await updateProfile(user, {
          displayName: first_name + ' ' + last_name,
        })
        setProfile(profile)
        router.push('/')
      } catch (error) {
        setLoading(false)
        setErrorName(t('auth.sign_in_failed'))
        console.error(error)
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

        console.log(e.target.value)
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
    }
  }

  return (
    <div>
      <Head>
        <title>Finish Sign Up | SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Finish Signing Up to SciTeens"
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, finish sign up, teen science"
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
            {t('auth.finish_signup')}
          </h1>
          <p className="mb-6 text-center text-gray-700">
            {t('auth.why_finish_signup')}
          </p>

          <form onSubmit={finishSignUp}>
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

              <div className="ml-2">
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
                : 'Your date of birth. You must be 13 years of age or older to use SciTeens'}
            </p>

            <label
              for="gender"
              className="uppercase text-gray-600"
            >
              {t('auth.gender')}
            </label>
            <select
              onChange={(e) => setGender(e.target.value)}
              name="gender"
              id="gender"
              value={gender}
              className="focus:outline-none mb-4 mr-3 w-full appearance-none rounded border-2 border-transparent bg-gray-100 p-2 leading-tight text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white focus:placeholder-gray-700"
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

            <label
              for="race"
              className="uppercase text-gray-600"
            >
              {t('auth.race')}
            </label>
            <select
              onChange={(e) => setRace(e.target.value)}
              name="race"
              id="race"
              value={race}
              className="focus:outline-none mb-4 mr-3 w-full appearance-none rounded border-2 border-transparent bg-gray-100 p-2 leading-tight text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white focus:placeholder-gray-700"
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

            <div className="my-2 flex flex-col justify-between">
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
                  loading || error_name || error_birthday
                }
                className="outline-none w-full rounded-lg bg-sciteensLightGreen-regular p-2 text-lg font-semibold text-white shadow hover:bg-sciteensLightGreen-dark disabled:opacity-50"
                onClick={finishSignUp}
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
            </div>
          </form>
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
