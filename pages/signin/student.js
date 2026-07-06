import { useContext, useState } from 'react'

import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import { auth, db as firestore } from '../../lib/firebase'
import { doc, getDoc } from '@firebase/firestore'
import { signInWithEmailAndPassword } from '@firebase/auth'

import isEmail from 'validator/lib/isEmail'

import { AppContext } from '../../context/context'
import {
  validatePassword,
  providerSignIn,
  resolveRefPath,
} from '../../context/helpers'

export default function StudentSignIn() {
  const { t } = useTranslation('common')
  const f_signin_errors = {
    'auth/invalid-email': t('auth.auth_invalid_email'),
    'auth/user-disabled': t('auth.auth_user_disabled'),
    'auth/user-not-found': t('auth.auth_user_not_found'),
    'auth/wrong-password': t('auth.auth_wrong_password'),
    'Please verify your email before signing in': t(
      'auth.please_verify'
    ),
  }

  const [error_email, setErrorEmail] = useState('')
  const [error_password, setErrorPassword] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [, setLoading] = useState(false)
  const router = useRouter()

  const { setProfile } = useContext(AppContext)

  async function emailSignIn(event) {
    event.preventDefault()
    setLoading(true)
    try {
      const res = await signInWithEmailAndPassword(
        auth,
        email,
        password
      )
      const prof = await getDoc(
        doc(firestore, 'profiles', res.user.uid)
      )
      setProfile(prof.data())
      const dest = resolveRefPath(router.query.ref)
      router.push(dest || '/')
    } catch (e) {
      console.log(e.code)
      f_signin_errors[e.code]
        ? setErrorEmail(f_signin_errors[e.code])
        : setErrorEmail(t('auth.sign_in_failed'))
      setEmail('')
      setLoading(false)
    }
  }

  const onChange = (e, target) => {
    switch (target) {
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

  return (
    <div>
      <Head>
        <title>Student Sign In | SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Student Sign In to SciTeens"
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, student sign in, teen science"
        />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
        <meta property="og:type" content="website" />
      </Head>
      <main>
        <div className="relative z-30 mx-auto mb-24 mt-8 w-11/12 rounded-lg bg-white px-4 py-8 text-left shadow-sm md:w-2/3 md:px-12 md:py-12 lg:w-[45%] lg:px-20">
          <h1 className="mb-2 text-center text-3xl font-semibold">
            {t('auth.student_sign_in')}
          </h1>
          <p className="mb-6 text-center text-gray-700">
            {t('auth.why_student_sign_in')}&nbsp;
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
              className="cursor-pointer font-bold"
            >
              {t('auth.sign_in_here')}
            </Link>
          </p>
          <form onSubmit={emailSignIn}>
            <label
              htmlFor="email"
              className="uppercase text-gray-600"
            >
              {t('auth.email')}
            </label>
            <input
              value={email}
              onChange={(e) => onChange(e, 'email')}
              name="email"
              required
              className={`mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight ${
                error_email
                  ? 'border-red-700 text-red-800 placeholder-red-700'
                  : 'placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular text-gray-700 focus:bg-white'
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
              value={password}
              onChange={(e) => onChange(e, 'password')}
              name="password"
              required
              className={`mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight ${
                error_password
                  ? 'border-red-700 text-red-800 placeholder-red-700'
                  : 'placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular text-gray-700 focus:bg-white'
              }`}
              type="password"
              aria-label="password"
            />
            <p className="mb-2 text-sm text-red-800">
              {error_password}
            </p>

            <div className="my-2 flex flex-col justify-between">
              <Link
                href="/signin/reset"
                className="mb-2 mr-1 flex-1 rounded-sm py-2 text-sm text-gray-600"
              >
                {t('auth.reset_password')}
              </Link>

              <button
                type="submit"
                className="bg-sciteensLightGreen-regular hover:bg-sciteensLightGreen-dark w-full rounded-lg p-2 text-lg font-semibold text-white shadow-sm disabled:opacity-50"
                onClick={emailSignIn}
                disabled={
                  error_email ||
                  error_password ||
                  !email.length ||
                  !password.length
                }
              >
                {t('auth.sign_in')}
              </button>
            </div>
          </form>
          <div className="mb-8 mt-4 h-3 w-full border-b border-gray-300 text-center">
            <span className="bg-white p-2">
              {t('auth.or')}
            </span>
          </div>
          <button
            className="mb-2 flex w-full items-center justify-center rounded-sm bg-white p-2 shadow-sm hover:shadow-md"
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
              {t('auth.new_here')}&nbsp;
              <Link
                href={
                  router.query?.ref
                    ? {
                        pathname: '/signup/student',
                        query: {
                          ref: router.query?.ref,
                        },
                      }
                    : '/signup/student'
                }
                className="font-bold"
              >
                {t('auth.sign_up')}
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
