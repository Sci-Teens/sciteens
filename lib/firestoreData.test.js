import { describe, expect, it } from 'vitest'
import { initializeApp } from 'firebase/app'
import {
  collection,
  doc,
  getFirestore,
  limit,
  orderBy,
  query,
  where,
} from 'firebase/firestore'
import {
  getCollectionQueryKey,
  getDocQueryKey,
} from './firestoreData'

// query()/collection()/doc() build client-side query descriptors and never
// touch the network, so a plain (non-emulator) Firestore instance is enough
// to exercise key derivation.
const app = initializeApp(
  { projectId: 'demo-sciteens-test' },
  'firestoreData-test-app'
)
const db = getFirestore(app)

describe('getCollectionQueryKey', () => {
  it('is stable across separately-constructed, logically-identical queries', () => {
    const build = () =>
      query(
        collection(db, 'projects'),
        where('member_uids', 'array-contains', 'alice'),
        orderBy('title'),
        limit(10)
      )
    expect(getCollectionQueryKey(build())).toEqual(
      getCollectionQueryKey(build())
    )
  })

  // Regression test: firebase@9.23's Filter objects have no public
  // canonicalId()/toString(), so a naive `filter.toString()` collapses
  // every filter to "[object Object]" and the cache key goes blind to
  // filter content (fixed in getCanonicalFilterId by reading
  // field/op/value directly).
  it('changes when the filter value changes', () => {
    const withField = (value) =>
      query(
        collection(db, 'projects'),
        where('field', '==', value)
      )
    expect(
      getCollectionQueryKey(withField('Biology'))
    ).not.toEqual(
      getCollectionQueryKey(withField('Chemistry'))
    )
  })

  it('changes when a filter is added', () => {
    const base = query(
      collection(db, 'projects'),
      where('field', '==', 'Biology')
    )
    const withExtra = query(
      collection(db, 'projects'),
      where('field', '==', 'Biology'),
      where('status', '==', 'active')
    )
    expect(getCollectionQueryKey(base)).not.toEqual(
      getCollectionQueryKey(withExtra)
    )
  })

  it('changes when orderBy direction changes', () => {
    const asc = query(
      collection(db, 'projects'),
      orderBy('title')
    )
    const desc = query(
      collection(db, 'projects'),
      orderBy('title', 'desc')
    )
    expect(getCollectionQueryKey(asc)).not.toEqual(
      getCollectionQueryKey(desc)
    )
  })

  it('changes when limit changes', () => {
    const ten = query(collection(db, 'projects'), limit(10))
    const twenty = query(
      collection(db, 'projects'),
      limit(20)
    )
    expect(getCollectionQueryKey(ten)).not.toEqual(
      getCollectionQueryKey(twenty)
    )
  })

  it('changes when the collection path changes', () => {
    expect(
      getCollectionQueryKey(collection(db, 'projects'))
    ).not.toEqual(
      getCollectionQueryKey(collection(db, 'courses'))
    )
  })

  it('changes when idField changes', () => {
    const base = collection(db, 'projects')
    expect(getCollectionQueryKey(base, 'id')).not.toEqual(
      getCollectionQueryKey(base, undefined)
    )
  })
})

describe('getDocQueryKey', () => {
  it('is stable across separately-constructed refs to the same doc', () => {
    expect(
      getDocQueryKey(doc(db, 'profiles/alice'))
    ).toEqual(getDocQueryKey(doc(db, 'profiles/alice')))
  })

  it('changes when the path changes', () => {
    expect(
      getDocQueryKey(doc(db, 'profiles/alice'))
    ).not.toEqual(getDocQueryKey(doc(db, 'profiles/bob')))
  })

  it('changes when idField changes', () => {
    const ref = doc(db, 'profiles/alice')
    expect(getDocQueryKey(ref, 'uid')).not.toEqual(
      getDocQueryKey(ref, undefined)
    )
  })

  it('never throws for a missing ref', () => {
    expect(() => getDocQueryKey(undefined)).not.toThrow()
  })
})
