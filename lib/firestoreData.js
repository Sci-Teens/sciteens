import { useEffect, useState } from 'react'
import { onSnapshot } from 'firebase/firestore'

export function useFirestoreDocData(ref, options = {}) {
  const { idField } = options
  const [state, setState] = useState({
    status: 'loading',
    data: undefined,
  })

  const path = ref?.path

  useEffect(() => {
    if (!ref) return undefined
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        let data = snapshot.data()
        if (data && idField) {
          data = { ...data, [idField]: snapshot.id }
        }
        setState({ status: 'success', data })
      },
      () => setState({ status: 'error', data: undefined })
    )
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, idField])

  return state
}

// Callers must memoize `query` so the subscription is stable across renders.
export function useFirestoreCollectionData(
  query,
  options = {}
) {
  const { idField } = options
  const [state, setState] = useState({
    status: 'loading',
    data: [],
  })

  useEffect(() => {
    if (!query) return undefined
    const unsubscribe = onSnapshot(
      query,
      (snapshot) => {
        const data = snapshot.docs.map((docSnap) =>
          idField
            ? { ...docSnap.data(), [idField]: docSnap.id }
            : docSnap.data()
        )
        setState({ status: 'success', data })
      },
      () => setState({ status: 'error', data: [] })
    )
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, idField])

  return state
}
