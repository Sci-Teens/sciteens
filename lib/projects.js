import moment from 'moment'
import { isAllowedProjectLink } from '../context/helpers'

function stripHtml(value) {
  if (typeof value !== 'string') return value
  // Legacy project docs sometimes stored raw rich-text HTML in a field
  // that is now a plain-text Textarea; strip tags rather than render
  // them (never dangerouslySetInnerHTML a user-authored field).
  return value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeProject(project) {
  if (!project) return project

  return {
    ...project,
    title: project.title || project.name || '',
    abstract: stripHtml(
      project.abstract || project.about || ''
    ),
    project_photo:
      project.project_photo || project.photo || '',
    member_arr: project.member_arr || project.members || [],
    member_uids:
      project.member_uids ||
      (project.members || [])
        .map((member) => member.uid)
        .filter(Boolean),
    // Stored links are never trusted as-is — a project owner can write
    // an arbitrary URL directly through the Firestore SDK, bypassing
    // the create/edit forms' validation. Re-check the allowlist here so
    // every renderer gets already-safe data for free.
    links: Array.isArray(project.links)
      ? project.links.filter(isAllowedProjectLink)
      : [],
  }
}

// Firestore Timestamps expose `.toDate()`; legacy/synthetic data may
// already be an ISO string or a plain Date. `moment(undefined)` resolves
// to "now", which would silently mislabel projects with no date — guard
// with an explicit undefined check instead of trusting 'Invalid date'.
export function formatProjectDate(date, locale = 'en') {
  if (date === undefined || date === null || date === '')
    return ''

  const parsedDate = date?.toDate ? date.toDate() : date
  const formattedDate = moment(parsedDate)
    .locale(locale || 'en')
    .format('ll')

  return formattedDate === 'Invalid date'
    ? ''
    : formattedDate
}
