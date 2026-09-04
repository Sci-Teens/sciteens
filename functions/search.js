// Thin Meilisearch REST client + `projects` document mapper used by the
// Firestore triggers in index.js. Deliberately dependency-free (Node 22's
// global fetch) — the surface this file needs (index a doc, delete a doc)
// is a couple of HTTP calls, not a full SDK.
//
// Auth: Meilisearch's own MEILI_MASTER_KEY gates every write. There is no
// Cloud Run IAM layer in front of it (see infra/meilisearch/main.tf for why:
// Cloud Run IAM and Meilisearch's API-key auth both need the Authorization
// header, so only one can own it) — the master key is the entire access
// control for this client.

// Canonical Title Case field keys — mirrors
// context/helpers.js#getTranslatedFieldsDict on the Next.js side. Used only
// to fold legacy lowercase `fields` values into one consistent facet bucket
// (e.g. "biology" and "Biology" both count toward "Biology"); a mismatch
// here just means an unrecognized value facets under its own raw string
// instead of crashing anything.
const CANONICAL_FIELDS = [
  'Biology',
  'Chemistry',
  'Cognitive Science',
  'Computer Science',
  'Earth Science',
  'Electrical Engineering',
  'Environmental Science',
  'Mathematics',
  'Mechanical Engineering',
  'Medicine',
  'Physics',
  'Space Science',
]
const CANONICAL_FIELDS_BY_LOWER = new Map(
  CANONICAL_FIELDS.map((field) => [
    field.toLowerCase(),
    field,
  ])
)

function normalizeField(field) {
  if (typeof field !== 'string' || !field) return null
  return (
    CANONICAL_FIELDS_BY_LOWER.get(field.toLowerCase()) ||
    field
  )
}

// Mirrors lib/projects.js#stripHtml — legacy project docs sometimes store
// raw rich-text HTML in a field that is now plain text; never index (or
// later render) that markup verbatim.
function stripHtml(value) {
  if (typeof value !== 'string') return value
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function toMillis(date) {
  if (!date) return null
  if (typeof date.toMillis === 'function')
    return date.toMillis()
  const parsed = new Date(date)
  return Number.isNaN(parsed.getTime())
    ? null
    : parsed.getTime()
}

// Builds the document Meilisearch stores for one project. Mirrors
// lib/projects.js#normalizeProject's derived fields so a search hit can be
// rendered by the same ProjectCard a Firestore-sourced project uses,
// without a second round-trip back to Firestore.
function toSearchDocument(id, data) {
  const fields = Array.isArray(data.fields)
    ? data.fields
    : []
  const memberArr = Array.isArray(data.member_arr)
    ? data.member_arr
    : Array.isArray(data.members)
    ? data.members
    : []
  return {
    id,
    title: data.title || data.name || '',
    abstract: stripHtml(data.abstract || data.about || ''),
    project_photo: data.project_photo || data.photo || '',
    fields,
    fields_facet: [
      ...new Set(
        fields.map(normalizeField).filter(Boolean)
      ),
    ],
    member_arr: memberArr,
    // Flattened separately from member_arr so the searchable attribute
    // can be just the names: indexing member_arr wholesale would also
    // make uids and profile slugs match free-text queries.
    member_names: [
      ...new Set(
        memberArr
          .map((member) =>
            typeof member?.display === 'string'
              ? member.display.trim()
              : ''
          )
          .filter(Boolean)
      ),
    ],
    date: toMillis(data.date),
    upvote_count:
      typeof data.upvote_count === 'number' &&
      Number.isFinite(data.upvote_count) &&
      data.upvote_count > 0
        ? Math.floor(data.upvote_count)
        : 0,
  }
}

function cleanString(value) {
  return typeof value === 'string' ? value.trim() : ''
}

function opportunityGradeLevels(low, high) {
  if (!Number.isFinite(low) || !Number.isFinite(high))
    return []
  const first = Math.max(9, Math.ceil(low))
  const last = Math.min(12, Math.floor(high))
  const grades = []
  for (let grade = first; grade <= last; grade++) {
    grades.push(grade)
  }
  return grades
}

function toOpportunitySearchDocument(id, data) {
  const fields = Array.isArray(data.fields)
    ? data.fields
    : []
  const gradeRangeLow = Number.isFinite(data.gradeRangeLow)
    ? data.gradeRangeLow
    : null
  const gradeRangeHigh = Number.isFinite(
    data.gradeRangeHigh
  )
    ? data.gradeRangeHigh
    : null

  return {
    id,
    name: cleanString(data.name),
    about: stripHtml(data.about || '') || '',
    location: cleanString(data.location),
    locationCity: cleanString(data.locationCity),
    locationState: cleanString(data.locationState),
    locationPostalCode: cleanString(
      data.locationPostalCode
    ),
    locationCountry: cleanString(data.locationCountry),
    startDate: toMillis(data.startDate),
    endDate: toMillis(data.endDate),
    applicationDeadline: toMillis(data.applicationDeadline),
    applicationOpensDate: toMillis(
      data.applicationOpensDate
    ),
    deadlineStatus: [
      'dated',
      'rolling',
      'upcoming',
      'unclear',
    ].includes(data.deadlineStatus)
      ? data.deadlineStatus
      : 'unclear',
    gradeRangeLow,
    gradeRangeHigh,
    grade_levels: opportunityGradeLevels(
      gradeRangeLow,
      gradeRangeHigh
    ),
    ageRangeLow: Number.isFinite(data.ageRangeLow)
      ? data.ageRangeLow
      : null,
    ageRangeHigh: Number.isFinite(data.ageRangeHigh)
      ? data.ageRangeHigh
      : null,
    fields,
    fields_facet: [
      ...new Set(
        fields.map(normalizeField).filter(Boolean)
      ),
    ],
    eligibilityNotes: cleanString(data.eligibilityNotes),
    cost: cleanString(data.cost),
    financialAid: cleanString(data.financialAid),
    stipend: cleanString(data.stipend),
    programType: cleanString(data.programType) || 'Other',
    durationText: cleanString(data.durationText),
    residential:
      cleanString(data.residential) || 'Not specified',
    imageUrl: cleanString(data.imageUrl),
    imageFit: cleanString(data.imageFit) || 'cover',
  }
}

function meiliHost() {
  const host = process.env.MEILI_HOST
  return host ? host.replace(/\/+$/, '') : null
}

async function meiliRequest(
  path,
  { method = 'GET', body } = {}
) {
  const host = meiliHost()
  if (!host) {
    console.warn(
      'search: MEILI_HOST not configured, skipping Meilisearch sync'
    )
    return null
  }
  const masterKey = process.env.MEILI_MASTER_KEY
  if (!masterKey) {
    throw new Error('MEILI_MASTER_KEY is not configured.')
  }
  const res = await fetch(`${host}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${masterKey}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(
      `Meilisearch ${method} ${path} failed: ${res.status} ${text}`
    )
  }
  return res.status === 204 ? null : res.json()
}

async function waitForMeiliTask(task) {
  if (!task || !Number.isInteger(task.taskUid)) return
  const deadline = Date.now() + 15000
  for (;;) {
    const status = await meiliRequest(
      `/tasks/${task.taskUid}`
    )
    if (status.status === 'succeeded') return
    if (
      status.status === 'failed' ||
      status.status === 'canceled'
    ) {
      throw new Error(
        `Meilisearch task ${task.taskUid} ${
          status.status
        }: ${JSON.stringify(status.error || null)}`
      )
    }
    if (Date.now() >= deadline) {
      throw new Error(
        `Meilisearch task ${task.taskUid} timed out`
      )
    }
    await new Promise((resolve) => setTimeout(resolve, 250))
  }
}

async function indexSearchDocument(indexUid, document) {
  const task = await meiliRequest(
    `/indexes/${indexUid}/documents`,
    {
      method: 'POST',
      body: [document],
    }
  )
  await waitForMeiliTask(task)
}

async function deleteSearchDocument(indexUid, id) {
  const task = await meiliRequest(
    `/indexes/${indexUid}/documents/${encodeURIComponent(
      id
    )}`,
    { method: 'DELETE' }
  )
  await waitForMeiliTask(task)
}

function indexProject(id, data) {
  return indexSearchDocument(
    'projects',
    toSearchDocument(id, data)
  )
}

function deleteProjectFromIndex(id) {
  return deleteSearchDocument('projects', id)
}

function indexOpportunity(id, data) {
  return indexSearchDocument(
    'opportunities',
    toOpportunitySearchDocument(id, data)
  )
}

function deleteOpportunityFromIndex(id) {
  return deleteSearchDocument('opportunities', id)
}

module.exports = {
  CANONICAL_FIELDS,
  toSearchDocument,
  toOpportunitySearchDocument,
  indexProject,
  deleteProjectFromIndex,
  indexOpportunity,
  deleteOpportunityFromIndex,
}
