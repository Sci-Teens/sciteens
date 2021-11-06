import { useState, useEffect } from "react"
import { useContext } from "react";
import isAlpha from 'validator/lib/isAlpha'
import isEmail from "validator/lib/isEmail";
import { doc, setDoc, updateDoc } from '@firebase/firestore';
import { updateProfile } from "@firebase/auth";
import { AppContext } from '../../context/context'
import { useFirestore, useAuth } from 'reactfire';
import { createUserWithEmailAndPassword, RecaptchaVerifier, sendEmailVerification } from '@firebase/auth'
import { useRouter } from "next/router";
import moment from 'moment';
import Link from 'next/link'
import Head from "next/head"

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
    const [recaptchaSolved, setRecaptchaSolved] = useState(false)

    const [error_name, setErrorName] = useState('')
    const [error_email, setErrorEmail] = useState('')
    const [error_password, setErrorPassword] = useState('')
    const [error_institution, setErrorInstitution] = useState('')
    const [error_terms, setErrorTerms] = useState('')

    const firestore = useFirestore()
    const auth = useAuth()
    const router = useRouter()
    const { setProfile } = useContext(AppContext)

    async function createUniqueSlug(check_slug, num) {
        const slugDoc = doc(firestore, 'profile-slugs', check_slug)
        const slugRef = await getDoc(slugDoc)

        if (slugRef.exists()) {
            if (num == 1) {
                check_slug = check_slug + "-" + 1;
            } else {
                check_slug = check_slug.replace(
                    /[0-9]+(?!.*[0-9])/,
                    function (match) {
                        return parseInt(match, 10) + 1;
                    }
                );
            }

            // check_slug = check_slug + "-" + num;
            num += 1;
            return create_unique_slug(check_slug, num);
        } else {
            return check_slug;
        }
    }

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

                if (!isAlpha(e.target.value.trim()) || e.target.value.trim().length < 1) {
                    setErrorName('Please use a valid name')
                }

                else if (e.target.value.trim().split(" ").length > 1) {
                    setErrorName('Please only enter your first name (or connect it with hyphens)')
                }

                else {
                    setErrorName('')
                }
                break;
            case "last_name":
                setLastName(e.target.value.trim())
                if (!isAlpha(e.target.value.trim()) || e.target.value.trim().length < 1) {
                    setErrorName('Please use a valid name')
                }

                else if (e.target.value.trim().split(" ").length > 1) {
                    setErrorName('Please only enter your last name (or connect it with hyphens)')
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
                const isWhitespace = /^(?=.*\s)/;
                const isContainsSymbol =
                    /^(?=.*[~`!@#$%^&*()--+={}\[\]|\\:;"'<>,.?/_₹])/;
                const isContainsUppercase = /^(?=.*[A-Z])/;
                const isContainsLowercase = /^(?=.*[a-z])/;
                const isContainsNumber = /^(?=.*[0-9])/;
                const isValidLength = /^.{10,16}$/;

                setPassword(e.target.value)
                if (isWhitespace.test(e.target.value)) {
                    setErrorPassword("Password must not contain Whitespaces")
                }


                else if (!isContainsUppercase.test(e.target.value)) {
                    setErrorPassword("Password must have at least one Uppercase Character")
                }

                else if (!isContainsLowercase.test(e.target.value)) {
                    setErrorPassword("Password must have at least one Lowercase Character")
                }

                else if (!isContainsNumber.test(e.target.value)) {
                    setErrorPassword("Password must contain at least one Digit")
                }


                else if (!isContainsSymbol.test(e.target.value)) {
                    setErrorPassword("Password must contain at least one Special Symbol")
                }

                else if (!isValidLength.test(e.target.value)) {
                    setErrorPassword("Password must be 10-16 Characters Long.")
                }

                else {
                    setErrorPassword("")
                }
                break;
            case "institution":
                setInstitution(e.target.value.trim())
                if (!isAlpha(e.target.value.trim()) || e.target.value.trim().length < 1) {
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
            const unique_slug = await createUniqueSlug(first_name.toLowerCase() + "-" + last_name.toLowerCase(), 1)
            const profile = {
                display: first_name + " " + last_name,
                authorized: true, // Only students are authorized upon signup
                slug: unique_slug,
                about: "",
                fields: [],
                programs: [],
                links: [],
                joined: moment().toISOString(),
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
            await setDoc(doc(firestore, 'profile-slugs', unique_slug), { slug: unique_slug })
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

    return (
        <div
        >
            <Head>
                <title>Educator Sign Up | SciTeens</title>
                <link rel="icon" href="/favicon.ico" />
                <meta name="description" content="Mentor sign up for SciTeens" />
                <meta name="keywords" content="SciTeens, sciteens, sign up, teen science" />
            </Head>
            <main>
                <div className="relative bg-white mx-auto px-4 md:px-12 lg:px-20 py-8 md:py-12 mt-8 mb-24 z-30 text-left w-11/12 md:w-2/3 lg:w-[45%] shadow rounded-lg">
                    <h1 className="text-3xl text-center font-semibold mb-2">
                        Educate on SciTeens
                    </h1>
                    <p className="text-gray-700 text-center mb-6">
                        Empower the next generation of STEM leaders from across the globe.
                    </p>

                    <form onSubmit={emailSignUp}>
                        <div className="flex flex-row">
                            <div className="mr-1">

                                <label for="first-name" className="uppercase text-gray-600">
                                    First Name
                                </label>
                                <input
                                    onChange={e => onChange(e, 'first_name')}
                                    value={first_name}
                                    name="first-name"
                                    required
                                    className={`appearance-none border-2 border-transparent bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none ${error_name
                                        ? 'border-red-700 text-red-800 placeholder-red-700'
                                        : 'focus:border-sciteensLightGreen-regular focus:bg-white text-gray-700 placeholder-sciteensGreen-regular'}`}
                                    type="text"
                                    aria-label="name"
                                    maxLength="50"
                                />
                                <div className="mb-4"></div>
                            </div>

                            <div className="ml-1">

                                <label for="last-name" className="uppercase text-gray-600 mt-4">
                                    Last Name
                                </label>
                                <input
                                    onChange={e => onChange(e, 'last_name')}
                                    value={last_name}
                                    name="last-name"
                                    required
                                    className={`appearance-none border-2 border-transparent bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none ${error_name
                                        ? 'border-red-700 text-red-800 placeholder-red-700'
                                        : 'focus:border-sciteensLightGreen-regular focus:bg-white text-gray-700 placeholder-sciteensGreen-regular'}`}

                                    type="text"
                                    aria-label="name"
                                    maxLength="50"
                                />
                                <p className="text-sm text-red-800 mb-4">
                                    {error_name}
                                </p>
                            </div>
                        </div>

                        <label for="email" className="uppercase text-gray-600">
                            Email
                        </label>
                        <input
                            value={email}
                            onChange={e => onChange(e, "email")}
                            name="email"
                            required
                            className={`appearance-none border-2 border-transparent bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none ${error_email
                                ? 'border-red-700 text-red-800 placeholder-red-700'
                                : 'focus:border-sciteensLightGreen-regular focus:bg-white text-gray-700 placeholder-sciteensGreen-regular'}`}
                            type="email"
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
                            className={`appearance-none border-2 border-transparent bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none ${error_password
                                ? 'border-red-700 text-red-800 placeholder-red-700'
                                : 'focus:border-sciteensLightGreen-regular focus:bg-white text-gray-700 placeholder-sciteensGreen-regular'}`}
                            type="password"
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
                            className={`appearance-none border-2 border-transparent bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none ${error_institution
                                ? 'border-red-700 text-red-800 placeholder-red-700'
                                : 'focus:border-sciteensLightGreen-regular focus:bg-white text-gray-700 placeholder-sciteensGreen-regular'}`}

                            type="text"
                            aria-label="name"
                            maxLength="50"
                        />
                        <p className="text-sm text-red-800 mb-4">
                            {error_institution}
                        </p>

                        <label for="position" className="uppercase text-gray-600">I am a(n)</label>
                        <div class="relative w-full">
                            <select
                                name="position"
                                id="position"
                                onChange={(e) => setPosition(e.target.value)}
                                value={position}
                                className="block mb-4 appearance-none border-transparent border-2 bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none focus:bg-white focus:placeholder-gray-700 focus:border-sciteensLightGreen-regular text-gray-700 placeholder-sciteensGreen-regular"
                            >
                                <option selected value="Educator">Educator</option>
                                <option value="Professional">Professional</option>
                                <option value="Researcher">Researcher</option>
                                <option value="Prefer not to answer">Prefer not to answer</option>
                            </select>
                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                        </div>

                        <label for="ethnicity" className="uppercase text-gray-600">Ethnicity</label>
                        <div class="relative w-full">
                            <select
                                onChange={e => setEthnicity(e.target.value)}
                                name="ethnicity"
                                id="ethnicity"
                                value={ethnicity}
                                className="mb-4 appearance-none border-transparent border-2 bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none focus:bg-white focus:placeholder-gray-700 focus:border-sciteensLightGreen-regular text-gray-700 placeholder-sciteensGreen-regular"
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
                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                        </div>

                        <label for="race" className="uppercase text-gray-600">Race</label>
                        <div class="relative w-full">
                            <select
                                onChange={e => setRace(e.target.value)}
                                name="race"
                                id="race"
                                value={race}
                                className="mb-4 appearance-none border-transparent border-2 bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none focus:bg-white focus:placeholder-gray-700 focus:border-sciteensLightGreen-regular text-gray-700 placeholder-sciteensGreen-regular"
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
                            <div class="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg class="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                        </div>
                        <div id="recaptcha-container" className="flex w-full justify-center mb-4">
                        </div>
                        <div>
                            <div className="flex flex-row">
                                <input
                                    onChange={() => { setTerms(!terms) }}
                                    id="terms"
                                    required
                                    value={terms}
                                    type="checkbox"
                                    name="terms"
                                    className="form-checkbox active:outline-none text-sciteensLightGreen-regular leading-tight my-auto mr-2"
                                />
                                <label for="terms" className="text-sm text-gray-600 whitespace-nowrap">
                                    <div className="flex flex-row">
                                        I have read and accept the <Link href='/legal/terms'><a className="text-sciteensLightGreen-regular font-semibold hover:text-sciteensLightGreen-dark"> terms</a></Link> and
                                        <Link href='/legal/privacy'><a className="text-sciteensLightGreen-regular font-semibold hover:text-sciteensLightGreen-dark"> privacy</a></Link>.
                                    </div>
                                </label>
                            </div>
                            <p v-if="e_terms" className="text-sm text-red-800 mb-6">
                                {error_terms}
                            </p>
                        </div>
                        <button
                            type="submit"
                            disabled={loading || error_name || error_institution || error_email || error_password || !recaptchaSolved}
                            className="bg-sciteensLightGreen-regular text-white text-lg font-semibold rounded-lg p-2 w-full hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                            onClick={emailSignUp}
                        >
                            Create Account
                            {
                                loading &&
                                <img
                                    src="~/assets/loading.svg"
                                    alt="Loading Spinner"
                                    className="h-5 w-5 inline-block"
                                />
                            }

                        </button>
                    </form >
                    <div className="mt-4 flex justify-center">
                        <p className="text-gray-700">
                            Have an account?&nbsp;
                            <Link href="/signin/educator"
                                className="font-bold"
                            >
                                <a className="font-bold">Sign in</a>
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
        </div >
    )
}