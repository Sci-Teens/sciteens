import { useState, useEffect } from "react"
import { useContext } from "react";
import isNumeric from 'validator/lib/isNumeric'
import isEmail from "validator/lib/isEmail";
import { doc, updateDoc } from '@firebase/firestore';
import { updateProfile } from "@firebase/auth";
import { AppContext } from '../../context/context'
import { useFirestore, useAuth } from 'reactfire';
import { signInWithPopup, GoogleAuthProvider, createUserWithEmailAndPassword, getAdditionalUserInfo, RecaptchaVerifier, sendEmailVerification } from '@firebase/auth'
import { useRouter } from "next/router";
import moment from 'moment';
import Link from "next/link";
import Head from "next/head"

export default function StudentSignUp() {
    const f_signup_errors = {
        "auth/invalid-email": "Email address is invalid",
        "auth/email-already-in-use": "This email is already in use",
        "auth/weak-password": "The password provided is weak",
        "Please verify your email before signing in":
            "Please verify your email before signing in",
    }

    const [first_name, setFirstName] = useState('')
    const [last_name, setLastName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [birthday, setBirthday] = useState('')
    const [ethnicity, setEthnicity] = useState('Cuban')
    const [race, setRace] = useState('American Indian or Alaska Native')
    const [terms, setTerms] = useState(false)
    const [loading, setLoading] = useState(false)
    const [recaptchaSolved, setRecaptchaSolved] = useState(false)

    const [error_name, setErrorName] = useState('')
    const [error_email, setErrorEmail] = useState('')
    const [error_password, setErrorPassword] = useState('')
    const [error_birthday, setErrorBirthday] = useState('')
    const [error_terms, setErrorTerms] = useState('')

    const firestore = useFirestore()
    const auth = useAuth()
    const router = useRouter()
    const { setProfile } = useContext(AppContext)




    useEffect(async () => {
        if (process.browser && !document.getElementById('recaptcha-container').hasChildNodes()) {
            const recaptchaVerifier = new RecaptchaVerifier('recaptcha-container', {
                'size': 'normal',
                'callback': (response) => {
                    setRecaptchaSolved(true)
                },
                'expired-callback': () => {
                    setRecaptchaSolved(false)
                }
            }, auth);
            const recaptchaId = await recaptchaVerifier.render()
            const verified = await recaptchaVerifier.verify()
            if (verified.length) {
                setRecaptchaSolved(true)
            }
        }
    })



    async function onChange(e, target) {
        switch (target) {
            case "first_name":
                setFirstName(e.target.value.trim())

                if (isNumeric(e.target.value.trim()) || e.target.value.trim().length < 1) {
                    setErrorName('Please use a valid name')
                }

                else {
                    setErrorName('')
                }
                break;
            case "last_name":
                setLastName(e.target.value.trim())

                if (isNumeric(e.target.value.trim()) || e.target.value.trim().length < 1) {
                    setErrorName('Please use a valid name')
                }

                else {
                    setErrorName('')
                }
                break;
            case "birthday":
                setBirthday(e.target.value)

                if (moment(e.target.value).isAfter(moment().subtract(13, 'years')) || e.target.value.length < 1) {
                    setErrorBirthday('You must be 13 years old or older to use SciTeens')
                }

                else {
                    setErrorBirthday('')
                }
                break;
            case "email":
                setEmail(e.target.value)
                if (e.target.value == "" || !isEmail(e.target.value)) {
                    setErrorEmail("Please input a valid email");
                }
                else {
                    setErrorEmail("")
                }
                break;
            case "password":
                setPassword(e.target.value)
                if (e.target.value.length < 6) {
                    setErrorPassword("Please input a valid password")
                } else {
                    setErrorPassword("")
                }
                break;
        }
    }

    async function emailSignUp(event) {
        event.preventDefault()
        setLoading(true)
        try {
            const res = await createUserWithEmailAndPassword(auth, email, password)
            const profile = {
                display: first_name + " " + last_name,
                authorized: true, // Only students are authorized upon signup
                slug: unique_slug,
                about: "",
                fields: [],
                programs: [],
                links: [],
                joined: date,
                birthday: moment(birthday).toISOString(),
                institution: "",
                position: "",
                race: race,
                ethnicity: ethnicity,
                subs_p: [],
                subs_e: [],
                mentor: false,
            }
            await setDoc(doc(firestore, 'profiles', res.user.uid), profile)
            await setDoc(doc(firestore, 'emails', res.user.uid), { email: res.user.email })
            await sendEmailVerification(res.user)
            setProfile(profile)
            router.push('/signup/thanks')
        }

        catch (e) {
            console.log(e.code)
            f_signup_errors[e.code] ? setErrorEmail(f_signup_errors[e.code]) : setErrorEmail("Sign in failed. Please try again or create an account.")
            setEmail("")
            setLoading(false)
        }
    }

    async function providerSignIn() {
        const provider = new GoogleAuthProvider()
        try {
            const res = await signInWithPopup(auth, provider)
            const addInfo = await getAdditionalUserInfo(res)
            const prof = await getDoc(doc(firestore, 'profiles', res.user.uid))
            setProfile(prof.data())

            if (addInfo.isNewUser) {
                // Complete profile
                router.push('/signup/finish')
            }
            else {
                router.push(`/profile/${prof.data().slug}`)
            }
        } catch (e) {
            console.error(e)
        }
        return true;
    }

    return (
        <div

        >
            <Head>
                <title>Student Sign Up</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className="relative mx-auto px-4 mt-8 mb-4 z-30 text-left w-full md:w-96">
                <h1 className="text-2xl">
                    Student Sign-up
                </h1>
                <p className="text-gray-700 mb-2">
                    Having an account allows you to share your projects , find events tailored to your interests, and receive mentorship.
                </p>

                <form onSubmit={emailSignUp}>
                    <label for="first-name" className="uppercase text-gray-600">
                        First Name
                    </label>
                    <input
                        onChange={e => onChange(e, 'first_name')}
                        value={first_name}
                        name="first-name"
                        required
                        className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${error_name
                            ? 'border-red-700 text-red-800 placeholder-red-700'
                            : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`}
                        type="text"
                        placeholder="Enter your first name..."
                        aria-label="name"
                        maxLength="50"
                    />
                    <div className="mb-4"></div>

                    <label for="last-name" className="uppercase text-gray-600 mt-4">
                        Last Name
                    </label>
                    <input
                        onChange={e => onChange(e, 'last_name')}
                        value={last_name}
                        name="last-name"
                        required
                        className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${error_name
                            ? 'border-red-700 text-red-800 placeholder-red-700'
                            : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`}

                        type="text"
                        placeholder="Enter your last name..."
                        aria-label="name"
                        maxLength="50"
                    />
                    <p className="text-sm text-red-800 mb-4">
                        {error_name}
                    </p>

                    <label for="email" className="uppercase text-gray-600">
                        Email
                    </label>
                    <input
                        value={email}
                        onChange={e => onChange(e, "email")}
                        name="email"
                        required
                        className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${error_email
                            ? 'border-red-700 text-red-800 placeholder-red-700'
                            : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`}
                        type="email"
                        placeholder="Enter your account email..."
                        aria-label="email"
                    />
                    <p className="text-sm text-red-800 mb-4">
                        {error_email}
                    </p>

                    <label for="password" className="uppercase text-gray-600">
                        Password
                    </label>
                    <input
                        value={password}
                        onChange={e => onChange(e, "password")}
                        name="password"
                        required
                        className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${error_password
                            ? 'border-red-700 text-red-800 placeholder-red-700'
                            : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`}
                        type="password"
                        placeholder="Enter your password..."
                        aria-label="password"
                    />
                    <p className="text-sm text-red-800 mb-4">
                        {error_password}
                    </p>

                    <label for="birthday" className="uppercase text-gray-600">Birthday</label>
                    <input
                        required
                        min={moment().subtract(13, 'years')}
                        onChange={e => onChange(e, 'birthday')}
                        value={birthday} type="date"
                        id="birthday" name="birthday"
                        className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${error_birthday
                            ? 'border-red-700 text-red-800 placeholder-red-700'
                            : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`} />
                    <p
                        className={`text-sm mb-4 ${error_birthday ? 'text-red-800' : 'text-gray-700'}`}
                    >
                        {
                            error_birthday
                                ? error_birthday
                                : "Your date of birth. You must be 13 years of age or older to use SciTeens"
                        }
                    </p>

                    <label for="ethnicity" className="uppercase text-gray-600">Ethnicity</label>
                    <select
                        onChange={e => setEthnicity(e.target.value)}
                        name="ethnicity"
                        id="ethnicity"
                        value={ethnicity}
                        className="mb-4 appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular"
                    >
                        <option selected value="Cuban">Cuban</option>
                        <option value="Mexican">Mexican</option>
                        <option value="Puerto Rican">Puerto Rican</option>
                        <option value="Another Hispanic, Latino, or Spanish origin"
                        >Another Hispanic, Latino, or Spanish origin</option
                        >
                        <option value="Not of Hispanic, Latino, or Spanish origin"
                        >Not of Hispanic, Latino, or Spanish origin</option
                        >
                        <option value="Prefer not to answer">Prefer not to answer</option>
                    </select>

                    <label for="race" className="uppercase text-gray-600">Race</label>
                    <select
                        onChange={e => setRace(e.target.value)}
                        name="race"
                        id="race"
                        value={race}
                        className="mb-4 appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular"
                    >
                        <option selected value="American Indian or Alaska Native"
                        >American Indian or Alaska Native</option
                        >
                        <option
                            value="Asian (including Indian subcontinent and Philippines origin)"
                        >Asian (including Indian subcontinent and Philippines origin)</option
                        >
                        <option value="Black or African American"
                        >Black or African American</option
                        >
                        <option value="White (including Middle Eastern origin)"
                        >White (including Middle Eastern origin)</option
                        >
                        <option value="Native Hawaiian or Other Pacific Islander"
                        >Native Hawaiian or Other Pacific Islander</option
                        >
                        <option value="Prefer not to answer">Prefer not to answer</option>
                    </select>
                    <div id="recaptcha-container" className="flex w-full justify-center">
                    </div>
                    <div className="flex justify-between items-center my-2">
                        <div>
                            <input
                                onChange={() => { setTerms(!terms) }}
                                id="terms"
                                required
                                value={terms}
                                type="checkbox"
                                name="terms"
                                className="form-checkbox active:outline-none text-sciteensLightGreen-regular leading-tight"
                            />
                            <label for="terms" className="text-sm text-gray-600">
                                I accept the terms of service.
                            </label>
                            <p v-if="e_terms" className="text-sm text-red-800">
                                {error_terms}
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={loading || error_name || error_birthday || error_email || error_password || !recaptchaSolved}
                            className="bg-sciteensLightGreen-regular text-white rounded-lg p-2 hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                            onClick={emailSignUp}
                        >
                            Finish
                            {
                                loading &&
                                <img
                                    src="~/assets/loading.svg"
                                    alt="Loading Spinner"
                                    className="h-5 w-5 inline-block"
                                />
                            }

                        </button>
                    </div >
                </form >
                <div className="mb-8 mt-4 w-full h-3 border-b border-gray-300 text-center">
                    <span className="p-2 bg-white">
                        OR
                    </span>
                </div>
                <button
                    className="p-2 shadow bg-white rounded w-full mb-2 hover:shadow-md flex items-center justify-center"
                    onClick={providerSignIn}
                >
                    <img src="/assets/logos/Google.png" alt="Google Logo" className="h-5 w-5 mr-2" />
                    Sign in with Google
                </button >
                <div className="mt-4 flex justify-end">
                    <p className="text-gray-700">
                        Have an account?&nbsp;
                        <Link href="/signin/student"

                        >
                            <a className="font-bold">Sign in</a>
                        </Link>
                    </p>
                </div>
            </main>

        </div >

    )
}