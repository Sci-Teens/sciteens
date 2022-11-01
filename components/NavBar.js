import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSigninCheck, useAuth } from 'reactfire'
import {
  useContext,
  useState,
  useEffect,
  useRef,
} from 'react'
import { AppContext } from '../context/context'
import { signOut } from '@firebase/auth'

import { i18n, useTranslation } from 'next-i18next'

export default function NavBar() {
  const [showMobileNav, setShowMobileNav] = useState(false)
  const [showProfileMenu, setShowProfileMenu] =
    useState(false)

  const router = useRouter()
  const auth = useAuth()
  const { status, data: signInCheckResult } =
    useSigninCheck()
  const { profile, setProfile } = useContext(AppContext)

  async function handleSignOut() {
    setProfile({})
    signOut(auth)
  }

  function handleSignOutAndClose() {
    setShowMobileNav(false)
    handleSignOut()
  }

  const menuRef = useRef()

  function handleClick(e) {
    if (
      menuRef.current &&
      menuRef.current.contains(e.target)
    ) {
      return
    }
    setShowMobileNav(false)
  }

  const { t } = useTranslation('common')

  useEffect(() => {
    if (router.isReady && i18n?.isInitialized)
      i18n.addResourceBundle(router.locale, 'common')
  }, [router, i18n])

  useEffect(() => {
    document.addEventListener('mousedown', handleClick)

    // Functionality for showing/removing navbar based on scroll behavior
    let previousY = document.documentElement.scrollTop
    document.addEventListener('scroll', function () {
      let currentY = document.documentElement.scrollTop

      // If you're within 350px from the top of the page, the scrollbar is always visible
      if (currentY <= 350) {
        previousY = currentY
      } else {
        if (currentY - previousY >= 200) {
          setShowMobileNav(false)
          previousY = currentY
        }
        if (previousY - currentY >= 200) {
          previousY = currentY
        }
      }
    })

    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('scroll', function () {})
    }
  }, [])

  return (
    <nav suppressHydrationWarning={true}>
      {i18n?.isInitialized && (
        <>
          <div
            className={`z-50 mx-4 mt-3 flex h-16 items-center justify-between rounded-lg bg-white shadow`}
          >
            <div className="inline-block md:w-1/2">
              <Link href="/">
                <img
                  className="ml-4 h-16"
                  src={
                    '../assets/sciteens_logo_initials.svg'
                  }
                  alt=""
                />
              </Link>
            </div>
            <div className="mr-4 flex items-center justify-end md:w-1/2">
              <Link href="/">
                <a
                  className={`mr-2 hidden rounded-lg p-2 text-gray-700 hover:bg-gray-200 hover:shadow-inner lg:block ${
                    router.pathname == '/'
                      ? 'text-sciteensGreen-regular underline'
                      : 'text-gray-700'
                  }`}
                >
                  {i18n.t('navigation.home')}
                </a>
              </Link>
              <Link href="/about">
                <a
                  className={`mr-2 hidden rounded-lg p-2 text-gray-700 hover:bg-gray-200 hover:shadow-inner lg:block ${
                    router.pathname.includes('about')
                      ? 'text-sciteensGreen-regular underline'
                      : 'text-gray-700'
                  }`}
                >
                  {i18n.t('navigation.about')}
                </a>
              </Link>
              <Link href="/articles">
                <a
                  className={`mr-2 hidden rounded-lg p-2 text-gray-700 hover:bg-gray-200 hover:shadow-inner lg:block ${
                    router.pathname.includes('articles')
                      ? 'text-sciteensGreen-regular underline'
                      : 'text-gray-700'
                  }`}
                >
                  {i18n.t('navigation.articles')}
                </a>
              </Link>
              <Link href="/projects">
                <a
                  className={`mr-2 hidden rounded-lg p-2 text-gray-700 hover:bg-gray-200 hover:shadow-inner lg:block ${
                    router.pathname.includes('projects')
                      ? 'text-sciteensGreen-regular underline'
                      : 'text-gray-700'
                  }`}
                >
                  {i18n.t('navigation.projects')}
                </a>
              </Link>
              <Link href="/courses">
                <a
                  className={`mr-2 hidden rounded-lg p-2 text-gray-700 hover:bg-gray-200 hover:shadow-inner lg:block ${
                    router.pathname.includes('courses')
                      ? 'text-sciteensGreen-regular underline'
                      : 'text-gray-700'
                  }`}
                >
                  {i18n.t('navigation.courses')}
                </a>
              </Link>
              <Link href="/getinvolved">
                <a
                  className={`mr-2 hidden whitespace-nowrap rounded-lg p-2 text-gray-700 hover:bg-gray-200 hover:shadow-inner lg:block ${
                    router.pathname.includes('getinvolved')
                      ? 'text-sciteensGreen-regular underline'
                      : 'text-gray-700'
                  }`}
                >
                  {i18n.t('navigation.get_involved')}
                </a>
              </Link>
              <Link href="/donate">
                <a
                  className={`mr-2 hidden rounded-lg p-2 text-gray-700 hover:bg-gray-200 hover:shadow-inner lg:block ${
                    router.pathname.includes('donate')
                      ? 'text-sciteensGreen-regular underline'
                      : 'text-gray-700'
                  }`}
                >
                  {i18n.t('navigation.donate')}
                </a>
              </Link>
              <button
                onClick={() => setShowMobileNav(true)}
                className="mr-4 lg:hidden"
              >
                <svg
                  className="h-8"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                >
                  <path
                    fill="#4A5568"
                    d="M0 3h20v2H0V3zm0 6h20v2H0V9zm0 6h20v2H0v-2z"
                  />
                </svg>{' '}
              </button>
              <div className="hidden lg:flex">
                {status === 'success' &&
                signInCheckResult?.signedIn === true ? (
                  <div
                    onClick={() =>
                      setShowProfileMenu(!showProfileMenu)
                    }
                  >
                    <button className="relative h-10 w-10 rounded-full border-4 border-white hover:border-gray-100 hover:shadow-inner">
                      {signInCheckResult?.user?.photoURL ? (
                        <img
                          id="profile_photo"
                          src={
                            signInCheckResult.user.photoURL
                          }
                          className="rounded-full object-contain"
                        />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          className="rounded-full object-contain"
                        >
                          <path
                            fill="#4A5568"
                            d="M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM7 6v2a3 3 0 1 0 6 0V6a3 3 0 1 0-6 0zm-3.65 8.44a8 8 0 0 0 13.3 0 15.94 15.94 0 0 0-13.3 0z"
                          />
                        </svg>
                      )}
                    </button>
                    <div
                      onClick={() =>
                        setShowProfileMenu(false)
                      }
                      className={`absolute top-14 right-4 z-50 w-32 rounded-lg border border-gray-200 bg-white p-4 shadow-lg ${
                        showProfileMenu ? '' : 'hidden'
                      }`}
                    >
                      <Link
                        href={`/profile/${
                          profile?.slug ? profile.slug : ''
                        }`}
                      >
                        <a className="rounded-lg px-3 py-1.5 hover:bg-gray-200">
                          {i18n.t('navigation.profile')}
                        </a>
                      </Link>
                      <button
                        onClick={handleSignOut}
                        className="mt-2 rounded-lg px-3 py-1.5 hover:bg-gray-200"
                      >
                        {i18n.t('navigation.sign_out')}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <Link href="/signup">
                      <a
                        className={`mr-2 hidden whitespace-nowrap rounded-lg bg-sciteensLightGreen-regular p-2 text-white shadow hover:bg-sciteensLightGreen-dark lg:block`}
                      >
                        {i18n.t('navigation.sign_up')}
                      </a>
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div
            ref={menuRef}
            className={`fixed right-0 top-0 h-screen transform bg-white text-lg text-gray-700 transition-all duration-500
            ${showMobileNav ? '' : 'translate-x-full'}`}
          >
            <div className="flex flex-col px-6 pt-16">
              <Link href="/">
                <div
                  onClick={() => setShowMobileNav(false)}
                  className={`mb-4 flex flex-row rounded-lg py-3 px-6
                        ${
                          router.pathname == '/'
                            ? 'bg-gray-100 underline'
                            : ''
                        }`}
                >
                  <svg
                    className="my-auto mr-4 h-6"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="#4A5568"
                  >
                    <path d="M8 20H3V10H0L10 0l10 10h-3v10h-5v-6H8v6z" />
                  </svg>
                  <p>{i18n.t('navigation.home')}</p>
                </div>
              </Link>
              <Link href="/about">
                <div
                  onClick={() => setShowMobileNav(false)}
                  className={`mb-4 flex flex-row rounded-lg py-3 px-6
                        ${
                          router.pathname.includes('about')
                            ? 'bg-gray-100 underline'
                            : ''
                        }`}
                >
                  <svg
                    className="my-auto mr-4 h-6"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fill="#4A5568"
                      d="M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm2-13c0 .28-.21.8-.42 1L10 9.58c-.57.58-1 1.6-1 2.42v1h2v-1c0-.29.21-.8.42-1L13 9.42c.57-.58 1-1.6 1-2.42a4 4 0 1 0-8 0h2a2 2 0 1 1 4 0zm-3 8v2h2v-2H9z"
                    />
                  </svg>
                  <p>{i18n.t('navigation.about')}</p>
                </div>
              </Link>
              <Link href="/articles">
                <div
                  onClick={() => setShowMobileNav(false)}
                  className={`mb-4 flex flex-row rounded-lg py-3 px-6
                        ${
                          router.pathname.includes(
                            'articles'
                          )
                            ? 'bg-gray-100 underline'
                            : ''
                        }`}
                >
                  <svg
                    className="my-auto mr-4 h-6"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="#4A5568"
                  >
                    <path d="M16 2h4v15a3 3 0 0 1-3 3H3a3 3 0 0 1-3-3V0h16v2zm0 2v13a1 1 0 0 0 1 1 1 1 0 0 0 1-1V4h-2zM2 2v15a1 1 0 0 0 1 1h11.17a2.98 2.98 0 0 1-.17-1V2H2zm2 8h8v2H4v-2zm0 4h8v2H4v-2zM4 4h8v4H4V4z" />
                  </svg>
                  <p>{i18n.t('navigation.articles')}</p>
                </div>
              </Link>
              <Link href="/projects">
                <div
                  onClick={() => setShowMobileNav(false)}
                  className={`mb-4 flex flex-row rounded-lg py-3 px-6
                        ${
                          router.pathname.includes(
                            'projects'
                          )
                            ? 'bg-gray-100 underline'
                            : ''
                        }`}
                >
                  <svg
                    className="my-auto mr-4 h-6"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="#4A5568"
                  >
                    <path d="M0 4c0-1.1.9-2 2-2h7l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4z" />
                  </svg>
                  <p>{i18n.t('navigation.projects')}</p>
                </div>
              </Link>
              <Link href="/courses">
                <div
                  onClick={() => setShowMobileNav(false)}
                  className={`mb-4 flex flex-row rounded-lg py-3 px-6
                        ${
                          router.pathname.includes(
                            'courses'
                          )
                            ? 'bg-gray-100 underline'
                            : ''
                        }`}
                >
                  <svg
                    className="my-auto mr-4 h-6"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="#4A5568"
                  >
                    <path d="M3.33 8L10 12l10-6-10-6L0 6h10v2H3.33zM0 8v8l2-2.22V9.2L0 8zm10 12l-5-3-2-1.2v-6l7 4.2 7-4.2v6L10 20z" />
                  </svg>
                  <p>{i18n.t('navigation.courses')}</p>
                </div>
              </Link>
              <Link href="/getinvolved">
                <div
                  onClick={() => setShowMobileNav(false)}
                  className={`mb-4 flex flex-row rounded-lg py-3 px-6
                        ${
                          router.pathname.includes(
                            'getinvolved'
                          )
                            ? 'bg-gray-100 underline'
                            : ''
                        }`}
                >
                  <svg
                    className="my-auto mr-4 h-6"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="#4A5568"
                  >
                    <path d="M7 8a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0 1c2.15 0 4.2.4 6.1 1.09L12 16h-1.25L10 20H4l-.75-4H2L.9 10.09A17.93 17.93 0 0 1 7 9zm8.31.17c1.32.18 2.59.48 3.8.92L18 16h-1.25L16 20h-3.96l.37-2h1.25l1.65-8.83zM13 0a4 4 0 1 1-1.33 7.76 5.96 5.96 0 0 0 0-7.52C12.1.1 12.53 0 13 0z" />
                  </svg>
                  <p className="whitespace-nowrap">
                    {i18n.t('navigation.get_involved')}
                  </p>
                </div>
              </Link>
              <Link href="/donate">
                <div
                  onClick={() => setShowMobileNav(false)}
                  className={`mb-4 flex flex-row rounded-lg py-3 px-6
                        ${
                          router.pathname.includes('donate')
                            ? 'bg-gray-100 underline'
                            : ''
                        }`}
                >
                  <svg
                    className="my-auto mr-4 h-6"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="#4A5568"
                  >
                    <path d="M0 4c0-1.1.9-2 2-2h15a1 1 0 0 1 1 1v1H2v1h17a1 1 0 0 1 1 1v10a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm16.5 9a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z" />
                  </svg>
                  <p>{i18n.t('navigation.donate')}</p>
                </div>
              </Link>
              {signInCheckResult?.signedIn === false && (
                <Link href="/signup">
                  <div
                    onClick={() => setShowMobileNav(false)}
                    className={`mb-4 flex flex-row rounded-lg py-3 px-6
                            ${
                              router.pathname.includes(
                                'signup'
                              )
                                ? 'bg-gray-100 underline'
                                : ''
                            }`}
                  >
                    <svg
                      className="my-auto mr-4 h-6"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="#4A5568"
                    >
                      <path d="M2 6H0v2h2v2h2V8h2V6H4V4H2v2zm7 0a3 3 0 0 1 6 0v2a3 3 0 0 1-6 0V6zm11 9.14A15.93 15.93 0 0 0 12 13c-2.91 0-5.65.78-8 2.14V18h16v-2.86z" />
                    </svg>{' '}
                    <p className="whitespace-nowrap">
                      Sign Up
                    </p>
                  </div>
                </Link>
              )}
            </div>
            {status === 'success' &&
              signInCheckResult?.signedIn === true && (
                <>
                  <hr className="mx-auto w-[80%] bg-black" />
                  <div className="mx-8">
                    <div className="mx-auto mt-6 mb-2 flex flex-row">
                      {signInCheckResult?.user?.photoURL ? (
                        <img
                          id="profile_photo"
                          src={
                            signInCheckResult.user.photoURL
                          }
                          className="mr-6 h-10 rounded-full"
                        />
                      ) : (
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          className="mr-6 h-10 rounded-full"
                        >
                          <path
                            fill="#4A5568"
                            d="M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM7 6v2a3 3 0 1 0 6 0V6a3 3 0 1 0-6 0zm-3.65 8.44a8 8 0 0 0 13.3 0 15.94 15.94 0 0 0-13.3 0z"
                          />
                        </svg>
                      )}

                      <p className="my-auto text-xl">
                        {signInCheckResult.user.displayName}
                      </p>
                    </div>
                    <div className="ml-4 flex flex-col text-left">
                      <Link
                        href={`/profile/${
                          profile?.slug ? profile.slug : ''
                        }`}
                      >
                        <div className="flex flex-row">
                          <div
                            className={`mr-6 h-auto w-0.5
                                        ${
                                          router.pathname.includes(
                                            'profile'
                                          )
                                            ? 'bg-sciteensLightGreen-regular'
                                            : 'bg-gray-400'
                                        }`}
                          />
                          <p
                            onClick={() =>
                              setShowMobileNav(false)
                            }
                          >
                            {i18n.t('navigation.profile')}
                          </p>
                        </div>
                      </Link>
                      <div className="h-2 w-0.5 bg-gray-400" />
                      <div className="flex flex-row">
                        <div className="mr-6 h-auto w-0.5 bg-gray-400" />
                        <button
                          onClick={handleSignOutAndClose}
                        >
                          {i18n.t('navigation.sign_out')}
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            <button
              onClick={() => setShowMobileNav(false)}
              className="absolute top-6 right-6 z-30"
            >
              <svg
                className="h-8"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
              >
                <path
                  fill="#4A5568"
                  d="M10 8.586L2.929 1.515 1.515 2.929 8.586 10l-7.071 7.071 1.414 1.414L10 11.414l7.071 7.071 1.414-1.414L11.414 10l7.071-7.071-1.414-1.414L10 8.586z"
                />
              </svg>{' '}
            </button>
          </div>
        </>
      )}
    </nav>
  )
}
