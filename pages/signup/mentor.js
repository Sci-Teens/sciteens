import { useState } from "react"
import { useContext } from "react";
import isNumeric from 'validator/lib/isNumeric'
import isEmail from "validator/lib/isEmail";
import { doc, updateDoc } from '@firebase/firestore';
import { updateProfile } from "@firebase/auth";
import { AppContext } from '../../context/context'
import { useFirestore, useAuth } from 'reactfire';
import { createUserWithEmailAndPassword } from '@firebase/auth'
import { useRouter } from "next/router";
import moment from 'moment';
import Link from 'next/link'

export default function MentorSignUp() {
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
    const [institution, setInstitution] = useState('')
    const [position, setPosition] = useState('')
    const [ethnicity, setEthnicity] = useState('Cuban')
    const [race, setRace] = useState('American Indian or Alaska Native')
    const [terms, setTerms] = useState(false)
    const [loading, setLoading] = useState(false)

    const [error_name, setErrorName] = useState('')
    const [error_email, setErrorEmail] = useState('')
    const [error_password, setErrorPassword] = useState('')
    const [error_institution, setErrorInstitution] = useState('')
    const [error_terms, setErrorTerms] = useState('')

    const firestore = useFirestore()
    const auth = useAuth()
    const router = useRouter()
    const { setProfile } = useContext(AppContext)

    async function finishSignUp() {
        if (!terms) {
            setErrorTerms('You must accept the terms and conditions')
        }

        else {
            try {
                setLoading(true)
                await updateDoc(doc(firestore, 'profiles', user.uid), {
                    display: first_name + " " + last_name,
                    birthday: moment(birthday).toISOString(),
                    race: race,
                    ethnicity: ethnicity,
                })
                await updateProfile(user, { displayName: first_name + " " + last_name })
                router.push('/dashboard')
            }

            catch {
                setLoading(false)
                setErrorName('We were unable to complete your profile at this time')
            }
        }
    }

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
            case "institution":
                setInstitution(e.target.value.trim())
                if (isNumeric(e.target.value.trim()) || e.target.value.trim().length < 1) {
                    setErrorInstitution('Please provide a valid institution')
                }

                else {
                    setErrorInstitution('')
                }
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
                birthday: "",
                institution: institution,
                position: position,
                race: race,
                ethnicity: ethnicity,
                subs_p: [],
                subs_e: [],
                mentor: true,
            }
            await setDoc(doc(firestore, 'profiles', res.user.uid), profile)
            setProfile(profile)
            router.push(`/profile/${profile.slug}`)
        }

        catch (e) {
            console.log(e.code)
            f_signup_errors[e.code] ? setErrorEmail(f_signup_errors[e.code]) : setErrorEmail("Sign in failed. Please try again or create an account.")
            setEmail("")
            setLoading(false)
        }
    }

    return (
        <div
            className="relative mx-auto px-4 mt-8 mb-4 z-30 text-left w-full md:w-96"
        >
            <h1 className="text-2xl">
                Mentor on SciTeens
            </h1>
            <p className="text-gray-700 mb-2">
                Empower the next generation of STEM leaders from across the globe.
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
                    maxlength="50"
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
                    maxlength="50"
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

                <label for="institution" className="uppercase text-gray-600 mt-4">
                    Institution
                </label>
                <input
                    onChange={e => onChange(e, 'institution')}
                    value={institution}
                    name="institution"
                    required
                    className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${error_institution
                        ? 'border-red-700 text-red-800 placeholder-red-700'
                        : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`}

                    type="text"
                    placeholder="Enter your place of work..."
                    aria-label="name"
                    maxlength="50"
                />
                <p className="text-sm text-red-800 mb-4">
                    {error_institution}
                </p>

                <label for="position" class="uppercase text-gray-600">I am a(n)</label>
                <select
                    name="position"
                    id="position"
                    onChange={(e) => setPosition(e.target.value)}
                    value={position}
                    class="mb-4 appearance-none border-transparent border-2 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 focus:border-sciteensGreen-regular bg-green-200 text-gray-700 placeholder-sciteensGreen-regular"
                >
                    <option selected value="Educator">Educator</option>
                    <option value="Professional">Professional</option>
                    <option value="Researcher">Researcher</option>
                    <option value="Prefer not to answer">Prefer not to answer</option>
                </select>

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
                        disabled={loading || error_name || error_institution || error_email || error_password}
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
            <div class="mt-4 flex justify-end">
                <p class="text-gray-700">
                    Have an account?&nbsp;
                    <Link href="/signin/mentor"
                        class="font-bold"
                    >
                        <a class="font-bold">Sign in</a>
                    </Link>
                </p>
            </div>
        </div >
    )
}