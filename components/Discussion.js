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
import { FieldLabel } from '@/components/ui/field'
import debounce from 'lodash.debounce'
import moment from 'moment'

export default function Discussion({ type, item_id }) {
  const { data: signInCheckResult } = useSigninCheck()

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
        pathname: '/signup',
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
      <form
        onSubmit={(e) => postComment(e)}
        className="mb-6"
      >
        <h2 className="mb-4 text-3xl font-bold text-black">
          Discussion
        </h2>
        <FieldLabel
          htmlFor="comment"
          className="uppercase text-gray-600"
        >
          Comment
        </FieldLabel>
        <Textarea
          onChange={(e) => onChange(e, true, -1)}
          value={comment}
          name="comment"
          id="comment"
          required
          rows={3}
          className={`mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-white p-2 leading-tight shadow focus:bg-white focus:placeholder-gray-700 focus:shadow-lg ${
            error_comment
              ? 'border-red-700 text-red-800 placeholder-red-700'
              : 'focus:border-sciteensLightGreen-regular text-gray-700'
          }`}
          placeholder={
            discussion?.length
              ? ''
              : 'Start the conversation...'
          }
          aria-label="comment"
          maxLength={1000}
        />
        <p className="text-sm text-red-800">
          {error_comment}
        </p>
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
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={loading || error_comment}
            className="bg-sciteensLightGreen-regular hover:bg-sciteensLightGreen-dark rounded-lg p-2 text-white shadow-sm disabled:opacity-50"
            onClick={(e) => postComment(e)}
          >
            Post
            {loading && <LoadingSpinner />}
          </Button>
        </div>
      </form>
      {discussion?.length ? (
        discussion.map((comment, key) => {
          if (comment.reply_to_id == '')
            return (
              <div key={comment.id}>
                <div
                  id={comment.id}
                  key={comment.date}
                  className={`relative bg-white p-4 shadow ${
                    router.isReady &&
                    router.basePath.includes(comment.id) &&
                    'bg-gray-200'
                  } ${
                    replyingToId === comment.id
                      ? 'rounded-t-lg'
                      : 'rounded-lg'
                  }`}
                >
                  <div className="mb-2 flex flex-row items-center">
                    <div className="mr-2 h-10 w-10">
                      <ProfilePhoto
                        uid={comment.uid}
                      ></ProfilePhoto>
                    </div>
                    <p className="font-semibold">
                      {comment.display}
                    </p>
                  </div>
                  <p className="absolute right-4 top-4 text-xs text-gray-700">
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
                      className="text-gray-700 hover:text-black"
                      onClick={() =>
                        handleReplyTo(comment, key)
                      }
                    >
                      Reply
                    </Button>
                  </div>
                </div>
                <div
                  className={`flex flex-row bg-white  ${
                    error_reply && error_reply_index === key
                      ? 'border-red-700'
                      : 'border-sciteensLightGreen-regular'
                  }
                            ${
                              replyingToId === comment.id
                                ? 'rounded-b-lg border-2'
                                : 'h-0 overflow-hidden rounded-lg'
                            }`}
                >
                  <div className="flex w-full flex-col">
                    <FieldLabel
                      htmlFor={`reply${key}`}
                      className="sr-only"
                    >
                      Reply
                    </FieldLabel>
                    <Textarea
                      onChange={(e) =>
                        onChange(e, false, key)
                      }
                      name="reply"
                      id={`reply${key}`}
                      required
                      rows={3}
                      className={`w-full resize-none appearance-none border-transparent bg-white p-2 leading-tight shadow focus:shadow-lg 
                                ${
                                  replyingToId == comment.id
                                    ? 'rounded-lg'
                                    : 'rounded-lg border-none'
                                } focus:bg-white focus:placeholder-gray-700 
                                ${
                                  error_reply &&
                                  error_reply_index === key
                                    ? 'text-red-800 placeholder-red-700'
                                    : 'border-sciteensLightGreen-regular text-gray-700'
                                }`}
                      placeholder="Reply..."
                      aria-label="reply"
                      maxLength={1000}
                    />
                  </div>
                  <div className="flex w-min flex-col">
                    <Button
                      type="reset"
                      onClick={() => {
                        setReplyingToName('')
                        setReplyingToId('')
                        setComment('')
                      }}
                      className="mr-2 h-full w-full bg-gray-200 px-2 py-2 hover:bg-gray-300 disabled:opacity-50 md:px-4"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={
                        loading ||
                        error_reply ||
                        !signInCheckResult?.signedIn
                      }
                      className="bg-sciteensLightGreen-regular hover:bg-sciteensLightGreen-dark h-full rounded-br-lg p-2 text-white disabled:opacity-50"
                      onClick={(e) => postComment(e)}
                    >
                      Post
                      {loading && <LoadingSpinner />}
                    </Button>
                  </div>
                </div>
                <div className="mb-7">
                  {reply &&
                    error_reply_index === key &&
                    replyingToId === comment.id && (
                      <p className="text-sm text-red-800">
                        {error_reply}
                      </p>
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
                          <div className="ml-5 mr-5 w-[2px] bg-gray-200 md:ml-8 md:mr-8" />
                          <div className="w-full">
                            <div
                              id={reply.id}
                              key={reply.date}
                              className={`relative mb-2 ml-auto rounded-lg bg-white p-4  shadow-sm`}
                            >
                              <div className="mb-2 flex flex-row items-center">
                                <div className="mr-2 h-10 w-10">
                                  <ProfilePhoto
                                    uid={reply.uid}
                                  ></ProfilePhoto>
                                </div>
                                <p className="font-semibold">
                                  {reply.display}
                                </p>
                              </div>
                              <p>{reply.comment}</p>
                              <p className="absolute right-4 top-4 text-xs text-gray-700">
                                {moment(reply.date)
                                  .locale(
                                    router?.locale || 'en'
                                  )
                                  .calendar(null, {
                                    sameElse:
                                      'MMMM DD, YYYY',
                                  })}
                              </p>
                            </div>
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
