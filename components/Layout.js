import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import { useTranslation } from 'next-i18next'
import Banner from '../components/Banner'
import Analytics from './Analytics'
import { useScrollDirection } from '../lib/useScrollDirection'

const NavBar = dynamic(() => import('./NavBar'), {
  ssr: false,
})

const Footer = dynamic(() => import('./Footer'), {
  ssr: false,
})

const CookieConsent = dynamic(
  () => import('./CookieConsent'),
  { ssr: false }
)

// Matches the nav's rendered height (mt-3 + h-16) when no banner is
// showing, so the content doesn't jump on first paint.
const DEFAULT_NAV_HEIGHT = 76

export default function Layout({ children }) {
  const { t, ready } = useTranslation('common')
  const [visibleBanner, setVisibleBanner] = useState(true)
  const navWrapRef = useRef(null)
  const [navHeight, setNavHeight] = useState(
    DEFAULT_NAV_HEIGHT
  )
  const scrollDirection = useScrollDirection()
  const visibleNav = scrollDirection !== 'down'

  useEffect(() => {
    const node = navWrapRef.current
    if (!node || typeof ResizeObserver === 'undefined')
      return

    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height
      if (height) setNavHeight(height)
    })
    observer.observe(node)

    return () => observer.disconnect()
  }, [])
  useEffect(() => {
    if (sessionStorage.getItem('visibleBanner')) {
      setVisibleBanner(false)
    }
  }, [])

  function closeBanner() {
    if (!sessionStorage.getItem('visibleBanner')) {
      sessionStorage.setItem('visibleBanner', false)
    }
    setVisibleBanner(false)
  }

  return (
    <>
      {ready && (
        <a
          href="#main-content"
          className="focus:bg-card focus:text-foreground sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[60] focus:rounded-lg focus:px-4 focus:py-2"
        >
          {t('navigation.skip_to_content')}
        </a>
      )}
      <header
        ref={navWrapRef}
        className={`fixed inset-x-0 top-0 z-50 w-full motion-safe:transition-transform motion-safe:duration-300 ${
          visibleNav
            ? 'translate-y-0'
            : 'has-[:focus-visible]:translate-y-0 has-[:focus-visible]:transition-none -translate-y-full'
        }`}
      >
        {visibleBanner && (
          <Banner closeBanner={closeBanner} />
        )}
        <NavBar />
      </header>
      <main
        id="main-content"
        tabIndex={-1}
        className="flex-1"
        style={{ paddingTop: navHeight }}
      >
        {children}
      </main>
      <Footer />
      <CookieConsent />
      <Analytics />
    </>
  )
}
