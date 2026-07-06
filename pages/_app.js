import '../styles/globals.css'
import Layout from '../components/Layout'
import { AppContext } from '../context/context'
import { AuthProvider } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { nunito } from '../lib/fonts'
import Head from 'next/head'
import '../styles/nprogress.css'
import dynamic from 'next/dynamic'
import { appWithTranslation } from 'next-i18next'

const TopProgressBar = dynamic(
  () => {
    return import('../components/TopProgressBar')
  },
  { ssr: false }
)

function MyApp({ Component, pageProps }) {
  const [profile, setUserProfile] = useState({})

  function setProfile(p) {
    setUserProfile(p)
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(
        'profile',
        JSON.stringify(p)
      )
    }
  }

  useEffect(() => {
    if (typeof window !== 'undefined') {
      let p
      if (
        window.localStorage.getItem('profile') !=
        'undefined'
      ) {
        p = JSON.parse(
          window.localStorage.getItem('profile')
        )
      }

      if (p) {
        setUserProfile(p)
      }
    }
  }, [])

  return (
    <div
      className={`${nunito.variable} bg-backgroundGreen font-sciteens h-full w-full`}
    >
      <Head>
        <title>Welcome to SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <AuthProvider>
        <AppContext.Provider
          value={{ profile, setProfile }}
        >
          <TopProgressBar></TopProgressBar>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </AppContext.Provider>
      </AuthProvider>
    </div>
  )
}

export default appWithTranslation(MyApp)
