import {
  collection,
  getDocs,
  orderBy,
  query as firestoreQuery,
  Timestamp,
  where,
} from 'firebase/firestore'

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

export function normalizeOpportunityListing(doc) {
  if (!doc) return doc
  return normalizeOpportunity({
    slug: doc.slug || doc.id || '',
    name: doc.name || '',
    about: doc.about || '',
    location: doc.location || '',
    applicationDeadline: doc.applicationDeadline,
    applicationOpensDate: doc.applicationOpensDate,
    deadlineStatus: doc.deadlineStatus || 'unclear',
    gradeRangeLow: doc.gradeRangeLow,
    gradeRangeHigh: doc.gradeRangeHigh,
    fields: Array.isArray(doc.fields) ? doc.fields : [],
    programType: doc.programType || 'Other',
    residential: doc.residential || 'Not specified',
    imageUrl: doc.imageUrl || '',
    imageFit: doc.imageFit || 'cover',
  })
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
      normalizeOpportunityListing({
        ...doc.data(),
        slug: doc.id,
      })
    )
  })
  return results
}

function opportunitiesCollection(firestore) {
  return collection(firestore, 'opportunities')
}

export async function fetchOpportunityOptions(firestore) {
  const snapshot = await getDocs(
    firestoreQuery(
      opportunitiesCollection(firestore),
      orderBy('name', 'asc')
    )
  )

  return snapshot.docs
    .map((opportunity) => ({
      id: opportunity.id,
      name: String(opportunity.data().name || '').trim(),
    }))
    .filter(({ name }) => name)
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
