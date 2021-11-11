import { useState, useCallback, useEffect, useContext } from "react"
import { AppContext } from "../../context/context"
import moment from "moment"
import Head from "next/head"
import { useFirestore, useSigninCheck, useStorage } from "reactfire"
import { collection, query, startAt, endAt, orderBy, limit, getDocs, addDoc, setDoc, doc, updateDoc } from "@firebase/firestore"
import { getStorage, ref, uploadBytes, updateMetadata, getDownloadURL } from "@firebase/storage"
import Error from 'next/error'
import { useRouter } from "next/router"
import isEmail from 'validator/lib/isEmail'
import debounce from "lodash/debounce";
import { useDropzone } from 'react-dropzone'
import File from '../../components/File'
import { useTransition, animated } from "@react-spring/web"

export default function CreateProject() {
    const [loading, setLoading] = useState(false)
    const [title, setTitle] = useState('')
    const [start_date, setStartDate] = useState('')
    const [end_date, setEndDate] = useState('')
    const [abstract, setAbstract] = useState('')
    const [member, setMember] = useState('')
    const [members, setMembers] = useState([])
    const [select_photo_mode, setMode] = useState(false)
    const [field_names] = useState([
        "Biology",
        "Chemistry",
        "Cognitive Science",
        "Computer Science",
        "Earth Science",
        "Electrical Engineering",
        "Environmental Science",
        "Mathematics",
        "Mechanical Engineering",
        "Medicine",
        "Physics",
        "Space Science",
    ])
    const [field_values, setFieldValues] = useState(new Array(field_names.length).fill(false))
    const [file_extensions] = useState([
        "text/html",
        "image/png",
        "image/jpg",
        "image/jpeg",
        "application/pdf",
        "application/vnd.ms-word",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/x-ipynb+json",
        "application/vnd.jupyter",
        "application/vnd.jupyter.cells",
        "application/vnd.jupyter.dragindex",
    ])
    const [files, setFiles] = useState([])
    const [project_photo, setProjectPhoto] = useState('')

    const [error_title, setErrorTitle] = useState('')
    const [error_start_date, setErrorStartDate] = useState('')
    const [error_end_date, setErrorEndDate] = useState('')
    const [error_abstract, setErrorAbstract] = useState('')
    const [error_member, setErrorMember] = useState('')
    const [error_file, setErrorFile] = useState('')

    const { profile } = useContext(AppContext)
    const { status, data: signInCheckResult } = useSigninCheck();
    const firestore = useFirestore()
    const storage = useStorage()

    const router = useRouter()

    useEffect(() => {
        if (status == "success" && !signInCheckResult?.signedIn) {
            router.push({
                pathname: '/signin/student',
                query: { ref: 'project|create' }
            })
        }
    })

    useEffect(() => {
        if (files.length == 0) {
            setErrorFile("Must have at least one photo for display")
        } else {
            setProjectPhoto(files[0]?.name)
            if (error_file == "Must have at least one photo for display") {
                setErrorFile("")
            }
        }
    }, [files])

    const createProject = async (e) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await addDoc(collection(firestore, 'projects'), {
                title: title.trim(),
                start: start_date ? moment(start_date).toISOString() : moment().toISOString(),
                end: end_date ? moment(end_date).toISOString() : "",
                abstract: abstract.trim(),
                need_mentor: false,
                links: [],
                date: moment().toISOString(),
                subscribers: [],
                fields: field_names.filter((item, i) => field_values[i]),
                member_uids: [signInCheckResult.user.uid],
                member_arr: [
                    {
                        display: signInCheckResult.user.displayName,
                        slug: profile.slug,
                        uid: signInCheckResult.user.uid,
                    }
                ]
            })
            await setDoc(doc(firestore, 'project-invites', res.id), {
                emails: members,
                title: title.trim(),
            })
            for (const f of files) {
                const fileRef = ref(storage, `projects/${res.id}/${f.name}`);
                await uploadBytes(fileRef, f)
                if (f.name == project_photo) {
                    await updateMetadata(fileRef, {
                        customMetadata: {
                            'project_photo': 'true',
                        }
                    })
                    const downloadURL = await getDownloadURL(fileRef)
                    await updateDoc(res, {
                        project_photo: downloadURL,
                    })
                }
            }
            router.push(`/project/${res.id}`)
            setLoading(false)
        }

        catch (error) {
            setErrorTitle("We couldn't create your project at this time")
            console.error(error)
            setLoading(false)
        }

    }

    const onDrop = useCallback(fs => {
        for (const f of fs) {
            const reader = new FileReader()

            reader.onabort = () => setErrorFile('File reading was aborted')
            reader.onerror = () => setErrorFile('Failed to read the file')
            reader.onload = () => setErrorFile('')

            if (!(file_extensions.includes(f.type) || f.name.includes(".docx") || f.name.includes(".pptx"))) {
                setErrorFile("This file format is not accepted")
            }

            else if (f.size > 8000000) {
                setErrorFile("This file is too large")
            }

            else {
                reader.readAsDataURL(f)
                console.log(f)
                setFiles(oldfiles => [...new Set([...oldfiles, f])])
            }
        }
    })

    const { acceptedFiles, getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

    async function onChange(e, target) {
        switch (target) {
            case "title":
                setTitle(e.target.value)
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
                    setErrorEndDate("Please set a valid end date")
                }

                else if (start_date != "" && start_date >= e.target.value) {
                    setErrorEndDate("End date must come after start date")
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

            case "fields":
                const id = e.target.id
                const index = field_names.indexOf(id)
                let temp = [...field_values]
                temp[index] = !temp[index]
                setFieldValues([...temp])
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

    const removeMember = (e) => {
        e.preventDefault()
        let temp = [...members]
        const ix = e.target.getAttribute("name")
        temp.splice(ix, 1)
        setMembers([...temp])
    }

    const removeFile = (e, id) => {
        e.preventDefault()
        let temp = [...files]
        temp.splice(id, 1)
        setFiles([...temp])
    }

    const setPhoto = (e, id) => {
        e?.preventDefault()
        let temp_files = files
        let new_project_photo = files[id]
        temp_files[id] = temp_files[0]
        temp_files[0] = new_project_photo
        setProjectPhoto(new_project_photo.name)
        setFiles(temp_files)
        setMode(false)
    }

    if (status == "success" && signInCheckResult.signedIn) {
        return (<>
            <Head>

            </Head>
            <main>
                <div className="relative bg-white mx-auto px-4 md:px-12 lg:px-20 py-8 md:py-12 mt-8 mb-24 z-30 text-left w-11/12 md:w-2/3 lg:w-[45%] shadow rounded-lg">
                    <h1 className="text-3xl text-center font-semibold mb-2">
                        Create a Project
                    </h1>
                    <p className="text-gray-700 text-center mb-6">
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
                            className={`appearance-none border-2 border-transparent bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none ${error_title
                                ? 'border-red-700 text-red-800 placeholder-red-700'
                                : 'focus:border-sciteensLightGreen-regular focus:bg-white text-gray-700 placeholder-sciteensGreen-regular'}`}
                            type="text"
                            aria-label="title"
                            maxLength="100"
                        />
                        <p className="text-sm text-red-800 mb-4">
                            {error_title}
                        </p>

                        <label for="start-date" className="uppercase text-gray-600">Start Date</label>
                        <input
                            required
                            onChange={e => onChange(e, 'start_date')}
                            value={start_date} type="date"
                            id="start-date" name="start-date"
                            className={`appearance-none border-2 border-transparent bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none ${error_start_date
                                ? 'border-red-700 text-red-800 placeholder-red-700'
                                : 'focus:border-sciteensLightGreen-regular focus:bg-white text-gray-700 placeholder-sciteensGreen-regular'}`} />
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
                            onChange={e => onChange(e, 'end_date')}
                            value={end_date} type="date"
                            id="end-date" name="end-date"
                            className={`appearance-none border-2 border-transparent bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none ${error_end_date
                                ? 'border-red-700 text-red-800 placeholder-red-700'
                                : 'focus:border-sciteensLightGreen-regular focus:bg-white text-gray-700 placeholder-sciteensGreen-regular'}`} />
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
                            className={`appearance-none border-2 border-transparent bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none ${error_abstract
                                ? 'border-red-700 text-red-800 placeholder-red-700'
                                : 'focus:border-sciteensLightGreen-regular focus:bg-white text-gray-700 placeholder-sciteensGreen-regular'}`}
                            type="textarea"
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
                            className={`appearance-none border-2 border-transparent bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none ${error_member
                                ? 'border-red-700 text-red-800 placeholder-red-700'
                                : 'focus:border-sciteensLightGreen-regular focus:bg-white text-gray-700 placeholder-sciteensGreen-regular'}`}
                            type="email"
                            aria-label="title"
                            maxLength="100"
                        />
                        <p className="text-sm text-red-800 mb-4">
                            {error_member}
                        </p>
                        {
                            members.map((m, index) =>

                                <p className="p-2">
                                    <button name={index} className="h-3 w-3 mr-2 fill-current hover:text-red-900" onClick={e => removeMember(e)}>
                                        <svg name={index} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M10 8.586L2.929 1.515 1.515 2.929 8.586 10l-7.071 7.071 1.414 1.414L10 11.414l7.071 7.071 1.414-1.414L11.414 10l7.071-7.071-1.414-1.414L10 8.586z" /></svg>
                                    </button>
                                    {m}
                                </p>
                            )
                        }

                        <label for="fields" className="uppercase text-gray-600">
                            Fields
                        </label>
                        {
                            field_names.map((field, index) => {
                                return (
                                    <div>
                                        <input
                                            id={field}
                                            className="form-checkbox active:outline-none text-sciteensLightGreen-regular mr-2"
                                            type="checkbox"
                                            value={field_values[index]}
                                            checked={field_values[index]}
                                            onChange={e => onChange(e, "fields")}
                                        />
                                        <label for={field} className="text-gray-700">
                                            {field}
                                            <br />
                                        </label>
                                    </div>

                                )
                            })
                        }
                        <div className="mb-4"></div>
                        <div {...getRootProps()} className={`w-full h-40 border-2 ${error_file ? 'bg-red-200 hover:bg-red-300' : 'bg-gray-100 hover:bg-gray-200'}  rounded-lg text-gray-700 border-gray-600 border-dashed flex items-center justify-center text-center`}>
                            <input {...getInputProps()} />
                            {
                                isDragActive ?
                                    <p>Drop the files here ...</p> :
                                    <p>Drag 'n' drop some files here,<br /> or click to select files</p>
                            }
                        </div>
                        <p className="text-sm text-red-800 mb-4">
                            {error_file}
                        </p>
                        {files.length != 0 &&
                            <div className="mb-6">
                                {files.length > 1 &&
                                    <p className="mb-2">Since you have more than one photo, you can <span onClick={() => setMode(!select_photo_mode)} className="text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark font-semibold cursor-pointer">change your display photo</span>.</p>
                                }
                                <label htmlFor="project_photo" className="uppercase text-gray-600 mt-2">Display Photo</label>
                                <File file={files[0]} id={files[0].id} removeFile={removeFile} setPhoto={setPhoto}></File>
                            </div>
                        }
                        <div className="flex flex-col space-y-3">
                            {files.length > 0 &&
                                <>
                                    <label htmlFor="other_photos" className="uppercase text-gray-600 mt-2 text-left -mb-3">Other Photo{files.length > 1 ? "s" : ""}</label>
                                    {files.map((f, id) => {
                                        if (project_photo != "" && f.name != project_photo || id > 0)
                                            return <div className="flex flex-row w-full">
                                                <button onClick={e => setPhoto(e, id)} className={`transition-all duration-500 border-2 text-sciteensLightGreen-regular font-semibold hover:text-sciteensLightGreen-dark border-sciteensLightGreen-regular hover:border-sciteensLightGreen-dark hover:bg-gray-50 rounded-lg ${select_photo_mode ? "px-3 mr-4" : "border-none w-0 overflow-hidden"}`}>Select</button>
                                                <File file={f} id={id} key={f.id} removeFile={removeFile} setPhoto={setPhoto}></File>
                                            </div>
                                    })
                                    }
                                </>
                            }
                        </div>
                        {/* <div className="flex flex-col items-center space-y-2">
                            {
                                files.map((f, id) => {
                                    return (
                                        <File file={f} id={id} key={f.name} removeFile={removeFile} setPhoto={setPhoto}></File>
                                    )
                                })
                            }
                        </div>
                        {
                            project_photo && <label for="project_photo" className="uppercase text-gray-600 mt-2">
                                Project Photo
                            </label>
                        }
                        <div>
                            {
                                files.map((f, id) => {
                                    if (f.name == project_photo) {
                                        return <File file={f} id={id} key={f.name} removeFile={removeFile} setPhoto={setPhoto}></File>
                                    }
                                })
                            }
                        </div> */}
                        <button
                            type="submit"
                            disabled={loading || error_abstract || error_start_date || error_end_date || error_file || error_title}
                            className="bg-sciteensLightGreen-regular text-white text-lg font-semibold rounded-lg p-2 mt-4 w-full hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                            onClick={e => createProject(e)}
                        >
                            Create
                            {
                                loading &&
                                <img
                                    src="/assets/loading.svg"
                                    alt="Loading Spinner"
                                    className="h-5 w-5 ml-2 inline-block"
                                />
                            }
                        </button>

                    </form>
                </div>
            </main>
        </>)
    }

    else if (status == "error") {
        return <Error statusCode={404} ></Error>
    }

    else {
        return <span>loading...</span>
    }
}