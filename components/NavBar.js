import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSigninCheck } from '../context/AuthContext'
import { auth } from '../lib/firebase'
import { useContext, useState, useEffect } from 'react'
import { AppContext } from '../context/context'
import { signOut } from '@firebase/auth'

import { i18n, useTranslation } from 'next-i18next'

import {
  Home,
  Info,
  Newspaper,
  Folder,
  GraduationCap,
  Users,
  HandHeart,
  UserPlus,
  Menu,
  CircleUserRound,
} from 'lucide-react'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

const NAV_LINKS = [
  {
    href: '/',
    label: 'home',
    Icon: Home,
    active: (p) => p === '/',
  },
  {
    href: '/about',
    label: 'about',
    Icon: Info,
    active: (p) => p.includes('about'),
  },
  {
    href: '/articles',
    label: 'articles',
    Icon: Newspaper,
    active: (p) => p.includes('articles'),
  },
  {
    href: '/projects',
    label: 'projects',
    Icon: Folder,
    active: (p) => p.includes('projects'),
  },
  {
    href: '/courses',
    label: 'courses',
    Icon: GraduationCap,
    active: (p) => p.includes('courses'),
  },
  {
    href: '/getinvolved',
    label: 'get_involved',
    Icon: Users,
    active: (p) => p.includes('getinvolved'),
  },
  {
    href: '/donate',
    label: 'donate',
    Icon: HandHeart,
    active: (p) => p.includes('donate'),
  },
]

export default function NavBar() {
  const [showMobileNav, setShowMobileNav] = useState(false)

  const router = useRouter()
  const { status, data: signInCheckResult } =
    useSigninCheck()
  const { profile, setProfile } = useContext(AppContext)

  const signedIn =
    status === 'success' &&
    signInCheckResult?.signedIn === true

  async function handleSignOut() {
    setProfile({})
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('profile')
    }
    signOut(auth)
  }

  useTranslation('common')

  useEffect(() => {
    if (router.isReady && i18n?.isInitialized)
      i18n.addResourceBundle(router.locale, 'common')
  }, [router, i18n])

  useEffect(() => {
    let previousY = document.documentElement.scrollTop
    function handleScroll() {
      let currentY = document.documentElement.scrollTop

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
    }
    document.addEventListener('scroll', handleScroll, {
      passive: true,
    })

    return () => {
      document.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <nav suppressHydrationWarning={true}>
      {i18n?.isInitialized && (
        <Sheet
          open={showMobileNav}
          onOpenChange={setShowMobileNav}
        >
          <div className="z-50 mx-4 mt-3 flex h-16 items-center justify-between rounded-lg bg-white shadow-sm">
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
              {NAV_LINKS.map(({ href, label, active }) => (
                <Link
                  key={href}
                  href={href}
                  className={`mr-2 hidden whitespace-nowrap rounded-lg p-2 hover:bg-gray-200 hover:shadow-inner lg:block ${
                    active(router.pathname)
                      ? 'text-sciteensGreen-regular underline'
                      : 'text-gray-700'
                  }`}
                >
                  {i18n.t(`navigation.${label}`)}
                </Link>
              ))}
              <SheetTrigger
                render={
                  <button
                    className="mr-4 lg:hidden"
                    aria-label={i18n.t('navigation.menu')}
                  >
                    <Menu className="h-8 w-8 text-gray-700" />
                  </button>
                }
              />
              <div className="hidden lg:flex">
                {signedIn ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          aria-label={i18n.t(
                            'navigation.profile'
                          )}
                          className="relative h-10 w-10 rounded-full border-4 border-white hover:border-gray-100 hover:shadow-inner"
                        >
                          {signInCheckResult?.user
                            ?.photoURL ? (
                            <img
                              id="profile_photo"
                              src={
                                signInCheckResult.user
                                  .photoURL
                              }
                              className="rounded-full object-contain"
                              alt=""
                            />
                          ) : (
                            <CircleUserRound className="h-full w-full text-gray-700" />
                          )}
                        </button>
                      }
                    />
                    <DropdownMenuContent
                      align="end"
                      className="w-40"
                    >
                      <DropdownMenuItem
                        render={
                          <Link
                            href={`/profile/${
                              profile?.slug
                                ? profile.slug
                                : ''
                            }`}
                          >
                            {i18n.t('navigation.profile')}
                          </Link>
                        }
                      />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                      >
                        {i18n.t('navigation.sign_out')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    href="/signup"
                    className="bg-sciteensLightGreen-regular hover:bg-sciteensLightGreen-dark mr-2 hidden whitespace-nowrap rounded-lg p-2 text-white shadow-sm lg:block"
                  >
                    {i18n.t('navigation.sign_up')}
                  </Link>
                )}
              </div>
            </div>
          </div>
          <SheetContent
            side="right"
            className="px-6 pt-16 text-lg text-gray-700"
          >
            <SheetTitle className="sr-only">
              {i18n.t('navigation.menu')}
            </SheetTitle>
            <div className="flex flex-col">
              {NAV_LINKS.map(
                ({ href, label, Icon, active }) => (
                  <SheetClose
                    key={href}
                    render={
                      <Link
                        href={href}
                        className={`mb-4 flex flex-row items-center rounded-lg px-6 py-3 ${
                          active(router.pathname)
                            ? 'bg-gray-100 underline'
                            : ''
                        }`}
                      >
                        <Icon className="mr-4 h-6 w-6 text-gray-700" />
                        <span className="whitespace-nowrap">
                          {i18n.t(`navigation.${label}`)}
                        </span>
                      </Link>
                    }
                  />
                )
              )}
              {signInCheckResult?.signedIn === false && (
                <SheetClose
                  render={
                    <Link
                      href="/signup"
                      className={`mb-4 flex flex-row items-center rounded-lg px-6 py-3 ${
                        router.pathname.includes('signup')
                          ? 'bg-gray-100 underline'
                          : ''
                      }`}
                    >
                      <UserPlus className="mr-4 h-6 w-6 text-gray-700" />
                      <span className="whitespace-nowrap">
                        {i18n.t('navigation.sign_up')}
                      </span>
                    </Link>
                  }
                />
              )}
            </div>
            {signedIn && (
              <>
                <hr className="mx-auto w-[80%] bg-black" />
                <div className="mx-8">
                  <div className="mx-auto mb-2 mt-6 flex flex-row items-center">
                    {signInCheckResult?.user?.photoURL ? (
                      <img
                        id="profile_photo"
                        src={
                          signInCheckResult.user.photoURL
                        }
                        className="mr-6 h-10 rounded-full"
                        alt=""
                      />
                    ) : (
                      <CircleUserRound className="mr-6 h-10 w-10 text-gray-700" />
                    )}
                    <p className="my-auto text-xl">
                      {signInCheckResult.user.displayName}
                    </p>
                  </div>
                  <div className="ml-4 flex flex-col text-left">
                    <SheetClose
                      render={
                        <Link
                          href={`/profile/${
                            profile?.slug
                              ? profile.slug
                              : ''
                          }`}
                          className="flex flex-row items-center"
                        >
                          <div
                            className={`mr-6 h-auto w-0.5 ${
                              router.pathname.includes(
                                'profile'
                              )
                                ? 'bg-sciteensLightGreen-regular'
                                : 'bg-gray-400'
                            }`}
                          />
                          <span>
                            {i18n.t('navigation.profile')}
                          </span>
                        </Link>
                      }
                    />
                    <div className="h-2 w-0.5 bg-gray-400" />
                    <div className="flex flex-row">
                      <div className="mr-6 h-auto w-0.5 bg-gray-400" />
                      <SheetClose
                        render={
                          <button onClick={handleSignOut}>
                            {i18n.t('navigation.sign_out')}
                          </button>
                        }
                      />
                    </div>
                  </div>
                </div>
              </>
            )}
          </SheetContent>
        </Sheet>
      )}
    </nav>
  )
}
