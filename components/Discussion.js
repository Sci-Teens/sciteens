import { collection, query, addDoc, orderBy } from "@firebase/firestore"
import { useState, useCallback, useEffect } from "react";
import { useFirestore, useFirestoreCollectionData, useSigninCheck } from "reactfire"
import { useRouter } from "next/router";
import Link from "next/link";
// const { Client } = require("@conversationai/perspectiveapi-js-client");
// const client = new Client(process.env.NEXT_PUBLIC_GM_API_KEY);
import ProfilePhoto from "./ProfilePhoto";

import debounce from "lodash/debounce";
import moment from "moment";

const {google} = require('googleapis');
const PERSPECTIVE_API_KEY = process.env.NEXT_PUBLIC_GM_API_KEY;
const DISCOVERY_URL = 'https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1';

export default function Discussion({ type, item_id }) {
    const { authStatus, data: signInCheckResult } = useSigninCheck();
    const firestore = useFirestore()
    let discussionCollection;
    discussionCollection = collection(firestore, type, item_id, 'discussion');
    const discussionQuery = query(discussionCollection, orderBy('date', 'asc'))
    const { data: discussion } = useFirestoreCollectionData(discussionQuery, {
        idField: 'id'
    });
    const profanityThresholds = {
        'INSULT': 0.7,
        'PROFANITY': 0.7,
        'TOXICITY': 0.7
    }

    const [loading, setLoading] = useState(false)
    const [comment, setComment] = useState('')
    const [reply, setReply] = useState('')
    const [replyingToId, setReplyingToId] = useState('')
    const [replyingToName, setReplyingToName] = useState('')
    const [error_comment, setErrorComment] = useState('')
    const [error_reply, setErrorReply] = useState('')
    const [error_reply_index, setErrorReplyIndex] = useState(0)

    const router = useRouter()

    moment.locale(router?.locale ? router.locale : 'en');

    const onChange = async (e, isComment, index) => {
        if (isComment) {
            setComment(e.target.value)
        } else {
            setReply(e.target.value)
        }
        if (e.target.value == "") {
            if (isComment) {
                setErrorComment("Please submit a comment")
            } else {
                setErrorReply("Please submit a comment")
                setErrorReplyIndex(index)
            }
        }

        else {
            setErrorComment("")
            setErrorReply("")
            setErrorReplyIndex(-1)
            // Check for profanity 
            // CheckToxicity(e.target.value.trim(), isComment, index)
            evaluateMessage(e.target.value.trim())
        }
    }
    async function evaluateMessage(text) {
        const analyzer = google.commentanalyzer('v1alpha1');
      
        const requestedAttributes = {};
        for (const key in attributeThresholds) {
          requestedAttributes[key] = {};
        }
      
        const req = {
          comment: {text: text},
          languages: ['en'],
          requestedAttributes: requestedAttributes,
        };
      
        const res = await analyzer.comments.analyze({
          key: process.env.PERSPECTIVE_API_KEY,
          resource: req},
        );
      
        data = {};
      
        for (const key in res['data']['attributeScores']) {
          data[key] =
              res['data']['attributeScores'][key]['summaryScore']['value'] >
              attributeThresholds[key];
        }
        console.log(data)
        return data;
      }

    // const CheckToxicity = useCallback(debounce(async (c, isComment, index) => {
    //     const THRESHOLD = 0.7
    //     try {
    //         const res = await client.getScores(c, {
    //             attributes: ["TOXICITY", "PROFANITY", "INSULT"],
    //         })
    //         console.log(res)
    //         if (res.INSULT > THRESHOLD || res.PROFANITY > THRESHOLD || res.TOXICITY > THRESHOLD) {
    //             console.log(replyingToId);
    //             if (isComment) {
    //                 setErrorComment("Please refrain from submitting inappropriate comments")
    //             } else {
    //                 setErrorReply("Please refrain from submitting inappropriate comments")
    //                 setErrorReplyIndex(index)
    //             }
    //         }
    //     }
    //     catch (e) {
    //         setErrorComment("")
    //         setErrorReply("")
    //         setErrorReplyIndex(-1)
    //     }
    // }, 1000), [])


    const postComment = async (e) => {
        e.preventDefault()
        if (!signInCheckResult?.signedIn) {
            router.push({
                pathname: '/signup',
                query: { ref: `${type}|${item_id}` }
            })
            return
        }
        // console.log(e)
        if (process.client) {
            document.getElementById('discussion-form').checkValidity()
        }
        e.preventDefault()
        let commentDoc = await addDoc(collection(firestore, type, item_id, 'discussion'), {
            date: (new Date()).toISOString(),
            uid: signInCheckResult.user.uid,
            display: signInCheckResult.user.displayName,
            comment: replyingToId ? reply.trim() : comment.trim(),
            reply_to_id: replyingToId ? replyingToId : '',
            reply_to_name: replyingToName ? replyingToName : ''
        })
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
        <div className="w-full mb-12 mt-6">
            <form onSubmit={e => postComment(e)} className="mb-6">
                <h2 className="text-3xl font-bold text-black mb-4">
                    Discussion
                </h2>
                <label htmlFor="comment" className="uppercase text-gray-600">Comment</label>
                <textarea
                    onChange={e => onChange(e, true, -1)}
                    value={comment}
                    name="comment"
                    id="comment"
                    required
                    rows="3"
                    className={`appearance-none border-transparent border-2 bg-white shadow focus:shadow-lg w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none focus:bg-white focus:placeholder-gray-700 ${error_comment
                        ? 'border-red-700 text-red-800 placeholder-red-700'
                        : 'focus:border-sciteensLightGreen-regular text-gray-700'}`}
                    type="textarea"
                    placeholder={discussion?.length ? "" : "Start the conversation..."}
                    aria-label="comment"
                    maxLength="1000"
                >
                </textarea>
                <p className="text-sm text-red-800">
                    {error_comment}
                </p>
                <div className={`w-full flex justify-end mt-2 ${comment === "" ? "hidden" : ""}`}>
                    <button
                        type="reset"
                        onClick={e => { setReplyingToName(''); setReplyingToId(''); setComment('') }}
                        className="rounded-lg p-2 bg-gray-200 opacity-50 hover:bg-opacity-100 shadow border-2 border-gray-500 outline-none disabled:opacity-50 mr-2">
                        Cancel
                    </button>
                    <button
                        type="submit" disabled={loading || error_comment}
                        className="bg-sciteensLightGreen-regular text-white rounded-lg p-2 hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                        onClick={e => postComment(e)}
                    >
                        Post
                        {
                            loading &&
                            <img src="/assets/loading.svg" alt="Loading Spinner" className="h-5 w-5 inline-block" />
                        }
                    </button>
                </div>
            </form>
            {router.isReady && router.basePath}
            {discussion?.length ?
                discussion.map((comment, key) => {
                    if (comment.reply_to_id == "") return (
                        <div>
                            <div id={comment.id} key={comment.date} className={`relative p-4 shadow bg-white ${router.isReady && router.basePath.includes(comment.id) && 'bg-gray-200'} ${replyingToId === comment.id ? "rounded-t-lg" : "rounded-lg"}`}>
                                <div className="flex flex-row items-center mb-2">
                                    <div className="h-10 w-10 mr-2">
                                        <ProfilePhoto uid={comment.uid}></ProfilePhoto>
                                    </div>
                                    <p className="font-semibold">{comment.display}</p>
                                </div>
                                <p className="absolute top-4 right-4 text-gray-700 text-xs">
                                    {moment(comment.date).calendar(null, { sameElse: 'MMMM DD, YYYY' })}
                                </p>
                                <p>{comment.comment}</p>
                                <div className="flex justify-end">
                                    <button className="text-gray-700 hover:text-black" onClick={(e) => handleReplyTo(comment, key)}>
                                        Reply
                                    </button>
                                </div>
                            </div>
                            <div className={`bg-white flex flex-row  ${error_reply && error_reply_index === key ? "border-red-700" : "border-sciteensLightGreen-regular"}
                            ${replyingToId === comment.id ? "rounded-b-lg border-2" : "h-0 overflow-hidden rounded-lg"}`}>
                                <textarea
                                    onChange={e => onChange(e, false, key)}
                                    name="reply"
                                    id={"reply" + key}
                                    required
                                    rows="3"
                                    resize="none"
                                    className={`appearance-none border-transparent resize-none bg-white shadow focus:shadow-lg w-full p-2 leading-tight 
                                ${replyingToId == comment.id ? 'rounded-lg' : 'rounded-lg border-none'} focus:outline-none focus:bg-white focus:placeholder-gray-700 
                                ${error_reply && error_reply_index === key ? 'text-red-800 placeholder-red-700' : 'border-sciteensLightGreen-regular text-gray-700'}`}
                                    type="textarea"
                                    placeholder="Reply..."
                                    aria-label="reply"
                                    maxLength="1000"></textarea>
                                <div className="flex flex-col w-min">
                                    <button
                                        type="reset"
                                        onClick={e => { setReplyingToName(''); setReplyingToId(''); setComment('') }}
                                        className="py-2 h-full w-full px-2 md:px-4 bg-gray-200 hover:bg-gray-300 outline-none disabled:opacity-50 mr-2">
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={loading || error_reply || !signInCheckResult?.signedIn}
                                        className="h-full rounded-br-lg bg-sciteensLightGreen-regular text-white p-2 hover:bg-sciteensLightGreen-dark outline-none disabled:opacity-50"
                                        onClick={e => postComment(e)}
                                    >
                                        Post
                                        {
                                            loading &&
                                            <img
                                                src="/assets/loading.svg"
                                                alt="Loading Spinner"
                                                className="h-5 w-5 inline-block"
                                            />
                                        }
                                    </button>
                                </div>

                            </div>
                            <div className="mb-7">
                                {reply && error_reply_index === key && replyingToId === comment.id &&
                                    <p className="text-sm text-red-800">
                                        {error_reply}
                                    </p>}
                            </div>
                            <div className="-mt-4">
                                {discussion.map((reply) => {
                                    if (comment.id === reply.reply_to_id) return <div className="flex flex-row w-full">
                                        <div className="w-[2px] bg-gray-200 ml-5 mr-5 md:ml-8 md:mr-8" />
                                        <div className="w-full">
                                            <div id={reply.id} key={reply.date} className={`relative p-4 mb-2 shadow bg-white ml-auto  rounded-lg`}>
                                                <div className="flex flex-row items-center mb-2">
                                                    <div className="h-10 w-10 mr-2">
                                                        <ProfilePhoto uid={reply.uid}></ProfilePhoto>
                                                    </div>
                                                    <p className="font-semibold">{reply.display}</p>
                                                </div>
                                                <p>{reply.comment}</p>
                                                <p className="absolute top-4 right-4 text-gray-700 text-xs">
                                                    {moment(reply.date).calendar(null, { sameElse: 'MMMM DD, YYYY' })}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                })
                                }
                            </div>
                            <div className="h-4" />
                        </div>
                    )
                }) : <></>
            }
        </div >
    )
}