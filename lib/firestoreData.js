import { useEffect, useMemo } from 'react'
import { onSnapshot } from 'firebase/firestore'
import {
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

function mapDocSnapshot(snapshot, idField) {
  let data = snapshot.data()
  if (data && idField) {
    data = { ...data, [idField]: snapshot.id }
  }
  return data
}

function mapCollectionSnapshot(snapshot, idField) {
  return snapshot.docs.map((docSnap) =>
    idField
      ? { ...docSnap.data(), [idField]: docSnap.id }
      : docSnap.data()
  )
}

function getCanonicalPath(query) {
  return (
    query?._query?.path?.canonicalString?.() ||
    query?._query?.path?.toString?.() ||
    query?._path?.canonicalString?.() ||
    query?.path ||
    ''
  )
}

function getCanonicalOrderBy(query) {
  return (
    query?._query?.explicitOrderBy
      ?.map((order) => {
        const field =
          order.field?.canonicalString?.() ||
          order.field?.toString?.()
        return `${field}:${order.dir}`
      })
      .join('|') || ''
  )
}

// Firestore's internal Filter objects (from `where()`/`or()`/`and()`) have
// no public `canonicalId()`/`toString()` in the client SDK — mapping them
// naively collapses every filter to `"[object Object]"`, silently making
// the cache key blind to filter content (verified against firebase@9.23:
// two differently-filtered queries produce an identical key). Build the
// id from the filter's own `field`/`op`/`value`, recursing into composite
// (`and`/`or`) filters via their `.filters` array.
function getCanonicalFilterId(filter) {
  if (filter?.filters) {
    return `${filter.op}(${filter.filters
      .map(getCanonicalFilterId)
      .join(',')})`
  }
  const field =
    filter?.field?.canonicalString?.() ||
    filter?.field?.toString?.()
  return `${field}${filter?.op}${JSON.stringify(
    filter?.value
  )}`
}

function getCanonicalFilters(query) {
  return (
    query?._query?.filters
      ?.map(getCanonicalFilterId)
      .join('|') || ''
  )
}

export function getCollectionQueryKey(query, idField) {
  return [
    'firestore',
    'collection',
    getCanonicalPath(query),
    getCanonicalFilters(query),
    getCanonicalOrderBy(query),
    query?._query?.limit || null,
    idField || null,
  ]
}

export function getDocQueryKey(ref, idField) {
  return [
    'firestore',
    'doc',
    ref?.path || '',
    idField || null,
  ]
}

function getInitialSnapshot(source, mapSnapshot) {
  return new Promise((resolve, reject) => {
    let unsubscribe = () => {}
    unsubscribe = onSnapshot(
      source,
      (snapshot) => {
        unsubscribe()
        resolve(mapSnapshot(snapshot))
      },
      (error) => {
        unsubscribe()
        reject(error)
      }
    )
  })
}

function toReactfireStatus(status) {
  return status === 'pending' ? 'loading' : status
}

export function useFirestoreDocData(ref, options = {}) {
  const { idField } = options
  const queryClient = useQueryClient()
  const queryKey = useMemo(
    () => getDocQueryKey(ref, idField),
    [ref, idField]
  )

  const query = useQuery({
    queryKey,
    enabled: !!ref,
    queryFn: () =>
      getInitialSnapshot(ref, (snapshot) =>
        mapDocSnapshot(snapshot, idField)
      ),
  })

  useEffect(() => {
    if (!ref) return undefined
    const unsubscribe = onSnapshot(
      ref,
      (snapshot) => {
        queryClient.setQueryData(
          queryKey,
          mapDocSnapshot(snapshot, idField)
        )
      },
      (error) => {
        queryClient.setQueryData(queryKey, undefined)
        queryClient.invalidateQueries({ queryKey })
        console.error(
          'Firestore doc subscription failed:',
          error
        )
      }
    )
    return unsubscribe
  }, [ref, ref?.path, idField, queryClient, queryKey])

  return {
    status: toReactfireStatus(query.status),
    data: query.data,
  }
}

// Callers must memoize `query` so the subscription is stable across renders.
export function useFirestoreCollectionData(
  firestoreQuery,
  options = {}
) {
  const { idField } = options
  const queryClient = useQueryClient()
  const queryKey = useMemo(
    () => getCollectionQueryKey(firestoreQuery, idField),
    [firestoreQuery, idField]
  )

  const query = useQuery({
    queryKey,
    enabled: !!firestoreQuery,
    queryFn: () =>
      getInitialSnapshot(firestoreQuery, (snapshot) =>
        mapCollectionSnapshot(snapshot, idField)
      ),
  })

  useEffect(() => {
    if (!firestoreQuery) return undefined
    const unsubscribe = onSnapshot(
      firestoreQuery,
      (snapshot) => {
        queryClient.setQueryData(
          queryKey,
          mapCollectionSnapshot(snapshot, idField)
        )
      },
      (error) => {
        queryClient.setQueryData(queryKey, [])
        queryClient.invalidateQueries({ queryKey })
        console.error(
          'Firestore collection subscription failed:',
          error
        )
      }
    )
    return unsubscribe
  }, [firestoreQuery, idField, queryClient, queryKey])

  return {
    status: toReactfireStatus(query.status),
    data: query.data || [],
  }
}
