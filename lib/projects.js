export function normalizeProject(project) {
  if (!project) return project

  return {
    ...project,
    title: project.title || project.name || '',
    abstract: project.abstract || project.about || '',
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
