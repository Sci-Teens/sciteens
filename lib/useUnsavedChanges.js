import { useEffect } from 'react'
import { useRouter } from 'next/router'

// Long create/edit forms lose everything to a stray navigation, so
// every exit gets a guard: the browser chrome via `beforeunload`,
// in-app links via a capture-phase click listener, and back/forward
// via `beforePopState`.
//
// Deliberately *not* the usual recipe of throwing from a
// `routeChangeStart` listener. Next emits that event outside change()'s
// try block (next/dist/shared/lib/router/router.js:844 vs the try on
// :847), so the abort never reaches the `err.cancelled` check on :1074
// and every declined navigation escapes as an unhandled rejection.
// Cancelling the click instead leaves the router untouched, and has the
// useful side effect of exempting the pages' own programmatic redirects
// (auth bounce, post-save push) from the prompt.
export function useUnsavedChanges(enabled, message) {
  const router = useRouter()

  useEffect(() => {
    if (!enabled) return

    const onBeforeUnload = (event) => {
      // No browser has honored a custom string here since 2016.
      event.preventDefault()
      event.returnValue = ''
      return ''
    }

    // Capture phase on the document: React delegates its own listeners
    // to the root container below this, so stopping here means
    // next/link's onClick never runs. preventDefault covers the plain
    // anchor fallback, and next/link bails on it too (client/link.js).
    const onClick = (event) => {
      if (event.defaultPrevented || event.button !== 0)
        return
      if (
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      )
        return

      const anchor = event.target?.closest?.('a[href]')
      if (!anchor || anchor.target === '_blank') return
      if (anchor.hasAttribute('download')) return
      // mailto:/tel: report origin "null", and a same-page hash jump
      // never unmounts the form.
      if (anchor.origin !== window.location.origin) return
      if (
        anchor.pathname === window.location.pathname &&
        anchor.search === window.location.search
      )
        return

      if (window.confirm(message)) return
      event.preventDefault()
      event.stopPropagation()
    }

    // Back/forward has already moved the history entry by the time this
    // runs, so declining has to put the URL back itself.
    const restoreTo = router.asPath
    router.beforePopState(() => {
      if (window.confirm(message)) return true
      window.history.pushState(null, '', restoreTo)
      return false
    })

    window.addEventListener('beforeunload', onBeforeUnload)
    document.addEventListener('click', onClick, true)

    return () => {
      window.removeEventListener(
        'beforeunload',
        onBeforeUnload
      )
      document.removeEventListener('click', onClick, true)
      router.beforePopState(() => true)
    }
  }, [enabled, message, router])
}
