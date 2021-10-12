import { useState, useCallback } from "react"
import moment from "moment"
import Head from "next/head"
import { useFirestore, useSigninCheck } from "reactfire"
import { collection, query, startAt, endAt, orderBy, limit, getDocs } from "@firebase/firestore"
import Error from 'next/error'
import router from "next/router"
import isEmail from 'validator/lib/isEmail'
import debounce from "lodash/debounce";

export default function CreateProject() {
    const [title, setTitle] = useState('')
    const [start_date, setStartDate] = useState('')
    const [end_date, setEndDate] = useState('')
    const [abstract, setAbstract] = useState('')
    const [member, setMember] = useState('')
    const [members, setMembers] = useState([])
    const [fields, setFields] = useState([])

    const [error_title, setErrorTitle] = useState('')
    const [error_start_date, setErrorStartDate] = useState('')
    const [error_end_date, setErrorEndDate] = useState('')
    const [error_abstract, setErrorAbstract] = useState('')
    const [error_member, setErrorMember] = useState('')

    const { status, data: signInCheckResult } = useSigninCheck();
    const firestore = useFirestore()

    const createProject = (e) => {
        e.preventDefault()

    }

    async function onChange(e, target) {
        switch (target) {
            case "title":
                setTitle(e.target.value.trim())
                if (e.target.value.trim() == "") {
                    setErrorTitle("Please fill out your project title")
                }

                else {
                    setErrorTitle("")
                }
                break;

            case "start_date":
                console.log(e.target.value)
                setStartDate(e.target.value)
                if (e.target.value == "") {
                    setErrorStartDate("Please set a valid start date")
                }

                else {
                    setErrorStartDate("")
                }
                break;

            case "end_date":
                setEndDate(e.target.value)
                if (e.target.value == "") {
                    setErrorEndDate("Please set a valid start date")
                }

                else {
                    setErrorEndDate("")
                }
                break;

            case "abstract":
                setAbstract(e.target.value)
                if (e.target.value == "") {
                    setErrorAbstract("Please provide a brief overview of your project (or what you plan to complete for your project)")
                }

                else {
                    setErrorAbstract("")
                }
                break;

            case "member":
                setMember(e.target.value)
                if (!isEmail(e.target.value)) {
                    setErrorMember("Please enter a valid email")
                }

                else {
                    setErrorMember("")
                    validateEmail(e.target.value)
                }
                break;
        }
    }


    const validateEmail =
        useCallback(debounce(async (email) => {
            try {
                const emails = collection(firestore, 'emails')
                const q = query(emails, orderBy('email'), startAt(email), endAt(email + "\u{f8ff}"), limit(3))
                const res = await getDocs(q)
                console.log(res)
                if (res.empty) {
                    setErrorMember("That email address doesn't exist")
                }
                else {
                    setErrorMember("")
                    res.forEach(snap => {
                        if (snap.data().email == email) {
                            setMembers([...new Set([...members, email])])
                            setMember('')
                        }
                    })
                }
            }

            catch (e) {
                setErrorMember("Couldn't look for that address")
            }

        }, 500), []
        )

    const removeElement = (e) => {
        e.preventDefault()
        let temp = [...members]
        const ix = e.target.getAttribute("name")
        temp.splice(ix, 1)
        setMembers([...temp])
    }

    if (status == "success" && signInCheckResult.signedIn) {
        return (<>
            <Head>

            </Head>
            <div className="relative mx-auto px-4 mt-8 mb-4 z-30 text-left w-full md:w-96">
                <h1 className="text-2xl">
                    Create a Project
                </h1>
                <p className="text-gray-700 mb-2">
                    Create a project to share your work and gain feedback from your peers and professional mentors.
                </p>
                <form onSubmit={(e) => createProject(e)}>
                    <label for="title" className="uppercase text-gray-600">
                        Title
                    </label>
                    <input
                        onChange={e => onChange(e, 'title')}
                        value={title}
                        name="title"
                        required
                        className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${error_title
                            ? 'border-red-700 text-red-800 placeholder-red-700'
                            : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`}
                        type="text"
                        placeholder="Enter your project title..."
                        aria-label="title"
                        maxLength="100"
                    />
                    <p className="text-sm text-red-800 mb-4">
                        {error_title}
                    </p>

                    <label for="start-date" className="uppercase text-gray-600">Start Date</label>
                    <input
                        required
                        min={moment()}
                        onChange={e => onChange(e, 'start_date')}
                        value={start_date} type="date"
                        id="start-date" name="start-date"
                        className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${error_start_date
                            ? 'border-red-700 text-red-800 placeholder-red-700'
                            : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`} />
                    <p
                        className={`text-sm mb-4 ${error_start_date ? 'text-red-800' : 'text-gray-700'}`}
                    >
                        {
                            error_start_date
                                ? error_start_date
                                : "Your project's start date"
                        }
                    </p>

                    <label for="end-date" className="uppercase text-gray-600">End Date</label>
                    <input
                        required
                        min={moment()}
                        onChange={e => onChange(e, 'end_date')}
                        value={end_date} type="date"
                        id="end-date" name="end-date"
                        className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${error_end_date
                            ? 'border-red-700 text-red-800 placeholder-red-700'
                            : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`} />
                    <p
                        className={`text-sm mb-4 ${error_end_date ? 'text-red-800' : 'text-gray-700'}`}
                    >
                        {
                            error_end_date
                                ? error_end_date
                                : "Your expected project end date"
                        }
                    </p>

                    <label for="abstract" className="uppercase text-gray-600">
                        Summary
                    </label>
                    <textarea
                        onChange={e => onChange(e, 'abstract')}
                        value={abstract}
                        name="abstract"
                        required
                        className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${error_abstract
                            ? 'border-red-700 text-red-800 placeholder-red-700'
                            : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`}
                        type="textarea"
                        placeholder="Enter a brief project summary..."
                        aria-label="summary"
                        maxLength="1000"
                    />
                    <p className="text-sm text-red-800 mb-4">
                        {error_abstract}
                    </p>

                    <label for="member" className="uppercase text-gray-600">
                        Add Members
                    </label>
                    <input
                        onChange={e => onChange(e, 'member')}
                        value={member}
                        name="member"
                        required
                        className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${error_member
                            ? 'border-red-700 text-red-800 placeholder-red-700'
                            : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`}
                        type="email"
                        placeholder="Enter a project member by email..."
                        aria-label="title"
                        maxLength="100"
                    />
                    <p className="text-sm text-red-800 mb-4">
                        {error_member}
                    </p>
                    {
                        members.map((m, index) =>

                            <p className="p-2">
                                <button name={index} className="h-3 w-3 mr-2 fill-current hover:text-red-900" onClick={e => removeElement(e)}>
                                    <svg name={index} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M10 8.586L2.929 1.515 1.515 2.929 8.586 10l-7.071 7.071 1.414 1.414L10 11.414l7.071 7.071 1.414-1.414L11.414 10l7.071-7.071-1.414-1.414L10 8.586z" /></svg>
                                </button>
                                {m}
                            </p>
                        )
                    }

                    <label for="fields" className="uppercase text-gray-600">
                        Fields
                    </label>
                    <div className="text-gray-600">
                        <input
                            id="biology"
                            v-model="fields"
                            className="form-checkbox active:outline-none text-sciteensLightGreen-regular"
                            type="checkbox"
                            value="Biology"
                        />
                        <label for="biology">
                            Biology
                            <br />
                        </label>
                        <input
                            id="chemistry"
                            v-model="fields"
                            className="form-checkbox active:outline-none text-sciteensLightGreen-regular"
                            type="checkbox"
                            value="Chemistry"
                        />
                        <label for="chemistry">
                            Chemistry
                            <br />
                        </label>
                        <input
                            id="cognitive_science"
                            v-model="fields"
                            className="form-checkbox active:outline-none text-sciteensLightGreen-regular"
                            type="checkbox"
                            value="Cognitive Science"
                        />
                        <label for="cognitive_science">
                            Cognitive Science
                            <br />
                        </label>
                        <input
                            id="computer_science"
                            v-model="fields"
                            className="form-checkbox active:outline-none text-sciteensLightGreen-regular"
                            type="checkbox"
                            value="Computer Science"
                        />
                        <label for="computer_science">
                            Computer Science
                            <br />
                        </label>
                        <input
                            id="earth_science"
                            v-model="fields"
                            className="form-checkbox active:outline-none text-sciteensLightGreen-regular"
                            type="checkbox"
                            value="Earth Science"
                        />
                        <label for="earth_science">
                            Earth Science
                            <br />
                        </label>
                        <input
                            id="electrical_engineering"
                            v-model="fields"
                            className="form-checkbox active:outline-none text-sciteensLightGreen-regular"
                            type="checkbox"
                            value="Electrical Engineering"
                        />
                        <label for="electrical_engineering">
                            Electrical Engineering
                            <br />
                        </label>
                        <input
                            id="environmental_science"
                            v-model="fields"
                            className="form-checkbox active:outline-none text-sciteensLightGreen-regular"
                            type="checkbox"
                            value="Environmental Science"
                        />
                        <label for="environmental_science">
                            Environmental Science
                            <br />
                        </label>
                        <input
                            id="mathematics"
                            v-model="fields"
                            className="form-checkbox active:outline-none text-sciteensLightGreen-regular"
                            type="checkbox"
                            value="Mathematics"
                        />
                        <label for="mathematics">
                            Mathematics
                            <br />
                        </label>
                        <input
                            id="mechanical_engineering"
                            v-model="fields"
                            className="form-checkbox active:outline-none text-sciteensLightGreen-regular"
                            type="checkbox"
                            value="Mechanical Engineering"
                        />
                        <label for="mechanical_engineering">
                            Mechanical Engineering
                            <br />
                        </label>
                        <input
                            id="medicine"
                            v-model="fields"
                            className="form-checkbox active:outline-none text-sciteensLightGreen-regular"
                            type="checkbox"
                            value="Medicine"
                        />
                        <label for="medicine">
                            Medicine
                            <br />
                        </label>
                        <input
                            id="physics"
                            v-model="fields"
                            className="form-checkbox active:outline-none text-sciteensLightGreen-regular"
                            type="checkbox"
                            value="Physics"
                        />
                        <label for="physics">
                            Physics
                            <br />
                        </label>
                        <input
                            id="space_science"
                            v-model="fields"
                            className="form-checkbox active:outline-none text-sciteensLightGreen-regular"
                            type="checkbox"
                            value="Space Science"
                        />
                        <label for="space_science">
                            Space Science
                            <br />
                        </label>
                    </div>

                </form>
            </div>

        </>)
    }

    else if (status == "success" && !signInCheckResult.signedIn) {
        router.push("/signin")
    }

    else if (status == "loading") {
        return <span>loading...</span>
    }

    else if (status == "error") {
        return <Error statusCode={404} ></Error>
    }
}