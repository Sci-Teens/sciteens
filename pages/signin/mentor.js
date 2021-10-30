import Link from 'next/link'
import { useRouter } from 'next/router';
import Head from 'next/head'

import { signInWithEmailAndPassword } from '@firebase/auth'
import { useContext, useState } from 'react'
import { AppContext } from '../../context/context'
import isEmail from 'validator/lib/isEmail'
import { doc, getDoc } from '@firebase/firestore';
import { useFirestore, useAuth } from 'reactfire';

export default function MentorSignIn() {
    const f_signin_errors = {
        "auth/invalid-email": "Email address or password is invalid (if logging in with Gmail, try using the button below)",
        "auth/user-disabled":
            "The account corresponding to this email has been disabled",
        "auth/user-not-found": "There is no account associated with this email",
        "auth/wrong-password": "Email address or password is invalid (if logging in with Gmail, try using the button below)",
        "Please verify your email before signing in":
            "Please verify your email before signing in",
    }

    const f_signup_errors = {
        "auth/invalid-email": "Email address is invalid",
        "auth/email-already-in-use": "This email is already in use",
        "auth/weak-password": "The password provided is weak",
        "Please verify your email before signing in":
            "Please verify your email before signing in",
    }

    const [error_email, setErrorEmail] = useState('');
    const [error_password, setErrorPassword] = useState('');
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false);
    const firestore = useFirestore()
    const auth = useAuth()
    const router = useRouter()

    const { setProfile } = useContext(AppContext)

    async function emailSignIn(event) {
        event.preventDefault()
        setLoading(true)
        try {
            const res = await signInWithEmailAndPassword(auth, email, password)
            const prof = await getDoc(doc(firestore, 'profiles', res.user.uid))
            setProfile(prof.data())
            router.push(`/profile/${prof.data().slug}`)
        }

        catch (e) {
            console.log(e.code)
            f_signin_errors[e.code] ? setErrorEmail(f_signin_errors[e.code]) : setErrorEmail("Sign in failed. Please try again or create an account.")
            setEmail("")
            setLoading(false)
        }
    }

    const onChange = (e, target) => {
        switch (target) {
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

    return (
        <div

        >
            <Head>
                <title>Mentor Sign In</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main>
                <div className="relative bg-white mx-auto px-4 md:px-12 lg:px-20 py-8 md:py-12 mt-8 mb-24 z-30 text-left w-11/12 md:w-2/3 lg:w-[45%] shadow">
                    <h1 className="text-3xl text-center font-semibold mb-2">
                        Mentor on SciTeens
                    </h1>
                    <p className="text-gray-700 text-center mb-6">
                        Sign in now to empower the next generation of young scientists. Are you a student?&nbsp;
                        <Link href="/signin/student">
                            <a className="font-bold cursor-pointer">
                                Sign in here.
                            </a>
                        </Link>
                    </p>
                    <form onSubmit={emailSignIn}>
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
                        <p className="text-sm text-red-800 mb-2">
                            {error_password}
                        </p>

                        <div className="flex flex-col justify-between my-2">
                            <Link href="/signin/reset">
                                <a className="text-gray-600 text-sm rounded p-2 flex-1 mr-1 mb-2">Forgot password?</a>

                            </Link>

                            <button type="submit"
                                className="bg-sciteensLightGreen-regular text-white text-lg font-semibold rounded-lg p-2 w-full hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                                onClick={emailSignIn}
                                disabled={error_email || error_password || !email.length || !password.length}
                            >
                                Sign In
                            </button >
                        </div >
                    </form>
                    <div className="mt-4 flex justify-center">
                        <p className="text-gray-700">
                            New here?&nbsp;
                            <Link href="/signup/mentor"

                            >
                                <a className="font-bold">Sign up</a>

                            </Link>
                        </p>
                    </div >
                </div>
            </main>

        </div >
    )
}