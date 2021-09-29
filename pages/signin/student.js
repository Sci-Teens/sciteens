import Link from 'next/link'
import { useRouter } from 'next/router';

import { signInWithPopup, GoogleAuthProvider, signInWithEmailAndPassword, getAdditionalUserInfo } from '@firebase/auth'
import { auth } from '../../firebaseConfig'
import { useContext, useReducer, useState } from 'react'
import { AppContext } from '../../context/context'
import { onChildAdded } from '@firebase/database'
import isEmail from 'validator/lib/isEmail'

export default function StudentSignIn() {
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
    const [loadConfig, setLoading] = useState(false);

    const { user, profile } = useContext(AppContext)

    async function emailSignIn(event) {
        event.preventDefault()
        setLoading(true)
        try {
            const res = await signInWithEmailAndPassword(auth, email, password)
            const router = useRouter()
            router.push(`/profile/${profile.slug}`)
        }

        catch (e) {
            console.log(e.code)
            console.log(f_signin_errors[e.code])
            setErrorEmail(f_signin_errors[e.code])
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
                setPassword(e.target.value)
                if (e.target.value.length < 6) {
                    setErrorPassword("Please input a valid password")
                } else {
                    setErrorPassword("")
                }
                break;
        }
    }

    async function providerSignIn() {
        const provider = new GoogleAuthProvider()
        try {
            const res = await signInWithPopup(auth, provider)
            const addInfo = await getAdditionalUserInfo(res)
            const router = useRouter()

            if (addInfo.isNewUser()) {
                // Complete profile
                router.push('/signup/finish')
            }
            else {
                router.push(`/profile/${profile.slug}`)
            }
        } catch (e) {
            console.error(e)
        }
        return true;
    }

    return (
        <div
            className="relative mx-auto px-4 mt-8 mb-4 z-30 text-left w-full md:w-96"
        >
            <h1 className="text-2xl">
                Student Sign in to Sciteens
            </h1>
            <p className="text-gray-700 mb-2">
                Having an account allows you to share your projects , find events tailored to your interests, and receive mentorship. Are you a mentor?&nbsp;
                <Link href="/signin/mentor">
                    <a className="font-bold cursor-pointer">
                        Sign in
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

                <div className="flex justify-between items-center my-2">
                    <Link href="/signin/reset">
                        <a className="text-gray-600 text-sm rounded p-2 flex-1 mr-1">Forgot password?</a>

                    </Link>

                    <button type="submit"
                        className="bg-sciteensLightGreen-regular text-white rounded-lg p-2 hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                        onClick={emailSignIn}
                        disabled={error_email || error_password || !email.length || !password.length}
                    >
                        Sign In
                    </button >
                </div >
            </form>
            <div className="mb-8 mt-4 w-full h-3 border-b border-gray-300 text-center">
                <span className="p-2 bg-white">
                    OR
                </span>
            </div>
            <button
                className="p-2 shadow bg-white rounded w-full mb-2 hover:shadow-md flex items-center justify-center"
                onClick={providerSignIn}
            >
                <img src="@/assets/g-logo.png" alt="Google Logo" className="h-5 w-5 mr-2" />
                Sign in with Google
            </button >
            <div className="mt-4 flex justify-end">
                <p className="text-gray-700">
                    New here?
                    <Link href="/signup/student"

                    >
                        <a className="font-bold">Sign up</a>

                    </Link>
                </p>
            </div >
        </div >
    )
}