import {
  collection,
  getDocs,
  orderBy,
  query as firestoreQuery,
  Timestamp,
  where,
} from 'firebase/firestore'

const CLOSED_RECENTLY_WINDOW_DAYS = 120
const MS_PER_DAY = 24 * 60 * 60 * 1000

const PIPELINE_INTERNAL_FIELDS = [
  'lastScrapedAt',
  'contentHash',
]

function toSerializableDate(value) {
  return value?.toDate
    ? value.toDate().toISOString()
    : value || null
}

function withoutPipelineInternalFields(doc) {
  const rendered = { ...doc }
  for (const field of PIPELINE_INTERNAL_FIELDS) {
    delete rendered[field]
  }
  return rendered
}

export function normalizeOpportunity(doc) {
  if (!doc) return doc
  const rendered = withoutPipelineInternalFields(doc)
  return {
    ...rendered,
    applicationDeadline: toSerializableDate(
      rendered.applicationDeadline
    ),
    applicationOpensDate: toSerializableDate(
      rendered.applicationOpensDate
    ),
  }
}

function toNormalizedOpportunities(snapshot) {
  const results = []
  snapshot.forEach((doc) => {
    results.push(
      normalizeOpportunity({ slug: doc.id, ...doc.data() })
    )
  })
  return results
}

function opportunitiesCollection(firestore) {
  return collection(firestore, 'opportunities')
}

function currentDeadlineSoonestFirstQuery(firestore) {
  return firestoreQuery(
    opportunitiesCollection(firestore),
    where('deadlineStatus', '==', 'dated'),
    where('applicationDeadline', '>=', Timestamp.now()),
    orderBy('applicationDeadline', 'asc')
  )
}

function rollingAdmissionQuery(firestore) {
  return firestoreQuery(
    opportunitiesCollection(firestore),
    where('deadlineStatus', '==', 'rolling')
  )
}

function explicitFutureOpenDateQuery(firestore) {
  return firestoreQuery(
    opportunitiesCollection(firestore),
    where('deadlineStatus', '==', 'upcoming'),
    where('applicationOpensDate', '>=', Timestamp.now()),
    orderBy('applicationOpensDate', 'asc')
  )
}

function closedRecentlyWindowStart() {
  return Timestamp.fromDate(
    new Date(
      Date.now() - CLOSED_RECENTLY_WINDOW_DAYS * MS_PER_DAY
    )
  )
}

function deadlinePassedWithinWindowQuery(firestore) {
  return firestoreQuery(
    opportunitiesCollection(firestore),
    where('deadlineStatus', '==', 'dated'),
    where(
      'applicationDeadline',
      '>=',
      closedRecentlyWindowStart()
    ),
    where('applicationDeadline', '<', Timestamp.now()),
    orderBy('applicationDeadline', 'desc')
  )
}

export async function fetchOpenNowOpportunities(firestore) {
  const [currentDeadlineSnap, rollingAdmissionSnap] =
    await Promise.all([
      getDocs(currentDeadlineSoonestFirstQuery(firestore)),
      getDocs(rollingAdmissionQuery(firestore)),
    ])

  return [
    ...toNormalizedOpportunities(currentDeadlineSnap),
    ...toNormalizedOpportunities(rollingAdmissionSnap),
  ]
}

export async function fetchOpeningSoonOpportunities(
  firestore
) {
  const snapshot = await getDocs(
    explicitFutureOpenDateQuery(firestore)
  )
  return toNormalizedOpportunities(snapshot)
}

export async function fetchClosedRecentlyOpportunities(
  firestore
) {
  const snapshot = await getDocs(
    deadlinePassedWithinWindowQuery(firestore)
  )
  return toNormalizedOpportunities(snapshot)
}
