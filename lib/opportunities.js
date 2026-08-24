import {
  collection,
  getDocs,
  orderBy,
  query as firestoreQuery,
  Timestamp,
  where,
} from 'firebase/firestore'

// How far back a passed deadline still counts as "closed recently" rather
// than just... gone. Matches the site's own displayed cutoff.
const CLOSED_RECENTLY_WINDOW_DAYS = 120 // ~4 months

function toIsoOrNull(value) {
  return value?.toDate
    ? value.toDate().toISOString()
    : value || null
}

// Firestore Timestamps aren't JSON-serializable, which getStaticProps
// requires -- normalize applicationDeadline/applicationOpensDate to plain
// ISO strings (formatMediumDate in lib/formatDate.js already accepts
// either shape, so this is safe for both the getStaticProps path and the
// client-side fetch path). lastScrapedAt/contentHash are pipeline-internal
// bookkeeping the frontend never renders, so they're dropped here rather
// than serialized.
export function normalizeOpportunity(doc) {
  if (!doc) return doc
  const rest = { ...doc }
  delete rest.lastScrapedAt
  delete rest.contentHash
  return {
    ...rest,
    applicationDeadline: toIsoOrNull(
      rest.applicationDeadline
    ),
    applicationOpensDate: toIsoOrNull(
      rest.applicationOpensDate
    ),
  }
}

function mapSnapshot(snapshot) {
  const results = []
  snapshot.forEach((doc) => {
    results.push(
      normalizeOpportunity({ slug: doc.id, ...doc.data() })
    )
  })
  return results
}

// "Open Now": a real, current deadline (soonest first) plus anything
// explicitly rolling admission, appended after. Visibility is a live
// query against the real deadline, not a stored flag -- see the project
// plan for why (a stored boolean would go stale between weekly scrapes;
// this self-corrects instantly).
export async function fetchOpenNowOpportunities(firestore) {
  const opportunitiesCollection = collection(
    firestore,
    'opportunities'
  )

  const datedQuery = firestoreQuery(
    opportunitiesCollection,
    where('deadlineStatus', '==', 'dated'),
    where('applicationDeadline', '>=', Timestamp.now()),
    orderBy('applicationDeadline', 'asc')
  )
  const rollingQuery = firestoreQuery(
    opportunitiesCollection,
    where('deadlineStatus', '==', 'rolling')
  )

  const [datedSnap, rollingSnap] = await Promise.all([
    getDocs(datedQuery),
    getDocs(rollingQuery),
  ])

  return [
    ...mapSnapshot(datedSnap),
    ...mapSnapshot(rollingSnap),
  ]
}

// "Opening Soon": applications aren't open yet, but the source explicitly
// stated a specific future open date -- distinct from "unclear", which
// covers "no idea when" or a vague "check back later" with no real date.
export async function fetchOpeningSoonOpportunities(
  firestore
) {
  const opportunitiesCollection = collection(
    firestore,
    'opportunities'
  )

  const upcomingQuery = firestoreQuery(
    opportunitiesCollection,
    where('deadlineStatus', '==', 'upcoming'),
    where('applicationOpensDate', '>=', Timestamp.now()),
    orderBy('applicationOpensDate', 'asc')
  )

  return mapSnapshot(await getDocs(upcomingQuery))
}

// "Closed Recently": a real deadline that has passed, but only within the
// last CLOSED_RECENTLY_WINDOW_DAYS -- older than that is just noise, not
// useful "check back next cycle" information.
export async function fetchClosedRecentlyOpportunities(
  firestore
) {
  const opportunitiesCollection = collection(
    firestore,
    'opportunities'
  )
  const windowStart = Timestamp.fromDate(
    new Date(
      Date.now() -
        CLOSED_RECENTLY_WINDOW_DAYS * 24 * 60 * 60 * 1000
    )
  )

  const closedQuery = firestoreQuery(
    opportunitiesCollection,
    where('deadlineStatus', '==', 'dated'),
    where('applicationDeadline', '>=', windowStart),
    where('applicationDeadline', '<', Timestamp.now()),
    orderBy('applicationDeadline', 'desc')
  )

  return mapSnapshot(await getDocs(closedQuery))
}
