import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import Banner from '../components/Banner'
import MyPageViewLogger from './Analytics'

const NavBar = dynamic(() => import('./NavBar'), {
  ssr: false,
})

const Footer = dynamic(() => import('./Footer'), {
  ssr: false,
})

export default function Layout({ children }) {
  const [visibleNav, setVisibleNav] = useState(true)
  const [visibleBanner, setVisibleBanner] = useState(true)

  useEffect(() => {
    let previousY = document.documentElement.scrollTop

    function handleScroll() {
      let currentY = document.documentElement.scrollTop

      if (currentY <= 350) {
        setVisibleNav(true)
        previousY = currentY
      } else {
        if (currentY - previousY >= 200) {
          setVisibleNav(false)
          previousY = currentY
        }
        if (previousY - currentY >= 200) {
          setVisibleNav(true)
          previousY = currentY
        }
      }
    }

    document.addEventListener('scroll', handleScroll, {
      passive: true,
    })

    if (sessionStorage.getItem('visibleBanner')) {
      setVisibleBanner(false)
    }

    return () => {
      document.removeEventListener('scroll', handleScroll)
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
        className={`${visibleBanner ? 'pt-52' : 'pt-20'}`}
      >
        {children}
      </div>
      <Footer />
      <MyPageViewLogger />
    </>
  )
}
