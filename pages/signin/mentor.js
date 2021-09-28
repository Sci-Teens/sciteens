import { async } from '@firebase/util'
import Head from 'next/head'
import Link from 'next/link'

import { signInWithPopup, GoogleAuthProvider } from '@firebase/auth'
import { auth } from '../../firebaseConfig'

export default function MentorSignUp({ e_email, e_password, signing_in }) {
    return (
        <>
            <Head>
                <title>Mentor Sign-in</title>
            </Head>
            <main>
                <div className="relative mx-auto px-4 mt-8 mb-4 z-30 text-left w-full md:w-96">
                    {/* Auth form */}
                    <div>
                        {/* Top of Auth Component */}
                        <h1 className="text-2xl">
                            Mentor on SciTeens
                        </h1>
                        <p className="text-gray-700 mb-2">
                            Sign in now to empower the next generation of young scientists. Are you
                            a student?&nbsp;
                            <Link href="/signin/student">
                                <a className="cursor-pointer font-bold">Sign in here</a>
                            </Link>
                        </p>
                        <div>
                            <label for="email" className="uppercase text-gray-600">
                                Email
                            </label>
                            <input
                                v-model="email"
                                name="email"
                                required
                                className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${e_email
                                    ? 'border-red-700 text-red-800 placeholder-red-700'
                                    : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`}
                                type="email"
                                placeholder="Enter your account email..."
                                aria-label="email"
                            />
                            <p className="text-sm text-red-800 mb-4">
                                {e_email}
                            </p>

                            <label for="password" className="uppercase text-gray-600">
                                Password
                            </label>
                            <input
                                v-model="password"
                                name="password"
                                required
                                className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${e_password
                                    ? 'border-red-700 text-red-800 placeholder-red-700'
                                    : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`}
                                type="password"
                                placeholder="Enter your password..."
                                aria-label="password"
                            />
                            <p className="text-sm text-red-800 mb-4">
                                {e_password}
                            </p>

                            <div className="flex justify-between items-center my-2">
                                <Link href="/signin/reset">
                                    <a className="text-gray-600 text-sm rounded p-2 flex-1 mr-1">Forgot password?</a>
                                </Link>
                                <button
                                    disabled={signing_in}
                                    className="bg-sciteensLightGreen-regular text-white rounded-lg p-2 hover:bg-sciteensLightGreen-dark shadow outline-none"
                                    onClick={SignIn}
                                >
                                    Sign In
                                </button>
                            </div>
                        </div>
                        <div className="mt-4 flex justify-end">
                            <p className="text-gray-700">
                                New here?&nbsp;
                                <Link href="/signup/mentor">
                                    <a className="font-bold">Sign up</a>
                                </Link>
                            </p>
                        </div>
                    </div >
                </div >
            </main >
        </>
    )
}

export function getStaticProps() {
    return {
        props: {
            e_email: false,
            e_password: false,
            signing_in: false,
        }, // will be passed to the page component as props
    }
}

async function SignIn() {
    const provider = new GoogleAuthProvider()
    try {
        const res = await signInWithPopup(auth, provider)
    } catch (e) {
        console.error(e.message)
    }
    return true;
}