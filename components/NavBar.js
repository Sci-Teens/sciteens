import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSigninCheck } from '../context/AuthContext'
import { auth } from '../lib/firebase'
import { useScrollDirection } from '../lib/useScrollDirection'
import { useContext, useState, useEffect } from 'react'
import { AppContext } from '../context/context'
import { signOut } from '@firebase/auth'

import { useTranslation } from 'next-i18next'

import {
  Home,
  Info,
  Newspaper,
  Folder,
  Compass,
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

// /courses and /course/[slug] stay live and indexable but are deliberately
// absent here: the routes are reachable by direct link only.
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
    active: (p) => p === '/about',
  },
  {
    href: '/articles',
    label: 'articles',
    Icon: Newspaper,
    active: (p) =>
      p === '/articles' ||
      p.startsWith('/articles/') ||
      p.startsWith('/article/'),
  },
  {
    href: '/projects',
    label: 'projects',
    Icon: Folder,
    active: (p) =>
      p === '/projects' ||
      p.startsWith('/projects/') ||
      p.startsWith('/project/'),
  },
  {
    href: '/opportunities',
    label: 'opportunities',
    Icon: Compass,
    active: (p) =>
      p === '/opportunities' ||
      p.startsWith('/opportunities/') ||
      p.startsWith('/program/'),
  },
  {
    href: '/get-involved',
    label: 'get_involved',
    Icon: Users,
    active: (p) => p === '/get-involved',
  },
  {
    href: '/donate',
    label: 'donate',
    Icon: HandHeart,
    active: (p) => p === '/donate',
  },
]

const mobileRowClass = (isActive = false) =>
  `flex flex-row items-center gap-4 rounded-lg px-3 py-3 wrap-anywhere ${
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

  const { t, ready } = useTranslation('common')

  const scrollDirection = useScrollDirection()
  useEffect(() => {
    if (scrollDirection === 'down') {
      setShowMobileNav(false)
    }
  }, [scrollDirection])

  return (
    <nav aria-label={t('navigation.primary')}>
      {ready && (
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
                  aria-current={
                    router.pathname === href
                      ? 'page'
                      : undefined
                  }
                  className={`hover:bg-muted mr-2 hidden whitespace-nowrap rounded-lg p-2 hover:shadow-inner lg:block ${
                    active(router.pathname)
                      ? 'text-primary underline'
                      : 'text-muted-foreground'
                  }`}
                >
                  {t(`navigation.${label}`)}
                </Link>
              ))}
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-11 lg:hidden"
                    aria-label={t('navigation.menu')}
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
                          aria-label={t(
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
                            {t('navigation.profile')}
                          </Link>
                        }
                      />
                      <DropdownMenuItem
                        onClick={handleSignOut}
                      >
                        {t('navigation.sign_out')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : (
                  <Link
                    href="/signup/student"
                    className="bg-primary text-primary-foreground hover:bg-primary/90 mr-2 hidden whitespace-nowrap rounded-lg p-2 shadow-sm lg:block"
                  >
                    {t('navigation.sign_up')}
                  </Link>
                )}
              </div>
            </div>
          </div>
          <SheetContent
            side="right"
            className="text-foreground gap-0 px-4 pb-6 pt-16 text-lg"
            closeLabel={t('auth.close')}
          >
            <SheetTitle className="sr-only">
              {t('navigation.menu')}
            </SheetTitle>
            <nav
              aria-label={t('navigation.primary')}
              className="flex flex-1 flex-col gap-1 overflow-y-auto overscroll-contain"
            >
              {NAV_LINKS.map(
                ({ href, label, Icon, active }) => (
                  <Link
                    key={href}
                    href={href}
                    onNavigate={() =>
                      setShowMobileNav(false)
                    }
                    aria-current={
                      router.pathname === href
                        ? 'page'
                        : undefined
                    }
                    className={mobileRowClass(
                      active(router.pathname)
                    )}
                  >
                    <Icon className="text-muted-foreground h-6 w-6 shrink-0" />
                    <span>{t(`navigation.${label}`)}</span>
                  </Link>
                )
              )}
              {signInCheckResult?.signedIn === false && (
                <Link
                  href="/signup/student"
                  onNavigate={() => setShowMobileNav(false)}
                  aria-current={
                    router.pathname === '/signup/student'
                      ? 'page'
                      : undefined
                  }
                  className={mobileRowClass(
                    router.pathname.startsWith('/signup/')
                  )}
                >
                  <UserPlus className="text-muted-foreground h-6 w-6 shrink-0" />
                  <span>{t('navigation.sign_up')}</span>
                </Link>
              )}
            </nav>
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
                <Link
                  href={profileHref}
                  onNavigate={() => setShowMobileNav(false)}
                  className={mobileRowClass(
                    router.pathname.startsWith('/profile/')
                  )}
                >
                  <User className="text-muted-foreground h-6 w-6 shrink-0" />
                  <span>{t('navigation.profile')}</span>
                </Link>
                <SheetClose
                  render={
                    <button
                      onClick={handleSignOut}
                      className={`${mobileRowClass()} text-left`}
                    >
                      <LogOut className="text-muted-foreground h-6 w-6 shrink-0" />
                      <span className="whitespace-nowrap">
                        {t('navigation.sign_out')}
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
