import { collection, query, addDoc, orderBy } from "@firebase/firestore"
import { useState, useCallback, useEffect } from "react";
import { useFirestore, useFirestoreCollectionData, useSigninCheck } from "reactfire"
import { useRouter } from "next/router";
import Link from "next/link";
const { Client } = require("@conversationai/perspectiveapi-js-client");
const client = new Client(process.env.NEXT_PUBLIC_GM_API_KEY);

import debounce from "lodash/debounce";
import moment from "moment";

export default function Discussion({ type, projectId }) {
    const { authStatus, data: signInCheckResult } = useSigninCheck();
    const firestore = useFirestore()
    const discussionCollection = collection(firestore, 'projects', projectId, 'discussion');
    const discussionQuery = query(discussionCollection, orderBy('date', 'asc'))
    const { data: discussion } = useFirestoreCollectionData(discussionQuery, {
        idField: 'id'
    });

    const [loading, setLoading] = useState(false)
    const [comment, setComment] = useState('')
    const [replyingToId, setReplyingToId] = useState('')
    const [replyingToName, setReplyingToName] = useState('')
    const [error_comment, setErrorComment] = useState('')

    const router = useRouter()

    const onChange = async (e) => {
        setComment(e.target.value)
        if (e.target.value == "") {
            setErrorComment("Please submit a comment")
        }

        else {
            setErrorComment("")
            // Check for profanity 
            CheckToxicity(e.target.value.trim())
        }
    }

    const CheckToxicity = useCallback(debounce(async (c) => {
        const THRESHOLD = 0.7
        try {
            const res = await client.getScores(c, {
                attributes: ["TOXICITY", "PROFANITY", "INSULT"],
            })
            console.log(res)
            if (res.INSULT > THRESHOLD || res.PROFANITY > THRESHOLD || res.TOXICITY > THRESHOLD) {
                setErrorComment("Please refrain from submitting toxic comments")
            }
        }
        catch (e) {
            setErrorComment("")
        }
    }, 1000), [])

    const postComment = async (e) => {
        console.log(e)
        if (process.client) {
            document.getElementById('discussion-form').checkValidity()
        }
        e.preventDefault()
        let commentDoc = await addDoc(collection(firestore, 'projects', projectId, 'discussion'), {
            date: (new Date()).toISOString(),
            uid: signInCheckResult.user.uid,
            display: signInCheckResult.user.displayName,
            comment: comment.trim(),
            reply_to_id: replyingToId ? replyingToId : '',
            reply_to_name: replyingToName ? replyingToName : ''
        })
    }

    const handleReplyTo = (c) => {
        setReplyingToId(c.id)
        setReplyingToName(c.display)
        document.getElementById("comment").focus()
    }

    return (
        <div className="w-full">
            <form onSubmit={e => postComment(e)}>
                <label for="comment" className="uppercase text-gray-600">
                    Discussion
                </label>
                {
                    replyingToId && <div className={`rounded-t-lg p-2 bg-green-200 ${error_comment
                        ? 'border-red-700 text-red-800 placeholder-red-700'
                        : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`}>
                        Replying to&nbsp;
                        <a href={`#${replyingToId}`} className="font-semibold">
                            {replyingToName}
                        </a>
                    </div>
                }
                <textarea
                    onChange={e => onChange(e)}
                    value={comment}
                    name="comment"
                    id="comment"
                    required
                    rows="3"
                    className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight ${replyingToId ? 'rounded-b' : 'rounded'} focus:outline-none focus:bg-white focus:placeholder-gray-700 ${error_comment
                        ? 'border-red-700 text-red-800 placeholder-red-700'
                        : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`}
                    type="textarea"
                    placeholder={discussion?.length ? "Enter a relevant comment..." : "Be the first to post..."}
                    aria-label="comment"
                    maxLength="1000"
                >
                    hello
                </textarea>
                <p className="text-sm text-red-800">
                    {error_comment}
                </p>
                <div className="w-full flex justify-end mt-2">
                    <button
                        type="reset"
                        onClick={e => { setReplyingToName(''); setReplyingToId(''); setComment('') }}
                        className="rounded-lg p-2 bg-gray-200 opacity-50 hover:bg-opacity-100 shadow border-2 border-gray-500 outline-none disabled:opacity-50 mr-2">
                        Cancel
                    </button>
                    <button
                        type="submit"
                        disabled={loading || error_comment || !signInCheckResult?.signedIn}
                        className="bg-sciteensLightGreen-regular text-white rounded-lg p-2 hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                        onClick={e => postComment(e)}
                    >
                        Post
                        {
                            loading &&
                            <img
                                src="~/assets/loading.svg"
                                alt="Loading Spinner"
                                className="h-5 w-5 inline-block"
                            />
                        }
                    </button>
                </div>
            </form>
            {router.isReady && router.basePath}
            {discussion?.length ?
                discussion.map((comment, key) => {
                    return (
                        <div id={comment.id} key={comment.date} className={`p-4 rounded-lg shadow bg-white my-2 ${router.isReady && router.basePath.includes(comment.id) && 'bg-gray-200'} ${replyingToId === comment.id && 'border-sciteensGreen-regular border-2'}`}>
                            <div className="flex w-full justify-between">
                                <div className="w-full">
                                    <h4>
                                        <p className="w-full flex justify-between">
                                            <span>{comment.display}</span>
                                            {
                                                comment.reply_to_id &&
                                                <span className="italic text-sciteensGreen-regular">Replying to&nbsp;
                                                    <a href={`#${comment.reply_to_id}`}>
                                                        {comment.reply_to_name}
                                                    </a>
                                                </span>
                                            }
                                        </p>
                                    </h4>
                                    <p className="text-gray-700 text-sm">
                                        {moment(comment.date).calendar()}
                                    </p>
                                </div>
                            </div>
                            <p>{comment.comment}</p>
                            <div className="flex justify-end">
                                <button className="text-gray-700 hover:text-black" onClick={(e) => handleReplyTo(comment)}>
                                    Reply
                                </button>
                            </div>
                        </div>
                    )
                }) : <></>
            }
        </div>
    )
}