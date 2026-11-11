import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
} from 'firebase/firestore'

import { normalizeUpvoteCount } from './projectUpvotes'
import {
  PROGRAM_ALIASES,
  canonicalProgramSlug,
} from './legacyRoutes.cjs'

export const PROGRAM_PROJECTS_PAGE_SIZE = 12

const PROJECT_PHOTO_URL =
  /^(?:https:\/\/firebasestorage\.googleapis\.com\/v0\/b\/directed-relic-266701\.appspot\.com\/o\/|https:\/\/storage\.googleapis\.com\/directed-relic-266701\.appspot\.com\/|https:\/\/directed-relic-266701\.firebasestorage\.app\/)/
const SAFE_PROFILE_ID = /^[A-Za-z0-9_-]{1,128}$/

function text(value, maxLength) {
  return typeof value === 'string'
    ? value.slice(0, maxLength)
    : ''
}

function projectMembers(value) {
  if (!Array.isArray(value)) return []

  return value.slice(0, 10).flatMap((member) => {
    const uid = text(member?.uid, 128)
    if (!SAFE_PROFILE_ID.test(uid)) return []

    const slug = text(member?.slug, 128)
    return [
      {
        uid,
        display: text(member?.display, 200),
        slug: SAFE_PROFILE_ID.test(slug) ? slug : '',
      },
    ]
  })
}

function projectFields(value) {
  if (!Array.isArray(value)) return []
  return value
    .slice(0, 10)
    .map((field) => text(field, 100))
    .filter(Boolean)
}

function projectPhoto(value) {
  const url = text(value, 2000)
  return PROJECT_PHOTO_URL.test(url) ? url : ''
}

export function toProgramProjectCard(snapshot) {
  const data = snapshot.data() || {}
  return {
    id: snapshot.id,
    title: text(data.title, 200),
    abstract: text(data.abstract, 1000),
    project_photo: projectPhoto(data.project_photo),
    member_arr: projectMembers(data.member_arr),
    fields: projectFields(data.fields),
    upvote_count: normalizeUpvoteCount(data.upvote_count),
  }
}

export async function fetchProgramProjectsPage(
  firestore,
  opportunityId,
  cursor = null
) {
  const canonicalId = canonicalProgramSlug(opportunityId)
  const relatedIds = [
    canonicalId,
    ...Object.entries(PROGRAM_ALIASES)
      .filter(([, canonical]) => canonical === canonicalId)
      .map(([alias]) => alias),
  ]
  const constraints = [
    relatedIds.length > 1
      ? where('opportunity_id', 'in', relatedIds)
      : where('opportunity_id', '==', opportunityId),
    orderBy(documentId()),
  ]
  if (cursor) constraints.push(startAfter(cursor))
  constraints.push(limit(PROGRAM_PROJECTS_PAGE_SIZE + 1))

  const snapshot = await getDocs(
    query(collection(firestore, 'projects'), ...constraints)
  )
  const pageDocs = snapshot.docs.slice(
    0,
    PROGRAM_PROJECTS_PAGE_SIZE
  )

  return {
    projects: pageDocs.map(toProgramProjectCard),
    nextCursor:
      snapshot.docs.length > PROGRAM_PROJECTS_PAGE_SIZE
        ? pageDocs[pageDocs.length - 1].id
        : null,
  }
}
