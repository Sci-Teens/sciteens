import { useFirebaseApp } from 'reactfire'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function MyPageViewLogger() {
  const app = useFirebaseApp()
  const router = useRouter()

  // By passing `location.pathname` to the second argument of `useEffect`,
  // we only log on first render and when the `pathname` changes
  useEffect(() => {
    if (!router.isReady) {
      return
    }

    import('firebase/analytics')
      .then(({ getAnalytics, logEvent }) => {
        logEvent(getAnalytics(app), 'page_view', {
          page_location: router.asPath,
        })
      })
      .catch(() => {})
  }, [app, router.isReady, router.asPath])

  return null
}
