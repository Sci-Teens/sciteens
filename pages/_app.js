import '../styles/globals.css'
import Layout from '../components/Layout'
import { AppContext } from '../context/context'
import { AuthProvider } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { nunito } from '../lib/fonts'
import Head from 'next/head'
import { appWithTranslation } from 'next-i18next'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'

function MyApp({ Component, pageProps }) {
  const [profile, setUserProfile] = useState({})
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            refetchOnWindowFocus: false,
          },
        },
      })
  )

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
      className={`${nunito.variable} bg-background font-sciteens text-foreground flex min-h-screen w-full flex-col`}
    >
      <Head>
        <title>Welcome to SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <AppContext.Provider
            value={{ profile, setProfile }}
          >
            <Layout>
              <Component {...pageProps} />
            </Layout>
          </AppContext.Provider>
        </AuthProvider>
      </QueryClientProvider>
    </div>
  )
}

export default appWithTranslation(MyApp)
