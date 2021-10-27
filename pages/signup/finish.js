import { useState, useContext, useEffect } from "react"
import isAlpha from 'validator/lib/isAlpha'
import { doc, updateDoc, setDoc, getDoc } from '@firebase/firestore';
import { updateProfile } from "@firebase/auth";
import { useFirestore, useUser } from 'reactfire';
import { useRouter } from "next/router";
import moment from 'moment';
import Head from "next/head";
import { AppContext } from '../../context/context'

export default function FinishSignUp() {
    const [first_name, setFirstName] = useState('')
    const [last_name, setLastName] = useState('')
    const [birthday, setBirthday] = useState('')
    const [gender, setGender] = useState('Male')
    const [race, setRace] = useState('American Indian or Alaska Native')
    const [terms, setTerms] = useState(false)
    const [loading, setLoading] = useState(false)

    const [error_name, setErrorName] = useState('')
    const [error_birthday, setErrorBirthday] = useState('')
    const [error_terms, setErrorTerms] = useState('')

    const firestore = useFirestore()
    const { data: user } = useUser();
    const router = useRouter()

    const { setProfile } = useContext(AppContext)

    useEffect(() => {
        if (router.isReady) {
            setFirstName(router?.query?.first_name ? router.query.first_name : '')
            setLastName(router?.query?.last_name ? router.query.last_name : '')
        }
    }, [router])

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

    async function finishSignUp() {
        if (!terms) {
            setErrorTerms('You must accept the terms and conditions')
        }

        else {
            try {
                setLoading(true)
                const unique_slug = await createUniqueSlug(first_name.toLowerCase() + "-" + last_name.toLowerCase(), 1)
                const profile = {
                    display: first_name + " " + last_name,
                    authorized: true, // Only students are authorized upon signup
                    slug: unique_slug,
                    about: "",
                    fields: [],
                    programs: [],
                    links: [],
                    joined: moment.toISOString(),
                    birthday: moment(birthday).toISOString(),
                    institution: "",
                    position: "",
                    race: race,
                    gender: gender,
                    subs_p: [],
                    subs_e: [],
                    mentor: false,
                }
                await setDoc(doc(firestore, 'profiles', user.uid), profile)
                await setDoc(doc(firestore, 'profile-slugs', unique_slug), { slug: unique_slug })
                await setDoc(doc(firestore, 'emails', user.uid), { email: user.email })
                await sendEmailVerification(user)
                await updateProfile(user, { displayName: first_name + " " + last_name })
                setProfile(profile)
                router.push('/signup/thanks')
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
            case "birthday":
                setBirthday(e.target.value)

                console.log(e.target.value)
                if (moment(e.target.value).isAfter(moment().subtract(13, 'years')) || e.target.value.length < 1) {
                    setErrorBirthday('You must be 13 years old or older to use SciTeens')
                }

                else {
                    setErrorBirthday('')
                }
                break;
        }


    }

    return (
        <div>
            <Head>
                <title>Finish Sign Up</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className="relative mx-auto px-4 mt-8 mb-4 z-30 text-left w-full md:w-96">
                <h1 className="text-2xl">
                    Just a few more things.
                </h1>
                <p className="text-gray-700 mb-2">
                    Before you can get started on SciTeens, please fill out a few more things
                    about yourself.
                </p>

                <form onSubmit={finishSignUp}>
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

                    <label for="birthday" className="uppercase text-gray-600">Birthday</label>
                    <input
                        required
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

                    <label for="gender" className="uppercase text-gray-600">Gender</label>
                    <select
                        onChange={e => setGender(e.target.value)}
                        name="gender"
                        id="gender"
                        value={gender}
                        className="mb-4 appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular"
                    >
                        <option selected value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
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
                            disabled={loading || error_name || error_birthday}
                            className="bg-sciteensLightGreen-regular text-white rounded-lg p-2 hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                            onClick={finishSignUp}
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
            </main>
        </div >
    )
}