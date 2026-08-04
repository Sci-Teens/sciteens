import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSigninCheck } from '../context/AuthContext'
import { auth } from '../lib/firebase'
import { useScrollDirection } from '../lib/useScrollDirection'
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
  LogOut,
  User,
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
import { Button } from '@/components/ui/button'

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
    href: '/get-involved',
    label: 'get_involved',
    Icon: Users,
    active: (p) => p.includes('get-involved'),
  },
  {
    href: '/donate',
    label: 'donate',
    Icon: HandHeart,
    active: (p) => p.includes('donate'),
  },
]

const mobileRowClass = (isActive = false) =>
  `flex flex-row items-center gap-4 rounded-lg px-3 py-3 ${
    isActive ? 'bg-muted underline' : ''
  }`

export default function NavBar() {
  const [showMobileNav, setShowMobileNav] = useState(false)

  const router = useRouter()
  const { status, data: signInCheckResult } =
    useSigninCheck()
  const { profile, setProfile } = useContext(AppContext)

  const signedIn =
    status === 'success' &&
    signInCheckResult?.signedIn === true
  const profileHref = profile?.slug
    ? `/profile/${profile.slug}`
    : signInCheckResult?.user?.uid
    ? `/profile/${signInCheckResult.user.uid}`
    : '/'

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
      // See Footer.js: i18next rejects an omitted `resources`.
      i18n.addResourceBundle(router.locale, 'common', {})
  }, [router])

  const scrollDirection = useScrollDirection()
  useEffect(() => {
    if (scrollDirection === 'down') {
      setShowMobileNav(false)
    }
  }, [scrollDirection])

  return (
    <nav suppressHydrationWarning={true}>
      {i18n?.isInitialized && (
        <Sheet
          open={showMobileNav}
          onOpenChange={setShowMobileNav}
        >
          <div className="border-border/60 bg-card text-card-foreground z-50 mx-4 mt-3 flex h-16 items-center justify-between rounded-xl border shadow-sm">
            <div className="inline-block md:w-1/2">
              <Link
                href="/"
                className="relative ml-4 block aspect-[182/161] h-11"
              >
                <Image
                  src="/assets/sciteens_logo_initials.svg"
                  alt="SciTeens"
                  fill
                  sizes="45px"
                  className="object-contain"
                  priority
                />
              </Link>
            </div>
            <div className="mr-4 flex items-center justify-end md:w-1/2">
              {NAV_LINKS.map(({ href, label, active }) => (
                <Link
                  key={href}
                  href={href}
                  className={`hover:bg-muted mr-2 hidden whitespace-nowrap rounded-lg p-2 hover:shadow-inner lg:block ${
                    active(router.pathname)
                      ? 'text-sciteensGreen-regular underline'
                      : 'text-muted-foreground'
                  }`}
                >
                  {i18n.t(`navigation.${label}`)}
                </Link>
              ))}
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="mr-4 lg:hidden"
                    aria-label={i18n.t('navigation.menu')}
                  >
                    <Menu className="h-5 w-5" />
                  </Button>
                }
              />
              <div className="hidden items-center gap-2 lg:flex">
                {signedIn ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <button
                          aria-label={i18n.t(
                            'navigation.profile'
                          )}
                          className="border-background hover:border-muted relative h-10 w-10 overflow-hidden rounded-full border-4 hover:shadow-inner"
                        >
                          {signInCheckResult?.user
                            ?.photoURL ? (
                            <Image
                              src={
                                signInCheckResult.user
                                  .photoURL
                              }
                              alt=""
                              fill
                              sizes="40px"
                              className="rounded-full object-cover"
                            />
                          ) : (
                            <CircleUserRound className="text-muted-foreground h-full w-full" />
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
                          <Link href={profileHref}>
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
                    href="/signup/student"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 mr-2 hidden whitespace-nowrap rounded-lg p-2 shadow-sm lg:block"
                  >
                    {i18n.t('navigation.sign_up')}
                  </Link>
                )}
              </div>
            </div>
          </div>
          <SheetContent
            side="right"
            className="text-foreground gap-0 px-4 pb-6 pt-16 text-lg"
            closeLabel={i18n.t('auth.close')}
          >
            <SheetTitle className="sr-only">
              {i18n.t('navigation.menu')}
            </SheetTitle>
            <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
              {NAV_LINKS.map(
                ({ href, label, Icon, active }) => (
                  <SheetClose
                    key={href}
                    render={
                      <Link
                        href={href}
                        className={mobileRowClass(
                          active(router.pathname)
                        )}
                      >
                        <Icon className="text-muted-foreground h-6 w-6 shrink-0" />
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
                      href="/signup/student"
                      className={mobileRowClass(
                        router.pathname.includes('signup')
                      )}
                    >
                      <UserPlus className="text-muted-foreground h-6 w-6 shrink-0" />
                      <span className="whitespace-nowrap">
                        {i18n.t('navigation.sign_up')}
                      </span>
                    </Link>
                  }
                />
              )}
            </div>
            {signedIn && (
              <div className="border-border/60 mt-4 flex shrink-0 flex-col gap-1 border-t pt-4">
                <div className="flex flex-row items-center gap-4 px-3 py-2">
                  {signInCheckResult?.user?.photoURL ? (
                    <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full">
                      <Image
                        src={
                          signInCheckResult.user.photoURL
                        }
                        alt=""
                        fill
                        sizes="40px"
                        className="object-cover"
                      />
                    </span>
                  ) : (
                    <CircleUserRound className="text-muted-foreground h-10 w-10 shrink-0" />
                  )}
                  <p
                    className="truncate text-lg font-medium"
                    title={
                      signInCheckResult.user.displayName
                    }
                  >
                    {signInCheckResult.user.displayName}
                  </p>
                </div>
                <SheetClose
                  render={
                    <Link
                      href={profileHref}
                      className={mobileRowClass(
                        router.pathname.includes('profile')
                      )}
                    >
                      <User className="text-muted-foreground h-6 w-6 shrink-0" />
                      <span className="whitespace-nowrap">
                        {i18n.t('navigation.profile')}
                      </span>
                    </Link>
                  }
                />
                <SheetClose
                  render={
                    <button
                      onClick={handleSignOut}
                      className={`${mobileRowClass()} text-left`}
                    >
                      <LogOut className="text-muted-foreground h-6 w-6 shrink-0" />
                      <span className="whitespace-nowrap">
                        {i18n.t('navigation.sign_out')}
                      </span>
                    </button>
                  }
                />
              </div>
            )}
          </SheetContent>
        </Sheet>
      )}
    </nav>
  )
}
