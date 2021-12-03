import { useState, useEffect } from "react"
import { useContext } from "react";
import isAlpha from 'validator/lib/isAlpha'
import isEmail from "validator/lib/isEmail";
import { doc, getDoc, setDoc, updateDoc } from '@firebase/firestore';
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
    const [gender, setGender] = useState('Male')
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
        }
    }

    async function emailSignUp(event) {
        event.preventDefault()
        setLoading(true)
        let res;
        let unique_slug;
        const profile = {
            display: first_name + " " + last_name,
            authorized: true, // Only students are authorized upon signup
            slug: unique_slug,
            about: "",
            fields: [],
            programs: [],
            links: [],
            joined: moment().toISOString(),
            birthday: moment(birthday).toISOString(),
            institution: "",
            position: "",
            race: race,
            gender: gender,
            subs_p: [],
            subs_e: [],
            mentor: false,
        }

        try {
            res = await createUserWithEmailAndPassword(auth, email, password)
        }

        catch (e) {
            f_signup_errors[e.code] ? setErrorEmail(f_signup_errors[e.code]) : setErrorEmail("Couldn't create an accound at this time")
            setEmail("")
        }

        try {
            unique_slug = await createUniqueSlug(first_name.toLowerCase() + "-" + last_name.toLowerCase(), 1)
        }

        catch (e) {
            console.log("Couldn't create unique slug")
        }

        try {
            await setDoc(doc(firestore, 'profiles', res.user.uid), profile)
        }

        catch (e) {
            setErrorEmail("Couldn't create an accound at this time")
        }

        try {
            await setDoc(doc(firestore, 'profile-slugs', unique_slug), { slug: unique_slug })
        }

        catch (e) {
            console.error('couldn\'t set profile slug')
        }

        try {
            await setDoc(doc(firestore, 'emails', res.user.uid), { email: res.user.email })
        }

        catch (e) {

        } console.error("couldn't set user email at this time")

        try {
            await sendEmailVerification(res.user)

        }

        catch (e) {
            console.error("Couldn't send verification email")
        }

        try {
            await updateProfile(res.user, { displayName: first_name + " " + last_name })
            setProfile(profile)
            if (router.query.ref) {
                let ref = router.query.ref.split("|")
                let section = ref[0]
                let id = ref[1]
                if (section == "projects") {
                    section = "project"
                }
                router.push(`/${section}/${id}`)
            } else {
                router.push('/')
            }
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
            if (addInfo.isNewUser) {
                // Complete profile
                router.push(`/signup/finish${res.user.displayName ? `?first_name=${res.user.displayName.split(' ')[0]}&last_name=${res.user.displayName.split(' ')[1]}` : ''}`)
            }

            else {
                const prof = await getDoc(doc(firestore, 'profiles', res.user.uid))
                setProfile(prof.data())
                if (router.query.ref) {
                    let ref = router.query.ref.split("|")
                    let section = ref[0]
                    let id = ref[1]
                    if (section == "projects") {
                        section = "project"
                    }
                    router.push(`/${section}/${id}`)
                } else {
                    router.push('/')
                }
            }
        } catch (e) {
            console.error(e)
        }
        return true;
    }

    return (
        <div>
            <Head>
                <title>Student Sign Up | SciTeens</title>
                <link rel="icon" href="/favicon.ico" />
                <meta name="description" content="Mentor sign up for SciTeens" />
                <meta name="keywords" content="SciTeens, sciteens, sign up, teen science" />
            </Head>
            <main>
                <div className="relative bg-white mx-auto px-4 md:px-12 lg:px-20 py-8 md:py-12 mt-8 mb-24 z-30 text-left w-11/12 md:w-2/3 lg:w-[45%] shadow rounded-lg">
                    <h1 className="text-3xl text-center font-semibold mb-2">
                        Student Sign-up
                    </h1>
                    <p className="text-gray-700 text-center mb-6">
                        Creating an account allows you to share your projects, find events tailored to your interests, and receive mentorship.
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

                        <label for="birthday" className="uppercase text-gray-600">Birthday</label>
                        <input
                            required
                            onChange={e => onChange(e, 'birthday')}
                            value={birthday} type="date"
                            id="birthday" name="birthday"
                            className={`appearance-none border-2 border-transparent bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none ${error_birthday
                                ? 'border-red-700 text-red-800 placeholder-red-700'
                                : 'focus:border-sciteensLightGreen-regular focus:bg-white text-gray-700 placeholder-sciteensGreen-regular'}`} />
                        <p
                            className={`text-sm mb-4 ${error_birthday ? 'text-red-800' : 'text-gray-700'}`}>
                            {
                                error_birthday
                                    ? error_birthday
                                    : "You must be 13 years of age or older to use SciTeens"
                            }
                        </p>

                        <label for="gender" className="uppercase text-gray-600">Gender</label>
                        <div className="relative w-full">
                            <select
                                onChange={e => setGender(e.target.value)}
                                name="gender"
                                id="gender"
                                value={gender}
                                className="mb-4 appearance-none border-2 border-transparent bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none focus:placeholder-gray-700 focus:bg-white focus:border-sciteensLightGreen-regular text-gray-700 placeholder-sciteensGreen-regular"
                            >
                                <option selected value="Male">Male</option>
                                <option value="Female">Female</option>
                                <option value="Other">Other</option>
                                <option value="Prefer not to answer">Prefer not to answer</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                            </div>
                        </div>

                        <label for="race" className="uppercase text-gray-600">Race</label>
                        <div className="relative w-full">
                            <select
                                onChange={e => setRace(e.target.value)}
                                name="race"
                                id="race"
                                value={race}
                                className="mb-4 appearance-none border-2 border-transparent bg-gray-100 w-full mr-3 p-2 leading-tight rounded-lg focus:outline-none focus:placeholder-gray-700 focus:bg-white focus:border-sciteensLightGreen-regular text-gray-700 placeholder-sciteensGreen-regular"
                            >
                                <option selected value="American Indian or Alaska Native">
                                    American Indian or Alaska Native
                                </option>
                                <option
                                    value="Asian (including Indian subcontinent and Philippines origin)"
                                >Asian (including Indian subcontinent and Philippines origin)
                                </option>
                                <option value="Black or African American"
                                >Black or African American
                                </option>
                                <option value="Hispanic or Latino"
                                >Hispanic or Latino
                                </option>
                                <option value="White (including Middle Eastern origin)"
                                >White (including Middle Eastern origin)
                                </option>
                                <option value="Native Hawaiian or Other Pacific Islander"
                                >Native Hawaiian or Other Pacific Islander
                                </option>
                                <option value="Prefer not to answer">Prefer not to answer</option>
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
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
                            disabled={loading || error_name || error_birthday || error_email || error_password || !recaptchaSolved}
                            className="bg-sciteensLightGreen-regular text-white text-lg font-semibold rounded-lg p-2 w-full hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                            onClick={emailSignUp}
                        >
                            Create Account
                            {
                                loading &&
                                <img
                                    src="/assets/loading.svg"
                                    alt="Loading Spinner"
                                    className="h-5 w-5 inline-block"
                                />
                            }

                        </button>
                    </form >
                    <div className="mb-8 mt-4 w-full h-3 border-b border-gray-300 text-center">
                        <span className="p-2 bg-white">
                            OR
                        </span>
                    </div>
                    <button
                        className="p-3 shadow bg-white rounded-lg w-full mb-2 hover:shadow-md flex items-center justify-center"
                        onClick={providerSignIn}
                    >
                        <img src="/assets/logos/Google.png" alt="Google Logo" className="h-5 w-5 mr-2" />
                        Sign in with Google
                    </button >
                    <div className="mt-4 flex justify-center">
                        <p className="text-gray-700">
                            Have an account?&nbsp;
                            <Link href={router.query?.ref ? {
                                pathname: '/signin/student',
                                query: {
                                    ref: (router.query?.ref)
                                }
                            } : '/signin/student'} >
                                <a className="font-bold">Sign in</a>
                            </Link>
                        </p>
                    </div>
                </div>

            </main>
        </div >

    )
}