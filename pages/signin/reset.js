
import { useState } from "react"
import { useAuth } from "reactfire"
import { useRouter } from "next/router"
import { sendPasswordResetEmail } from "@firebase/auth"
import isEmail from "validator/lib/isEmail"
import Head from "next/head"

export default function Reset() {

    const [email, setEmail] = useState('')
    const [error_email, setErrorEmail] = useState('')
    const auth = useAuth()
    const router = useRouter()

    async function submitForgotPassword(e) {
        event.preventDefault()
        try {
            await sendPasswordResetEmail(auth, email)
            router.push('/signin/resetsent')
        }
        catch (e) {
            setErrorEmail(e)
            setEmail('')
        }
    }

    const onChange = (e) => {
        setEmail(e.target.value)
        if (e.target.value == "" || !isEmail(e.target.value)) {
            setErrorEmail("Please input a valid email");
        }
        else {
            setErrorEmail("")
        }
    }
    return (
        <div

        >
            <Head>
                <title>Reset Password | SciTeens</title>
                <link rel="icon" href="/favicon.ico" />
                <meta name="description" content="Reset password on SciTeens" />
                <meta name="keywords" content="SciTeens, sciteens, reset password, teen science" />
            </Head>
            <main className="h-screen flex items-center justify-center">
                <div className="relative bg-white mx-auto px-4 md:px-12 lg:px-20 py-8 md:py-12 mt-8 mb-24 z-30 text-left w-11/12 md:w-2/3 lg:w-[45%] shadow rounded-lg">
                    <form onSubmit={submitForgotPassword}>
                        <h1 className="text-3xl text-center font-semibold mb-2">
                            Reset Password
                        </h1>
                        <p className="text-gray-700 text-center mb-6">
                            Forgot your password? No worries! Submit your email below, and we’ll send you a reset link.
                        </p>
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
                        <p className="text-sm text-red-800 mb-6">
                            {error_email}
                        </p>
                        <div className="flex content-end justify-end mt-2 mb-10">
                            <button
                                type="submit"
                                className="bg-sciteensLightGreen-regular text-white text-lg font-semibold rounded-lg p-2 w-full hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                                onClick={submitForgotPassword}
                                disabled={error_email}
                            >
                                Reset Password
                            </button>
                        </div>
                    </form>
                </div>
            </main>
        </div >)
}