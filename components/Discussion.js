import {
  collection,
  query,
  addDoc,
  orderBy,
} from '@firebase/firestore'
import { useState, useCallback, useEffect } from 'react'
import {
  useFirestore,
  useFirestoreCollectionData,
  useSigninCheck,
} from 'reactfire'
import { useRouter } from 'next/router'
import { post } from '../context/helpers.js'
import ProfilePhoto from './ProfilePhoto'

import debounce from 'lodash.debounce'
import moment from 'moment'

export default function Discussion({ type, item_id }) {
  const { authStatus, data: signInCheckResult } =
    useSigninCheck()
  const firestore = useFirestore()

  let discussionCollection = collection(
    firestore,
    type,
    item_id,
    'discussion'
  )
  const discussionQuery = query(
    discussionCollection,
    orderBy('date', 'asc')
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
  const [model, setModel] = useState({})

  const router = useRouter()

  moment.locale(router?.locale ? router.locale : 'en')

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

  const postLink =
    'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze?key=' +
    process.env.NEXT_PUBLIC_GM_API_KEY

  const getScores = useCallback(
    debounce(async (userComment, isComment, index) => {
      setLoading(true)
      const THRESHOLD = 0.7

      if (typeof (window) !== 'undefined') {
        post(window.location.origin + "/api/toxicity", { text: userComment }).then((res) => {
          console.log(
            res.attributeScores.INSULT.summaryScore.value
          )
          try {
            if (
              res.attributeScores.INSULT.summaryScore.value >
              THRESHOLD ||
              res.attributeScores.PROFANITY.summaryScore
                .value > THRESHOLD ||
              res.attributeScores.TOXICITY.summaryScore
                .value > THRESHOLD
            ) {
              if (isComment) {
                setErrorComment(
                  'Please refrain from submitting inappropriate comments'
                )
              } else {
                setErrorReply(
                  'Please refrain from submitting inappropriate comments'
                )
                setErrorReplyIndex(index)
              }
              setLoading(false)
            }

            else {
              setErrorComment('')
              setErrorReply('')
              setErrorReplyIndex(-1)
              setLoading(false)
            }
          } catch (e) {
            setErrorComment('')
            setErrorReply('')
            setErrorReplyIndex(-1)
            setLoading(false)
          }
        })
      }

      else {
        post(postLink, {
          comment: { text: userComment },
          languages: ['en'],
          requestedAttributes: {
            TOXICITY: {},
            PROFANITY: {},
            INSULT: {},
          },
        }).then((res) => {
          console.log(
            res.attributeScores.INSULT.summaryScore.value
          )
          try {
            if (
              res.attributeScores.INSULT.summaryScore.value >
              THRESHOLD ||
              res.attributeScores.PROFANITY.summaryScore
                .value > THRESHOLD ||
              res.attributeScores.TOXICITY.summaryScore
                .value > THRESHOLD
            ) {
              if (isComment) {
                setErrorComment(
                  'Please refrain from submitting inappropriate comments'
                )
              } else {
                setErrorReply(
                  'Please refrain from submitting inappropriate comments'
                )
                setErrorReplyIndex(index)
              }
              setLoading(false)
            }

            else {
              setErrorComment('')
              setErrorReply('')
              setErrorReplyIndex(-1)
              setLoading(false)
            }
          } catch (e) {
            setErrorComment('')
            setErrorReply('')
            setErrorReplyIndex(-1)
            setLoading(false)
          }
        })
      }

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
    // console.log(e)
    if (process.client) {
      document
        .getElementById('discussion-form')
        .checkValidity()
    }
    e.preventDefault()
    let commentDoc = await addDoc(
      collection(firestore, type, item_id, 'discussion'),
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
        <label
          htmlFor="comment"
          className="uppercase text-gray-600"
        >
          Comment
        </label>
        <textarea
          onChange={(e) => onChange(e, true, -1)}
          value={comment}
          name="comment"
          id="comment"
          required
          rows="3"
          className={`focus:outline-none mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-white p-2 leading-tight shadow focus:bg-white focus:placeholder-gray-700 focus:shadow-lg ${error_comment
            ? 'border-red-700 text-red-800 placeholder-red-700'
            : 'text-gray-700 focus:border-sciteensLightGreen-regular'
            }`}
          type="textarea"
          placeholder={
            discussion?.length
              ? ''
              : 'Start the conversation...'
          }
          aria-label="comment"
          maxLength="1000"
        ></textarea>
        <p className="text-sm text-red-800">
          {error_comment}
        </p>
        <div
          className={`mt-2 flex w-full justify-end ${comment === '' ? 'hidden' : ''
            }`}
        >
          <button
            type="reset"
            onClick={(e) => {
              setReplyingToName('')
              setReplyingToId('')
              setComment('')
            }}
            className="outline-none mr-2 rounded-lg border-2 border-gray-500 bg-gray-200 p-2 opacity-50 shadow hover:bg-opacity-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || error_comment}
            className="outline-none rounded-lg bg-sciteensLightGreen-regular p-2 text-white shadow hover:bg-sciteensLightGreen-dark disabled:opacity-50"
            onClick={(e) => postComment(e)}
          >
            Post
            {loading && (
              <img
                src="/assets/loading.svg"
                alt="Loading Spinner"
                className="inline-block h-5 w-5"
              />
            )}
          </button>
        </div>
      </form>
      {router.isReady && router.basePath}
      {discussion?.length ? (
        discussion.map((comment, key) => {
          if (comment.reply_to_id == '')
            return (
              <div>
                <div
                  id={comment.id}
                  key={comment.date}
                  className={`relative bg-white p-4 shadow ${router.isReady &&
                    router.basePath.includes(comment.id) &&
                    'bg-gray-200'
                    } ${replyingToId === comment.id
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
                  <p className="absolute top-4 right-4 text-xs text-gray-700">
                    {moment(comment.date).calendar(null, {
                      sameElse: 'MMMM DD, YYYY',
                    })}
                  </p>
                  <p>{comment.comment}</p>
                  <div className="flex justify-end">
                    <button
                      className="text-gray-700 hover:text-black"
                      onClick={(e) =>
                        handleReplyTo(comment, key)
                      }
                    >
                      Reply
                    </button>
                  </div>
                </div>
                <div
                  className={`flex flex-row bg-white  ${error_reply && error_reply_index === key
                    ? 'border-red-700'
                    : 'border-sciteensLightGreen-regular'
                    }
                            ${replyingToId === comment.id
                      ? 'rounded-b-lg border-2'
                      : 'h-0 overflow-hidden rounded-lg'
                    }`}
                >
                  <textarea
                    onChange={(e) =>
                      onChange(e, false, key)
                    }
                    name="reply"
                    id={'reply' + key}
                    required
                    rows="3"
                    resize="none"
                    className={`w-full resize-none appearance-none border-transparent bg-white p-2 leading-tight shadow focus:shadow-lg 
                                ${replyingToId == comment.id
                        ? 'rounded-lg'
                        : 'rounded-lg border-none'
                      } focus:outline-none focus:bg-white focus:placeholder-gray-700 
                                ${error_reply &&
                        error_reply_index === key
                        ? 'text-red-800 placeholder-red-700'
                        : 'border-sciteensLightGreen-regular text-gray-700'
                      }`}
                    type="textarea"
                    placeholder="Reply..."
                    aria-label="reply"
                    maxLength="1000"
                  ></textarea>
                  <div className="flex w-min flex-col">
                    <button
                      type="reset"
                      onClick={(e) => {
                        setReplyingToName('')
                        setReplyingToId('')
                        setComment('')
                      }}
                      className="outline-none mr-2 h-full w-full bg-gray-200 py-2 px-2 hover:bg-gray-300 disabled:opacity-50 md:px-4"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={
                        loading ||
                        error_reply ||
                        !signInCheckResult?.signedIn
                      }
                      className="outline-none h-full rounded-br-lg bg-sciteensLightGreen-regular p-2 text-white hover:bg-sciteensLightGreen-dark disabled:opacity-50"
                      onClick={(e) => postComment(e)}
                    >
                      Post
                      {loading && (
                        <img
                          src="/assets/loading.svg"
                          alt="Loading Spinner"
                          className="inline-block h-5 w-5"
                        />
                      )}
                    </button>
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
                        <div className="flex w-full flex-row">
                          <div className="ml-5 mr-5 w-[2px] bg-gray-200 md:ml-8 md:mr-8" />
                          <div className="w-full">
                            <div
                              id={reply.id}
                              key={reply.date}
                              className={`relative mb-2 ml-auto rounded-lg bg-white p-4  shadow`}
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
                              <p className="absolute top-4 right-4 text-xs text-gray-700">
                                {moment(
                                  reply.date
                                ).calendar(null, {
                                  sameElse: 'MMMM DD, YYYY',
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
