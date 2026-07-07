import { app } from '../lib/firebase'
import { useRouter } from 'next/router'
import { useEffect } from 'react'

export default function MyPageViewLogger() {
  const router = useRouter()
  const measurementId = app.options?.measurementId

  // By passing `location.pathname` to the second argument of `useEffect`,
  // we only log on first render and when the `pathname` changes
  useEffect(() => {
    if (!router.isReady || !measurementId) {
      return
    }

    import('firebase/analytics')
      .then(({ getAnalytics, logEvent }) => {
        logEvent(getAnalytics(app), 'page_view', {
          page_location: router.asPath,
        })
      })
      .catch(() => {})
  }, [router.isReady, router.asPath, measurementId])

  return null
}
