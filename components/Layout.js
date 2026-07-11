import { useState, useEffect, useRef } from 'react'
import dynamic from 'next/dynamic'
import Banner from '../components/Banner'
import MyPageViewLogger from './Analytics'
import { useScrollDirection } from '../lib/useScrollDirection'

const NavBar = dynamic(() => import('./NavBar'), {
  ssr: false,
})

const Footer = dynamic(() => import('./Footer'), {
  ssr: false,
})

// Matches the nav's rendered height (mt-3 + h-16) when no banner is
// showing, so the content doesn't jump on first paint.
const DEFAULT_NAV_HEIGHT = 76

export default function Layout({ children }) {
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
      <div
        ref={navWrapRef}
        className={`fixed z-50 w-full transform transition-all duration-300 ${
          visibleNav ? 'translate-y-0' : '-translate-y-32'
        }`}
      >
        {visibleBanner && (
          <Banner closeBanner={closeBanner} />
        )}
        <NavBar />
      </div>
      <div
        className="flex-1"
        style={{ paddingTop: navHeight }}
      >
        {children}
      </div>
      <Footer />
      <MyPageViewLogger />
    </>
  )
}
