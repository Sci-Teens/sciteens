import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { X, CircleHelp } from 'lucide-react'

export default function SignUpIndex() {
  const { t } = useTranslation('common')
  const [show_student_info, setShowStudentInfo] =
    useState(false)

  const router = useRouter()

  return (
    <div>
      <Head>
        <title>Sign Up | SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Sign up for SciTeens"
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
      <main className="-mt-8 flex h-screen justify-center">
        <div className="flex flex-col items-center justify-center text-center">
          <h1 className="text-4xl">{t('auth.i_am_a')}</h1>
          <div className="mx-auto">
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
              className="font-bold"
            >
              {t('auth.sign_in_link')}
            </Link>
          </div>
          <div className="mx-auto flex flex-wrap justify-center">
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
              className="m-6 h-56 w-56 rounded-sm bg-white shadow-sm hover:shadow-md"
            >
              {show_student_info ? (
                <div className="relative pt-8">
                  <button
                    type="button"
                    aria-label={t('auth.close')}
                    className="absolute right-0 top-0 m-2 h-6 w-6"
                    onClick={(e) => {
                      e.preventDefault()
                      setShowStudentInfo(!show_student_info)
                    }}
                  >
                    <X className="h-6 w-6" />
                  </button>
                  <h2 className="text-sciteensGreen-regular mx-2 text-xl">
                    {t('auth.student_info')}
                  </h2>
                </div>
              ) : (
                <div className="relative">
                  <button
                    type="button"
                    aria-label={t('auth.more_info')}
                    className="absolute right-0 top-0 m-2 h-6 w-6"
                    onClick={(e) => {
                      e.preventDefault()
                      setShowStudentInfo(!show_student_info)
                    }}
                  >
                    <CircleHelp className="h-6 w-6" />
                  </button>
                  <Image
                    src="/assets/student.svg"
                    alt="Student Icon"
                    width={148}
                    height={160}
                    unoptimized
                    className="mx-auto h-40 w-auto p-4"
                  />
                  <h2 className="text-sciteensGreen-regular text-xl">
                    {t('auth.student')}
                  </h2>
                </div>
              )}
            </Link>
          </div>
          <div className="mb-1/4 mx-auto">
            <p className="text-gray-700">
              {t('auth.neither_of_above')}&nbsp;
              <Link
                href="/getinvolved"
                className="font-bold"
              >
                {t('auth.involved_link')}
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
