import { useContext, useState } from 'react'

import Link from 'next/link'
import Head from 'next/head';
import { useRouter } from 'next/router';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

import { useFirestore, useAuth } from 'reactfire';
import { doc, getDoc } from '@firebase/firestore';
import { signInWithEmailAndPassword } from '@firebase/auth'

import isEmail from 'validator/lib/isEmail'

import { AppContext } from '../../context/context'
import { validatePassword, providerSignIn } from '../../context/helpers';

export default function StudentSignIn() {
    const { t } = useTranslation('common')
    const f_signin_errors = {
        "auth/invalid-email": t("auth.auth_invalid_email"),
        "auth/user-disabled":
            t("auth.auth_user_disabled"),
        "auth/user-not-found": t("auth.auth_user_not_found"),
        "auth/wrong-password": t("auth.auth_wrong_password"),
        "Please verify your email before signing in":
            t("auth.please_verify"),
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
            f_signin_errors[e.code] ? setErrorEmail(f_signin_errors[e.code]) : setErrorEmail(t("auth.sign_in_failed"))
            setEmail("")
            setLoading(false)
        }
    }

    const onChange = (e, target) => {
        switch (target) {
            case "email":
                setEmail(e.target.value)
                if (e.target.value == "" || !isEmail(e.target.value)) {
                    setErrorEmail(t("auth.valid_email"));
                }
                else {
                    setErrorEmail("")
                }
                break;
            case "password":
                setPassword(e.target.value)
                setErrorPassword(validatePassword(e.target.value, t))
                break;
        }
    }

    return (
        <div>
            <Head>
                <title>Student Sign In | SciTeens</title>
                <link rel="icon" href="/favicon.ico" />
                <meta name="description" content="Student Sign In to SciTeens" />
                <meta name="keywords" content="SciTeens, sciteens, student sign in, teen science" />
            </Head>
            <main>
                <div className="relative bg-white mx-auto px-4 md:px-12 lg:px-20 py-8 md:py-12 mt-8 mb-24 z-30 text-left w-11/12 md:w-2/3 lg:w-[45%] shadow rounded-lg">
                    <h1 className="text-3xl text-center font-semibold mb-2">
                        {t('auth.student_sign_in')}
                    </h1>
                    <p className="text-gray-700 text-center mb-6">
                        {t('auth.why_student_sign_in')}&nbsp;
                        <Link href={router.query?.ref ? {
                            pathname: '/signin/educator',
                            query: {
                                ref: (router.query?.ref)
                            }
                        } : '/signin/educator'} >
                            <a className="font-bold cursor-pointer">
                                {t('auth.sign_in_here')}
                            </a>
                        </Link>
                    </p>
                    <form onSubmit={emailSignIn}>
                        <label for="email" className="uppercase text-gray-600">
                            {t('auth.email')}
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
                            {t('auth.password')}
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
                                <a className="text-gray-600 text-sm rounded py-2 flex-1 mr-1 mb-2">{t("auth.reset_password")}</a>

                            </Link>

                            <button type="submit"
                                className="bg-sciteensLightGreen-regular text-white text-lg font-semibold rounded-lg p-2 w-full hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                                onClick={emailSignIn}
                                disabled={error_email || error_password || !email.length || !password.length}
                            >
                                {t('auth.sign_in')}
                            </button >
                        </div >
                    </form>
                    <div className="mb-8 mt-4 w-full h-3 border-b border-gray-300 text-center">
                        <span className="p-2 bg-white">
                            {t('auth.or')}
                        </span>
                    </div>
                    <button
                        className="p-2 shadow bg-white rounded w-full mb-2 hover:shadow-md flex items-center justify-center"
                        onClick={() => providerSignIn(auth, firestore, router, setProfile)}
                    >
                        <img src="/assets/logos/Google.png" alt="Google Logo" className="h-5 w-5 mr-2" />
                        {t('auth.google_sign_in')}
                    </button >
                    <div className="mt-4 flex justify-center">
                        <p className="text-gray-700">
                            {t('auth.new_here')}&nbsp;
                            <Link href={router.query?.ref ? {
                                pathname: '/signup/student',
                                query: {
                                    ref: (router.query?.ref)
                                }
                            } : '/signup/student'}
                            >
                                <a className="font-bold">{t('auth.sign_up')}</a>
                            </Link>
                        </p>
                    </div >
                </div>
            </main>
        </div >
    )
}

export async function getStaticProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common'])),
        },
    };
}