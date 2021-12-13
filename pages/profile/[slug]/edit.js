import React, { useState, useCallback, useEffect, useContext } from "react"

import Error from 'next/error'
import { useRouter } from "next/router"
import Link from "next/link"
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

import { useSigninCheck, useStorage, useFirestore } from "reactfire"
import { collection, updateDoc, limit, getFirestore, query as firebase_query, where, getDocs, doc, setDoc } from "@firebase/firestore"
import { listAll, ref, getDownloadURL, getMetadata, uploadBytes } from "@firebase/storage";
import { updateProfile as updateFirebaseProfile } from "@firebase/auth";

import { useDropzone } from 'react-dropzone'
import File from "../../../components/File"
import { AppContext } from '../../../context/context'

export default function UpdateProfilePage({ user_profile }) {
    const { t } = useTranslation('common')
    const [loading, setLoading] = useState(false)
    const [about, setAbout] = useState('')
    const [member, setMember] = useState('')
    const [members, setMembers] = useState([])
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
    const [profile_photo, setProfilePhoto] = useState(null)

    const [error_about, setErrorAbout] = useState('')
    const [error_member, setErrorMember] = useState('')
    const [error_file, setErrorFile] = useState('')

    const { status, data: signInCheckResult } = useSigninCheck();
    const storage = useStorage()
    const firestore = useFirestore()

    const router = useRouter()
    const { profile } = useContext(AppContext)

    useEffect(() => {
        if (status == "success" && !signInCheckResult?.signedIn) {
            router.push({
                pathname: '/signin/student',
                query: { ref: `profile|${user_profile.slug}` }
            })
        }

        else if (status == "success" && router.query.slug != profile.slug && signInCheckResult.user.uid != profile.id) {
            router.back()
        }
    })

    useEffect(async () => {
        setFiles([])
        const filesRef = ref(storage, `profiles/${user_profile.id}`);
        setAbout(user_profile.about)

        // Find all the prefixes and items.
        try {
            const res = await listAll(filesRef)
            for (let r of res.items) {
                const url = await getDownloadURL(r)
                const metadata = await getMetadata(r)
                const xhr = new XMLHttpRequest();
                xhr.responseType = 'blob';
                xhr.onload = () => {
                    const blob = xhr.response;
                    if (xhr.status == 200) {
                        blob.name = metadata.name
                        setFiles(oldFiles => [...oldFiles, blob])

                        if (metadata.name.includes('profile_photo')) {
                            setProfilePhoto(metadata.name)
                        }
                    }
                };
                xhr.open('GET', url);
                xhr.send();
            }
        }
        catch (e) {
            router.push(`/profile/${user_profile.id}`)
        }
    }, [])


    const updateProfile = async (e) => {
        e.preventDefault()
        setLoading(true)
        let res;
        try {
            res = await updateDoc(doc(firestore, 'profiles', user_profile.id), {
                about: about.trim(),
                links: [],
            })
        }
        catch (e) {
            console.error(e)
            setErrorAbout(t('edit_profile.couldnt_update_profile'))
        }

        try {
            for (const f of files) {
                const fileRef = ref(storage, f.name == profile_photo ? `profiles/${user_profile.id}/${`profile_photo.${f.type.split('/')[1]}`}` : `profiles/${user_profile.id}/${f.name}`);
                await uploadBytes(fileRef, f)

                // Set user profile photo
                if (f.name == profile_photo) {
                    const photoURL = await getDownloadURL(fileRef)
                    const profile_photo_doc = doc(firestore, 'profile-pictures', user_profile.id)
                    await setDoc(profile_photo_doc, {
                        picture: photoURL
                    })
                    await updateFirebaseProfile(signInCheckResult.user, { photoURL: photoURL })
                }
            }
            router.push(`/profile/${user_profile.slug}`)
            setLoading(false)
        }

        catch (error) {
            setErrorAbout(t('edit_profile.couldnt_update_profile'))
            console.error(error)
            setLoading(false)
        }

    }

    const onDrop = useCallback(fs => {
        for (const f of fs) {
            const reader = new FileReader()

            reader.onabort = () => setErrorFile(t('edit_profile.file_aborted'))
            reader.onerror = () => setErrorFile(t('edit_profile.file_failed'))
            reader.onload = () => setErrorFile('')

            if (!(file_extensions.includes(f.type) || f.name.includes(".docx") || f.name.includes(".pptx"))) {
                setErrorFile(t('edit_profile.format_not_accepted'))

            }

            else if (f.size > 8000000) {
                setErrorFile(t("project_create_edit.file_too_large"))
            }

            else {
                reader.readAsDataURL(f)
                setFiles(oldfiles => [...new Set([...oldfiles, f])])
            }
        }
    })

    const { acceptedFiles, getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop })

    async function onChange(e, target) {
        switch (target) {
            case "about":
                setAbout(e.target.value)
                if (e.target.value.trim() == "") {
                    setErrorAbout(t('fill_out_about'))
                }

                else {
                    setErrorAbout("")
                }
                break;
        }
    }

    const removeFile = (e, id) => {
        e.preventDefault()
        let temp = [...files]
        temp.splice(id, 1)
        setFiles([...temp])
    }

    const setPhoto = (e, file) => {
        e.preventDefault()
        setProfilePhoto(file.name)
    }

    if (status == "success" && signInCheckResult.signedIn) {
        return (<>
            <div className="relative bg-white mx-auto px-4 md:px-12 lg:px-20 py-8 md:py-12 mt-8 mb-24 z-30 text-left w-11/12 md:w-2/3 lg:w-[45%] shadow rounded-lg">
                <h1 className="text-3xl text-center font-semibold mb-2">
                    {t('edit_profile.update_your_profile')}
                </h1>
                <p className="text-gray-700 text-center mb-6">
                    {t('edit_profile.why_update_your_profile')}
                </p>
                <form onSubmit={(e) => updateProfile(e)}>
                    <label for="about" className="uppercase text-gray-600">
                        {t('edit_profile.about')}
                    </label>
                    <textarea
                        onChange={e => onChange(e, 'about')}
                        value={about}
                        name="about"
                        rows="7"
                        required
                        className={`appearance-none border-2 border-transparent bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none ${error_about
                            ? 'border-red-700 text-red-800 placeholder-red-700'
                            : 'focus:border-sciteensLightGreen-regular focus:bg-white text-gray-700'}`}
                        type="textarea"
                        placeholder={t('edit_profile.tell_us_about')}
                        aria-label="about"
                        maxLength="1000"
                    />
                    <p className="text-sm text-red-800 mb-4">
                        {error_about}
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

                    <div className="mb-4"></div>
                    <div {...getRootProps()} className={`w-full h-40 border-2 ${error_file ? 'bg-red-200 hover:bg-red-300' : 'bg-gray-100 hover:bg-gray-200'}  rounded-lg text-gray-700 border-gray-600 border-dashed flex items-center justify-center text-center`}>
                        <input {...getInputProps()} />
                        {
                            isDragActive ?
                                <p>{t('edit_profile.drop_files')}</p> :
                                <p>{t('edit_profile.drag_files')}</p>
                        }
                    </div>
                    <p className="text-sm text-red-800 mb-4">
                        {error_file}
                    </p>
                    <div className="flex flex-col items-center space-y-2">
                        {
                            files.map((f, id) => {
                                return <File file={f} id={id} key={f.name} removeFile={removeFile} setPhoto={setPhoto}></File>
                            })
                        }
                    </div>
                    {
                        profile_photo && <label for="project_photo" className="uppercase text-gray-600 mt-2">
                            {t('edit_profile.profile_photo')}
                        </label>
                    }
                    <div>
                        {
                            files.map((f, id) => {
                                if (f.name == profile_photo) {
                                    return <File file={f} id={id} key={f.name} removeFile={removeFile} setPhoto={setPhoto}></File>
                                }
                            })
                        }
                    </div>

                    <div className="w-full flex justify-end">
                        <button
                            type="submit"
                            disabled={loading || error_about || error_file}
                            className="bg-sciteensLightGreen-regular text-white mr-2 text-lg font-semibold rounded-lg p-2 mt-4 w-full hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                            onClick={e => updateProfile(e)}>
                            {t('edit_profile.update')}
                            {
                                loading &&
                                <img
                                    src="/assets/loading.svg"
                                    alt="Loading Spinner"
                                    className="h-5 w-5 inline-block" />
                            }
                        </button>
                        <Link href={`/profile/${user_profile.slug}`}>
                            <a className="bg-gray-100 text-black ml-2 text-center text-lg font-semibold rounded-lg p-2 mt-4 w-full hover:bg-gray-200 border-2 border-gray-200 hover:border-gray-300 shadow outline-none disabled:opacity-50">
                                {t('edit_profile.cancel')}
                            </a>
                        </Link>
                    </div>
                </form>
            </div>
        </>)
    }

    else if (status == "error") {
        return <Error statusCode={404} ></Error>
    }

    else {
        return <div className="h-screen">Loading...</div>
    }
}

export async function getServerSideProps({ query, locale }) {
    const translations = await serverSideTranslations(locale, ['common'])
    const firestore = getFirestore()
    const profilesRef = collection(firestore, "profiles");
    const profileQuery = firebase_query(profilesRef, where("slug", "==", query.slug), limit(1));
    const profileRes = await getDocs(profileQuery)
    if (!profileRes.empty) {
        let profile;
        profileRes.forEach(p => {
            if (p.exists) {
                profile = {
                    ...p.data(),
                    id: p.id
                }
            }
        })
        return { props: { user_profile: profile, ...translations } }
    }

    else {
        return {
            notFound: true,
        }
    }
}
