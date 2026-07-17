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
import { db } from '../lib/firebase'
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
      className="flex min-w-0 flex-row items-center no-underline"
    >
      {photo}
      <p className="text-sciteensGreen-regular hover:text-sciteensGreen-dark font-bold">
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

  const [loading, setLoading] = useState(false)
  const [comment, setComment] = useState('')
  const [reply, setReply] = useState('')
  const [replyingToId, setReplyingToId] = useState('')
  const [replyingToName, setReplyingToName] = useState('')
  const [error_comment, setErrorComment] = useState('')
  const [error_reply, setErrorReply] = useState('')
  const [error_reply_index, setErrorReplyIndex] =
    useState(0)

  // Web Worker running Xenova/toxic-bert (Transformers.js) fully
  // client-side — see lib/toxicityWorker.js. Created lazily so it only
  // exists in the browser (never during SSR), and terminated on unmount.
  const toxicityWorkerRef = useRef(null)
  // Which field a classification result belongs to; set right before
  // posting to the worker, read back when its response arrives.
  const pendingToxicityRequestRef = useRef(null)

  useEffect(() => {
    const worker = new Worker(
      new URL('../lib/toxicityWorker.js', import.meta.url),
      { type: 'module' }
    )
    worker.onmessage = (event) => {
      const { code, payload } = event.data || {}
      switch (code) {
        case MESSAGE_CODE.RESPONSE_READY: {
          const pending = pendingToxicityRequestRef.current
          if (!pending) break
          if (payload?.isToxic) {
            const msg =
              'Please refrain from submitting inappropriate comments'
            if (pending.isComment) {
              setErrorComment(msg)
            } else {
              setErrorReply(msg)
              setErrorReplyIndex(pending.index)
            }
          } else {
            setErrorComment('')
            setErrorReply('')
            setErrorReplyIndex(-1)
          }
          setLoading(false)
          break
        }
        case MESSAGE_CODE.INFERENCE_ERROR:
        case MESSAGE_CODE.MODEL_ERROR: {
          // Model unavailable / inference failed — fail open, same as
          // the old proxy's 5xx/network handling: never block posting
          // over a classifier problem, only over actual toxicity.
          setErrorComment('')
          setErrorReply('')
          setErrorReplyIndex(-1)
          setLoading(false)
          break
        }
        default:
          break
      }
    }
    toxicityWorkerRef.current = worker
    return () => {
      worker.terminate()
      toxicityWorkerRef.current = null
    }
  }, [])

  const router = useRouter()

  const onChange = async (e, isComment, index) => {
    setLoading(true)
    if (isComment) {
      setComment(e.target.value)
    } else {
      setReply(e.target.value)
    }
    if (e.target.value == '') {
      if (isComment) {
        setErrorComment('Please submit a comment')
      } else {
        setErrorReply('Please submit a comment')
        setErrorReplyIndex(index)
      }
      setLoading(false)
    } else {
      setErrorComment('')
      setErrorReply('')
      setErrorReplyIndex(-1)
      await getScores(
        e.target.value.trim(),
        isComment,
        index
      )
    }
  }

  const getScores = useCallback(
    debounce((userComment, isComment, index) => {
      setLoading(true)

      const validation = validateCommentText(userComment)
      if (!validation.valid) {
        // Missing/oversized text — block, mirroring the old proxy's
        // 400 handling.
        const msg =
          'This comment could not be submitted; please shorten it and try again.'
        if (isComment) {
          setErrorComment(msg)
        } else {
          setErrorReply(msg)
          setErrorReplyIndex(index)
        }
        setLoading(false)
        return
      }

      if (!toxicityWorkerRef.current) {
        // Worker not ready yet (e.g. unmounted) — fail open.
        setErrorComment('')
        setErrorReply('')
        setErrorReplyIndex(-1)
        setLoading(false)
        return
      }

      pendingToxicityRequestRef.current = {
        isComment,
        index,
      }
      toxicityWorkerRef.current.postMessage(userComment)
    }, 500),
    []
  )

  const postComment = async (e) => {
    e.preventDefault()
    if (!signInCheckResult?.signedIn) {
      router.push({
        pathname: '/signup/student',
        query: { ref: `${type}|${item_id}` },
      })
      return
    }
    if (typeof window !== 'undefined') {
      document
        .getElementById('discussion-form')
        .checkValidity()
    }
    e.preventDefault()
    await addDoc(
      collection(db, type, item_id, 'discussion'),
      {
        date: new Date().toISOString(),
        uid: signInCheckResult.user.uid,
        display: signInCheckResult.user.displayName,
        comment: replyingToId
          ? reply.trim()
          : comment.trim(),
        reply_to_id: replyingToId ? replyingToId : '',
        reply_to_name: replyingToName ? replyingToName : '',
      }
    )
    setComment('')
    setReply('')
    setReplyingToId('')
    setReplyingToName('')
    setLoading(false)
  }

  const handleReplyTo = (c, key) => {
    setReplyingToId(c.id)
    setReplyingToName(c.display)
    document.getElementById(`reply${key}`)?.focus()
  }

  return (
    <div className="mb-12 mt-6 w-full">
      <h2 className="mb-4 text-2xl font-semibold md:text-3xl">
        {t('discussion.title')}
      </h2>
      <form
        onSubmit={(e) => postComment(e)}
        className="mb-6"
      >
        <Field data-invalid={!!error_comment}>
          <FieldLabel htmlFor="comment" className="sr-only">
            {t('discussion.comment_label')}
          </FieldLabel>
          <Textarea
            onChange={(e) => onChange(e, true, -1)}
            value={comment}
            name="comment"
            id="comment"
            required
            rows={3}
            className="bg-card"
            aria-invalid={!!error_comment}
            placeholder={
              discussion?.length
                ? ''
                : t('discussion.placeholder')
            }
            aria-label={t('discussion.comment_label')}
            maxLength={1000}
          />
          {error_comment && (
            <FieldError>{error_comment}</FieldError>
          )}
        </Field>
        <div
          className={`mt-2 flex w-full justify-end ${
            comment === '' ? 'hidden' : ''
          }`}
        >
          <Button
            type="reset"
            onClick={() => {
              setReplyingToName('')
              setReplyingToId('')
              setComment('')
            }}
            variant="outline"
            className="mr-2"
          >
            {t('discussion.cancel')}
          </Button>
          <Button
            type="submit"
            disabled={loading || error_comment}
            onClick={(e) => postComment(e)}
          >
            {t('discussion.post')}
            {loading && <LoadingSpinner />}
          </Button>
        </div>
      </form>
      {discussion?.length ? (
        discussion.map((comment, key) => {
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
                    <p>{comment.comment}</p>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        onClick={() =>
                          handleReplyTo(comment, key)
                        }
                      >
                        {t('discussion.reply')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                <div
                  className={`border-border/60 bg-card flex flex-row ${
                    replyingToId === comment.id
                      ? `rounded-b-xl border border-t-0 ${
                          error_reply &&
                          error_reply_index === key
                            ? 'border-destructive'
                            : ''
                        }`
                      : 'h-0 overflow-hidden rounded-lg'
                  }`}
                >
                  <div className="flex w-full flex-col p-2">
                    <FieldLabel
                      htmlFor={`reply${key}`}
                      className="sr-only"
                    >
                      {t('discussion.reply_label')}
                    </FieldLabel>
                    <Textarea
                      onChange={(e) =>
                        onChange(e, false, key)
                      }
                      name="reply"
                      id={`reply${key}`}
                      required
                      rows={3}
                      className="border-none shadow-none"
                      aria-invalid={
                        !!(
                          error_reply &&
                          error_reply_index === key
                        )
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
                      type="reset"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setReplyingToName('')
                        setReplyingToId('')
                        setComment('')
                      }}
                    >
                      {t('discussion.cancel')}
                    </Button>
                    <Button
                      type="submit"
                      size="sm"
                      disabled={
                        loading ||
                        error_reply ||
                        !signInCheckResult?.signedIn
                      }
                      onClick={(e) => postComment(e)}
                    >
                      {t('discussion.post')}
                      {loading && <LoadingSpinner />}
                    </Button>
                  </div>
                </div>
                <div className="mb-7">
                  {reply &&
                    error_reply_index === key &&
                    replyingToId === comment.id && (
                      <FieldError>{error_reply}</FieldError>
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
                          <div className="w-full">
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
                                <p>{reply.comment}</p>
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
