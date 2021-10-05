
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
                <title>Reset Password</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className="h-screen flex items-center px-4 mx-auto mb-4 z-30 text-left w-full md:w-96">
                <form onSubmit={submitForgotPassword}>
                    <h1 className="text-2xl">
                        Forgot Password
                    </h1>
                    <p className="text-gray-700 mb-4">
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
                        className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${error_email
                            ? 'border-red-700 text-red-800 placeholder-red-700'
                            : 'focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular'}`}
                        type="email"
                        placeholder="example@email.com"
                        aria-label="email"
                    />
                    <p className="text-sm text-red-800 mb-4">
                        {error_email}
                    </p>
                    <div className="flex content-end justify-end mt-2 mb-10">
                        <button
                            type="submit"
                            className="bg-sciteensLightGreen-regular text-white rounded-lg p-2 hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                            onClick={submitForgotPassword}
                            disabled={error_email}
                        >
                            Reset Password
                        </button>
                    </div>
                </form>
            </main>
        </div >)
}