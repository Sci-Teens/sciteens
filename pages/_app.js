import '../styles/globals.css'
import Layout from '../components/Layout'
import { AppContext } from '../context/context'
import { AuthProvider } from '../context/AuthContext'
import { useState, useEffect } from 'react'
import { fontVariables } from '../lib/fonts'
import Head from 'next/head'
import { getCanonicalUrl } from '../lib/ogImage'
import { useRouter } from 'next/router'
import { appWithTranslation } from 'next-i18next'
import {
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { useReducedMotion } from '@react-spring/web'

const NOINDEX_PATH =
  /^\/(?:(?:es|fr|hi)\/)?(?:signin(?:\/|$)|signup(?:\/|$)|unsubscribe(?:\/|$)|project\/create(?:\/|$)|project\/[^/]+\/edit(?:\/|$)|profile\/[^/]+\/edit(?:\/|$))/

function getRoutePath(path) {
  return path.split(/[?#]/, 1)[0] || '/'
}

function MyApp({ Component, pageProps }) {
  const router = useRouter()
  const routePath = getRoutePath(router.asPath)
  const noindex = NOINDEX_PATH.test(routePath)
  // Flips react-spring's global skipAnimation once for the whole app, so
  // every spring on every route snaps to its end state for visitors who
  // asked for reduced motion.
  useReducedMotion()

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
      className={`${fontVariables} bg-background font-sciteens text-foreground flex min-h-screen w-full flex-col`}
    >
      <Head>
        <title>Welcome to SciTeens</title>
        <link
          key="canonical"
          rel="canonical"
          href={getCanonicalUrl(routePath)}
        />
        {noindex && (
          <meta
            key="robots"
            name="robots"
            content="noindex, nofollow"
          />
        )}
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
