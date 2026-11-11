import {
  collection,
  query,
  addDoc,
  orderBy,
} from 'firebase/firestore'
import {
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from 'react'
import LoadingSpinner from './LoadingSpinner'
import { useFirestoreCollectionData } from '../lib/firestoreData'
import { useSigninCheck } from '../context/AuthContext'
import { db } from '../lib/firestore'
import { useRouter } from 'next/router'
import {
  MESSAGE_CODE,
  validateCommentText,
} from '../lib/toxicity'
import ProfilePhoto from './ProfilePhoto'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Field,
  FieldLabel,
  FieldError,
} from '@/components/ui/field'
import { Card, CardContent } from '@/components/ui/card'
import { useTranslation } from 'next-i18next'
import debounce from 'lodash.debounce'
import moment from 'moment'

function DiscussionAuthor({ uid, display }) {
  const photo = (
    <div className="mr-2 h-10 w-10 shrink-0">
      <ProfilePhoto uid={uid} />
    </div>
  )

  if (!uid) {
    return (
      <>
        {photo}
        <p className="font-semibold">{display}</p>
      </>
    )
  }

  return (
    <a
      href={`/profile/${uid}`}
      className="group/author flex min-w-0 flex-row items-center no-underline"
    >
      {photo}
      <p className="text-sciteensGreen-dark group-hover/author:underline truncate font-semibold underline-offset-4">
        {display}
      </p>
    </a>
  )
}

export default function Discussion({ type, item_id }) {
  const { data: signInCheckResult } = useSigninCheck()
  const { t } = useTranslation('common')

  const discussionQuery = useMemo(
    () =>
      query(
        collection(db, type, item_id, 'discussion'),
        orderBy('date', 'asc')
      ),
    [type, item_id]
  )
  const { data: discussion } = useFirestoreCollectionData(
    discussionQuery,
    {
      idField: 'id',
    }
  )

  const [comment, setComment] = useState('')
  const [reply, setReply] = useState('')
  const [replyingToId, setReplyingToId] = useState('')
  const [replyingToName, setReplyingToName] = useState('')
  const [commentCheck, setCommentCheck] = useState(null)
  const [replyCheck, setReplyCheck] = useState(null)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState(null)
  const replyTriggerRef = useRef(null)
  const focusReply = useCallback(
    (form) => form?.elements.namedItem('reply')?.focus(),
    []
  )

  // Web Worker running Xenova/toxic-bert (Transformers.js) fully
  // client-side — see lib/toxicityWorker.js. Created lazily so it only
  // exists in the browser (never during SSR), and terminated on unmount.
  const toxicityWorkerRef = useRef(null)
  const checkSequence = useRef(0)
  const scoreDraft = useCallback(
    (request) =>
      toxicityWorkerRef.current?.postMessage(request),
    []
  )
  const scoreComment = useMemo(
    () => debounce(scoreDraft, 500),
    [scoreDraft]
  )
  const scoreReply = useMemo(
    () => debounce(scoreDraft, 500),
    [scoreDraft]
  )

  useEffect(() => {
    if (typeof Worker === 'undefined') return
    const worker = new Worker(
      new URL('../lib/toxicityWorker.js', import.meta.url),
      { type: 'module' }
    )
    worker.onmessage = (event) => {
      const { code, payload, id, isReply } =
        event.data || {}
      if (
        typeof id !== 'number' ||
        (code !== MESSAGE_CODE.RESPONSE_READY &&
          code !== MESSAGE_CODE.INFERENCE_ERROR)
      )
        return
      const setCheck = isReply
        ? setReplyCheck
        : setCommentCheck
      const error =
        code === MESSAGE_CODE.RESPONSE_READY &&
        payload?.isToxic
          ? 'Please refrain from submitting inappropriate comments'
          : ''
      setCheck((current) =>
        current?.id === id && current.pending
          ? { id, error }
          : current
      )
    }
    toxicityWorkerRef.current = worker
    return () => {
      scoreComment.cancel()
      scoreReply.cancel()
      worker.terminate()
      toxicityWorkerRef.current = null
    }
  }, [scoreComment, scoreReply])

  const router = useRouter()
  const commentError = commentCheck?.error
  const replyError = replyCheck?.error

  const onChange = (value, isReply) => {
    const setDraft = isReply ? setReply : setComment
    const setCheck = isReply
      ? setReplyCheck
      : setCommentCheck
    const score = isReply ? scoreReply : scoreComment
    score.cancel()
    setDraft(value)

    const text = value.trim()
    if (!value) {
      setCheck({ error: 'Please submit a comment' })
    } else if (!validateCommentText(text).valid) {
      setCheck({
        error:
          'This comment could not be submitted; please shorten it and try again.',
      })
    } else if (toxicityWorkerRef.current) {
      const id = ++checkSequence.current
      setCheck({ id, pending: true })
      score({ id, text, isReply })
    } else {
      setCheck(null)
    }
  }

  const postComment = async (e, isReply = false) => {
    e.preventDefault()
    if (!signInCheckResult?.signedIn) {
      router.push({
        pathname: '/signup/student',
        query: { ref: `${type}|${item_id}` },
      })
      return
    }
    const text = (isReply ? reply : comment).trim()
    const check = isReply ? replyCheck : commentCheck
    if (
      check?.pending ||
      posting ||
      check?.error ||
      !validateCommentText(text).valid
    )
      return

    const form = e.currentTarget
    setPosting(true)
    setPostError(null)
    try {
      await addDoc(
        collection(db, type, item_id, 'discussion'),
        {
          date: new Date().toISOString(),
          uid: signInCheckResult.user.uid,
          display: signInCheckResult.user.displayName,
          comment: text,
          reply_to_id: isReply ? replyingToId : '',
          reply_to_name: isReply ? replyingToName : '',
        }
      )
      const keepFocus = form.contains(
        document.activeElement
      )
      if (isReply) {
        closeReply(keepFocus)
      } else {
        setComment('')
        if (keepFocus)
          form.elements.namedItem('comment')?.focus()
      }
    } catch {
      setPostError(isReply ? 'reply' : 'comment')
    } finally {
      setPosting(false)
    }
  }

  function closeReply(keepFocus = true) {
    setReply('')
    setReplyingToId('')
    setReplyingToName('')
    scoreReply.cancel()
    setReplyCheck(null)
    if (postError === 'reply') setPostError(null)
    if (keepFocus) replyTriggerRef.current?.focus()
  }

  const handleReplyTo = (c, trigger) => {
    replyTriggerRef.current = trigger
    if (replyingToId === c.id) {
      document.getElementById(`reply-${c.id}`)?.focus()
      return
    }
    setReply('')
    scoreReply.cancel()
    setReplyCheck(null)
    if (postError === 'reply') setPostError(null)
    setReplyingToId(c.id)
    setReplyingToName(c.display)
  }

  return (
    <div className="w-full">
      <h2 className="text-balance text-xl font-semibold md:text-2xl">
        {t('discussion.title')}
      </h2>
      <form
        onSubmit={(e) => postComment(e)}
        className="mb-6 mt-4"
      >
        <Field data-invalid={!!commentError}>
          <FieldLabel htmlFor="comment" className="sr-only">
            {t('discussion.comment_label')}
          </FieldLabel>
          <Textarea
            onChange={(e) =>
              onChange(e.target.value, false)
            }
            value={comment}
            readOnly={posting}
            name="comment"
            id="comment"
            required
            rows={3}
            className="bg-card"
            aria-invalid={!!commentError}
            aria-describedby={
              commentError ? 'comment-error' : undefined
            }
            placeholder={
              discussion?.length
                ? ''
                : t('discussion.placeholder')
            }
            aria-label={t('discussion.comment_label')}
            maxLength={1000}
          />
          {commentError && (
            <FieldError id="comment-error" role="alert">
              {commentError}
            </FieldError>
          )}
          {postError === 'comment' && (
            <FieldError role="alert">
              {t('discussion.post_failed')}
            </FieldError>
          )}
        </Field>
        <div
          className={`mt-2 flex w-full justify-end ${
            comment === '' ? 'hidden' : ''
          }`}
        >
          <Button
            type="reset"
            disabled={posting}
            onClick={(event) => {
              setComment('')
              scoreComment.cancel()
              setCommentCheck(null)
              if (postError === 'comment')
                setPostError(null)
              event.currentTarget.form.elements
                .namedItem('comment')
                ?.focus()
            }}
            variant="outline"
            className="mr-2"
          >
            {t('discussion.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={
              commentCheck?.pending ||
              posting ||
              Boolean(commentError)
            }
            focusableWhenDisabled={posting}
          >
            {t('discussion.post')}
            {(commentCheck?.pending || posting) && (
              <LoadingSpinner />
            )}
          </Button>
        </div>
      </form>
      {discussion?.length ? (
        discussion.map((comment) => {
          if (comment.reply_to_id == '')
            return (
              <div key={comment.id}>
                <Card
                  id={comment.id}
                  key={comment.date}
                  className={`border-border/60 relative shadow-sm ${
                    router.isReady &&
                    router.basePath.includes(comment.id)
                      ? 'ring-primary/50 ring-2'
                      : ''
                  } ${
                    replyingToId === comment.id
                      ? 'rounded-b-none'
                      : ''
                  }`}
                >
                  <CardContent>
                    <div className="mb-2 flex flex-row items-center">
                      <DiscussionAuthor
                        uid={comment.uid}
                        display={comment.display}
                      />
                    </div>
                    <p className="text-muted-foreground absolute right-4 top-4 text-xs">
                      {moment(comment.date)
                        .locale(router?.locale || 'en')
                        .calendar(null, {
                          sameElse: 'MMMM DD, YYYY',
                        })}
                    </p>
                    <p className="wrap-anywhere">
                      {comment.comment}
                    </p>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        aria-disabled={posting || undefined}
                        aria-expanded={
                          replyingToId === comment.id
                        }
                        onClick={(event) => {
                          if (posting) return
                          handleReplyTo(
                            comment,
                            event.currentTarget
                          )
                        }}
                      >
                        {t('discussion.reply')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                {replyingToId === comment.id && (
                  <form
                    ref={focusReply}
                    onSubmit={(e) => postComment(e, true)}
                    className={`border-border/60 bg-card flex flex-row rounded-b-xl border border-t-0 ${
                      replyError ? 'border-destructive' : ''
                    }`}
                  >
                    <div className="flex w-full flex-col p-2">
                      <FieldLabel
                        htmlFor={`reply-${comment.id}`}
                        className="sr-only"
                      >
                        {t('discussion.reply_label')}
                      </FieldLabel>
                      <Textarea
                        onChange={(e) =>
                          onChange(e.target.value, true)
                        }
                        name="reply"
                        id={`reply-${comment.id}`}
                        value={reply}
                        readOnly={posting}
                        required
                        rows={3}
                        className="border-none shadow-none"
                        aria-invalid={Boolean(replyError)}
                        aria-describedby={
                          replyError
                            ? `reply-error-${comment.id}`
                            : undefined
                        }
                        placeholder={t(
                          'discussion.reply_placeholder'
                        )}
                        aria-label={t(
                          'discussion.reply_label'
                        )}
                        maxLength={1000}
                      />
                    </div>
                    <div className="flex w-min flex-col gap-1 p-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={posting}
                        onClick={() => closeReply()}
                      >
                        {t('discussion.cancel')}
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={
                          replyCheck?.pending ||
                          posting ||
                          Boolean(replyError) ||
                          !signInCheckResult?.signedIn
                        }
                        focusableWhenDisabled={posting}
                      >
                        {t('discussion.post')}
                        {(replyCheck?.pending ||
                          posting) && <LoadingSpinner />}
                      </Button>
                    </div>
                  </form>
                )}
                <div className="mb-7">
                  {replyError &&
                    replyingToId === comment.id && (
                      <FieldError
                        id={`reply-error-${comment.id}`}
                        role="alert"
                      >
                        {replyError}
                      </FieldError>
                    )}
                  {replyingToId === comment.id &&
                    postError === 'reply' && (
                      <FieldError role="alert">
                        {t('discussion.post_failed')}
                      </FieldError>
                    )}
                </div>
                <div className="-mt-4">
                  {discussion.map((reply) => {
                    if (comment.id === reply.reply_to_id)
                      return (
                        <div
                          key={reply.id}
                          className="flex w-full flex-row"
                        >
                          <div className="bg-border ml-5 mr-5 w-[2px] md:ml-8 md:mr-8" />
                          <div className="min-w-0 flex-1">
                            <Card
                              id={reply.id}
                              key={reply.date}
                              className="border-border/60 relative mb-2 ml-auto shadow-sm"
                            >
                              <CardContent>
                                <div className="mb-2 flex flex-row items-center">
                                  <DiscussionAuthor
                                    uid={reply.uid}
                                    display={reply.display}
                                  />
                                </div>
                                <p className="wrap-anywhere">
                                  {reply.comment}
                                </p>
                                <p className="text-muted-foreground absolute right-4 top-4 text-xs">
                                  {moment(reply.date)
                                    .locale(
                                      router?.locale || 'en'
                                    )
                                    .calendar(null, {
                                      sameElse:
                                        'MMMM DD, YYYY',
                                    })}
                                </p>
                              </CardContent>
                            </Card>
                          </div>
                        </div>
                      )
                  })}
                </div>
                <div className="h-4" />
              </div>
            )
        })
      ) : (
        <></>
      )}
    </div>
  )
}
