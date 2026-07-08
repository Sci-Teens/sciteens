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
  }
}
