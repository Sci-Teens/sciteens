import { useState } from 'react'
import { useAuth } from 'reactfire'
import { useRouter } from 'next/router'
import { sendPasswordResetEmail } from '@firebase/auth'
import isEmail from 'validator/lib/isEmail'
import Head from 'next/head'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function Reset() {
  const { t } = useTranslation('common')

  const [email, setEmail] = useState('')
  const [error_email, setErrorEmail] = useState('')
  const auth = useAuth()
  const router = useRouter()

  async function submitForgotPassword(e) {
    e.preventDefault()
    try {
      await sendPasswordResetEmail(auth, email)
      router.push('/signin/resetsent')
    } catch (e) {
      setErrorEmail(e)
      setEmail('')
    }
  }

  const onChange = (e) => {
    setEmail(e.target.value)
    if (e.target.value == '' || !isEmail(e.target.value)) {
      setErrorEmail(t('auth.valid_email'))
    } else {
      setErrorEmail('')
    }
  }
  return (
    <div>
      <Head>
        <title>Reset Password | SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Reset password on SciTeens"
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, reset password, teen science"
        />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
        <meta property="og:type" content="website" />
      </Head>
      <main className="flex h-screen items-center justify-center">
        <div className="relative z-30 mx-auto mt-8 mb-24 w-11/12 rounded-lg bg-white px-4 py-8 text-left shadow md:w-2/3 md:px-12 md:py-12 lg:w-[45%] lg:px-20">
          <form onSubmit={submitForgotPassword}>
            <h1 className="mb-2 text-center text-3xl font-semibold">
              {t('auth.reset_password')}
            </h1>
            <p className="mb-6 text-center text-gray-700">
              {t('auth.why_reset_password')}
            </p>
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
            <p className="mb-6 text-sm text-red-800">
              {error_email}
            </p>
            <div className="mt-2 mb-10 flex content-end justify-end">
              <button
                type="submit"
                className="outline-none w-full rounded-lg bg-sciteensLightGreen-regular p-2 text-lg font-semibold text-white shadow hover:bg-sciteensLightGreen-dark disabled:opacity-50"
                onClick={submitForgotPassword}
                disabled={error_email}
              >
                {t('auth.reset_password')}
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
