import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useSigninCheck } from '../context/AuthContext'
import { db } from '../lib/firebase'
import { useFirestoreDocData } from '../lib/firestoreData'
import {
  getProjectUpvoteRef,
  normalizeUpvoteCount,
  toggleProjectUpvote,
} from '../lib/projectUpvotes'

export default function ProjectUpvoteButton({
  projectId,
  count = 0,
  size = 'default',
  className,
}) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { data: signInCheckResult } = useSigninCheck()
  const uid = signInCheckResult?.user?.uid || null

  const upvoteRef = useMemo(
    () =>
      uid && projectId
        ? getProjectUpvoteRef(db, projectId, uid)
        : null,
    [uid, projectId]
  )
  const { data: upvoteDoc } = useFirestoreDocData(upvoteRef)

  const serverCount = normalizeUpvoteCount(count)
  const serverUpvoted = Boolean(upvoteDoc)

  // Optimistic overlay so the bolt flips immediately; cleared once the
  // live upvote doc matches what we predicted.
  const [optimistic, setOptimistic] = useState(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!optimistic) return
    if (serverUpvoted === optimistic.upvoted) {
      setOptimistic(null)
    }
  }, [serverUpvoted, optimistic])

  // Drop a stale optimistic state if the user signs out mid-click.
  useEffect(() => {
    if (!uid) setOptimistic(null)
  }, [uid])

  const upvoted = optimistic?.upvoted ?? serverUpvoted
  const displayCount =
    optimistic?.upvote_count ?? serverCount

  async function handleClick(event) {
    // Cards wrap the whole surface in an <a>; keep the bolt independent.
    event.preventDefault()
    event.stopPropagation()

    if (!projectId) return

    if (!signInCheckResult?.signedIn || !uid) {
      router.push({
        pathname: '/signin/student',
        query: { ref: `project|${projectId}` },
      })
      return
    }

    if (busy) return

    const nextUpvoted = !upvoted
    const nextCount = Math.max(
      0,
      displayCount + (nextUpvoted ? 1 : -1)
    )
    setOptimistic({
      upvoted: nextUpvoted,
      upvote_count: nextCount,
    })
    setBusy(true)
    try {
      const result = await toggleProjectUpvote(
        db,
        projectId,
        uid
      )
      setOptimistic(result)
    } catch (err) {
      console.error('toggleProjectUpvote failed:', err)
      setOptimistic(null)
    } finally {
      setBusy(false)
    }
  }

  const label = upvoted
    ? t('projects.remove_support')
    : t('projects.support')

  return (
    <Button
      type="button"
      variant="ghost"
      size={size === 'sm' ? 'sm' : 'default'}
      onClick={handleClick}
      disabled={busy}
      aria-pressed={upvoted}
      aria-label={label}
      title={label}
      className={cn(
        'text-muted-foreground relative z-20 gap-1 tabular-nums',
        upvoted && 'text-amber-500 hover:text-amber-500',
        className
      )}
    >
      <Zap
        className={cn(
          'size-4 transition-colors',
          size === 'sm' ? 'size-3.5' : 'size-4',
          upvoted
            ? 'fill-amber-400 text-amber-400'
            : 'fill-none text-gray-300'
        )}
        aria-hidden="true"
      />
      <span
        className={cn(
          'min-w-[1ch] text-xs',
          size === 'default' && 'text-sm',
          upvoted
            ? 'text-amber-500'
            : 'text-muted-foreground'
        )}
      >
        {displayCount}
      </span>
    </Button>
  )
}
