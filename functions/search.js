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
    member_arr: Array.isArray(data.member_arr)
      ? data.member_arr
      : Array.isArray(data.members)
      ? data.members
      : [],
    date: toMillis(data.date),
    upvote_count:
      typeof data.upvote_count === 'number' &&
      Number.isFinite(data.upvote_count) &&
      data.upvote_count > 0
        ? Math.floor(data.upvote_count)
        : 0,
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
  const res = await fetch(`${host}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(masterKey && {
        Authorization: `Bearer ${masterKey}`,
      }),
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

// Upserts one project into the `projects` index. Never throws into the
// caller's Firestore trigger — a Meilisearch outage should never fail (and
// therefore retry-loop) a project create/update.
async function indexProject(id, data) {
  try {
    await meiliRequest('/indexes/projects/documents', {
      method: 'POST',
      body: [toSearchDocument(id, data)],
    })
  } catch (err) {
    console.error(
      `search: failed to index project ${id}`,
      err
    )
  }
}

async function deleteProjectFromIndex(id) {
  try {
    await meiliRequest(
      `/indexes/projects/documents/${encodeURIComponent(
        id
      )}`,
      { method: 'DELETE' }
    )
  } catch (err) {
    console.error(
      `search: failed to delete project ${id} from index`,
      err
    )
  }
}

module.exports = {
  toSearchDocument,
  indexProject,
  deleteProjectFromIndex,
}
