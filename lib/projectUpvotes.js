import { doc, runTransaction } from 'firebase/firestore'

// One-doc-per-user under projects/{projectId}/upvotes/{uid}. The parent
// project's `upvote_count` is the denormalized counter ProjectCard and
// the project page read; rules require the count delta and the vote
// doc write land in the same transaction.

export function getProjectUpvoteRef(db, projectId, uid) {
  return doc(db, 'projects', projectId, 'upvotes', uid)
}

export function normalizeUpvoteCount(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return Math.floor(n)
}

/**
 * Toggle the signed-in user's support for a project.
 * Returns the post-toggle state: { upvoted, upvote_count }.
 */
export async function toggleProjectUpvote(
  db,
  projectId,
  uid
) {
  if (!db || !projectId || !uid) {
    throw new Error('toggleProjectUpvote: missing args')
  }

  const projectRef = doc(db, 'projects', projectId)
  const upvoteRef = getProjectUpvoteRef(db, projectId, uid)

  return runTransaction(db, async (transaction) => {
    const projectSnap = await transaction.get(projectRef)
    if (!projectSnap.exists()) {
      throw new Error(
        'toggleProjectUpvote: project missing'
      )
    }

    const upvoteSnap = await transaction.get(upvoteRef)
    const currentCount = normalizeUpvoteCount(
      projectSnap.data()?.upvote_count
    )

    if (upvoteSnap.exists()) {
      const nextCount = Math.max(0, currentCount - 1)
      transaction.delete(upvoteRef)
      transaction.update(projectRef, {
        upvote_count: nextCount,
      })
      return { upvoted: false, upvote_count: nextCount }
    }

    const nextCount = currentCount + 1
    transaction.set(upvoteRef, {
      uid,
      projectId,
      createdAt: new Date().toISOString(),
    })
    transaction.update(projectRef, {
      upvote_count: nextCount,
    })
    return { upvoted: true, upvote_count: nextCount }
  })
}
