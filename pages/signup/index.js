import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function SignUpIndex() {
  const { t } = useTranslation('common')
  const [show_mentor_info, setShowMentorInfo] =
    useState(false)
  const [show_student_info, setShowStudentInfo] =
    useState(false)

  const router = useRouter()

  console.log(router)

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
            >
              <a className="font-bold">
                {t('auth.sign_in_link')}
              </a>
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
            >
              <a className="m-6 h-56 w-56 rounded bg-white shadow hover:shadow-md">
                {show_student_info ? (
                  <div className="relative pt-8">
                    <img
                      src="/assets/zondicons/close-solid.svg"
                      alt="Close"
                      className="absolute top-0 right-0 m-2 h-6 w-6"
                      onClick={(e) => {
                        e.preventDefault()
                        setShowStudentInfo(
                          !show_student_info
                        )
                      }}
                    />
                    <h2 className="mx-2 text-xl text-sciteensGreen-regular">
                      {t('auth.student_info')}
                    </h2>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src="/assets/zondicons/question.svg"
                      alt="Question"
                      className="absolute top-0 right-0 m-2 h-6 w-6"
                      onClick={(e) => {
                        e.preventDefault()
                        setShowStudentInfo(
                          !show_student_info
                        )
                      }}
                    />
                    <img
                      src="/assets/student.svg"
                      alt="Student Icon"
                      className="mx-auto h-40 p-4"
                    />
                    <h2 className="text-xl text-sciteensGreen-regular">
                      {t('auth.student')}
                    </h2>
                  </div>
                )}
              </a>
            </Link>
            <Link
              href={
                router.query?.ref
                  ? {
                      pathname: '/signup/educator',
                      query: {
                        ref: router.query?.ref,
                      },
                    }
                  : '/signup/educator'
              }
            >
              <a className="m-6 h-56 w-56 rounded bg-white shadow hover:shadow-md">
                {show_mentor_info ? (
                  <div className="relative pt-8">
                    <img
                      src="/assets/zondicons/close-solid.svg"
                      alt="Close"
                      className="absolute top-0 right-0 m-2 h-6 w-6"
                      onClick={(e) => {
                        e.preventDefault()
                        setShowMentorInfo(!show_mentor_info)
                      }}
                    />
                    <h2 className="mx-2 text-lg text-sciteensGreen-regular">
                      {t('auth.educator_info')}
                    </h2>
                  </div>
                ) : (
                  <div className="relative">
                    <img
                      src="/assets/zondicons/question.svg"
                      alt="Question"
                      className="absolute top-0 right-0 m-2 h-6 w-6"
                      onClick={(e) => {
                        e.preventDefault()
                        setShowMentorInfo(!show_mentor_info)
                      }}
                    />
                    <img
                      src="/assets/mentor.svg"
                      alt="Student Icon"
                      className="mx-auto h-40 p-4"
                    />
                    <h2 className="text-xl text-sciteensGreen-regular">
                      {t('auth.educator')}
                    </h2>
                    <p className="text-sm italic text-gray-700">
                      {t('auth.and_other_options')}
                    </p>
                  </div>
                )}
              </a>
            </Link>
          </div>
          <div className="mb-1/4 mx-auto">
            <p className="text-gray-700">
              {t('auth.neither_of_above')}&nbsp;
              <Link href="/getinvolved">
                <a className="font-bold">
                  {t('auth.involved_link')}
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
