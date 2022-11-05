const NavBar = dynamic(() => import('./NavBar'), {
  ssr: false,
})

const Footer = dynamic(() => import('./Footer'), {
  ssr: false,
})

// import NavBar from "./NavBar";
// import Footer from "./Footer";
import { useState, useEffect } from 'react'
import { getAuth } from 'firebase/auth'
import { getFirestore } from '@firebase/firestore'
import { getStorage } from '@firebase/storage'
import { getAnalytics } from 'firebase/analytics'
import {
  AuthProvider,
  AnalyticsProvider,
  FirestoreProvider,
  StorageProvider,
  useFirebaseApp,
} from 'reactfire'

import Banner from '../components/Banner'
import MyPageViewLogger from './Analytics'
import dynamic from 'next/dynamic'

export default function Layout({ children }) {
  const app = useFirebaseApp()
  const firestore = getFirestore(app)
  const auth = getAuth(app)
  const storage = getStorage(app)
  let analytics
  if (typeof window === 'undefined') {
    analytics = null
  } else {
    analytics = getAnalytics(app)
  }

  const [visibleNav, setVisibleNav] = useState(true)

  const [visibleBanner, setVisibleBanner] = useState(true)

  useEffect(() => {
    // Functionality for showing/removing navbar based on scroll behavior
    let previousY = document.documentElement.scrollTop
    document.addEventListener('scroll', function () {
      let currentY = document.documentElement.scrollTop

      // Navbar checks
      // If you're within 350px from the top of the page, the scrollbar is always visible
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
    })

    // Check if the user closed the banner in sessionStorage
    if (sessionStorage.getItem('visibleBanner')) {
      setVisibleBanner(false)
    }

    return () => {
      document.removeEventListener('scroll', function () {})
    }
  }, [])

  function closeBanner() {
    if (!sessionStorage.getItem('visibleBanner')) {
      sessionStorage.setItem('visibleBanner', false)
    }
    setVisibleBanner(false)
  }

  let wrapper = (
    <AuthProvider sdk={auth}>
      <FirestoreProvider sdk={firestore}>
        <StorageProvider sdk={storage}>
          <div
            className={`fixed z-50 w-full transform transition-all duration-300 ${
              visibleNav
                ? 'translate-y-0'
                : '-translate-y-32'
            }`}
          >
            {visibleBanner && (
              <Banner closeBanner={closeBanner} />
            )}
            <NavBar />
          </div>
          <div
            className={`${
              visibleBanner ? 'pt-52' : 'pt-20'
            }`}
          >
            {children}
          </div>
          <Footer />
        </StorageProvider>
      </FirestoreProvider>
    </AuthProvider>
  )

  return typeof window === 'undefined' ? (
    wrapper
  ) : (
    <AnalyticsProvider sdk={analytics}>
      {wrapper}
      <MyPageViewLogger />
    </AnalyticsProvider>
  )
}
