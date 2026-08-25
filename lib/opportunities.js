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

const PIPELINE_INTERNAL_FIELDS = ['lastScrapedAt']

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

export function deadlineDisplay(program) {
  if (!program) return { kind: 'unknown', date: null }
  if (
    program.deadlineStatus === 'dated' &&
    program.applicationDeadline
  ) {
    return {
      kind: 'dated',
      date: program.applicationDeadline,
    }
  }
  if (
    program.deadlineStatus === 'upcoming' &&
    program.applicationOpensDate
  ) {
    return {
      kind: 'opens',
      date: program.applicationOpensDate,
    }
  }
  if (program.deadlineStatus === 'rolling') {
    return { kind: 'rolling', date: null }
  }
  return { kind: 'unknown', date: null }
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

function deadlineNotListedQuery(firestore) {
  return firestoreQuery(
    opportunitiesCollection(firestore),
    where('deadlineStatus', '==', 'unclear')
  )
}

export async function fetchDeadlineUnknownOpportunities(
  firestore
) {
  const snapshot = await getDocs(
    deadlineNotListedQuery(firestore)
  )
  return toNormalizedOpportunities(snapshot)
}
