import { async } from "@firebase/util"
import { useState } from "react"

export default function StudentSignUp() {
    const [first_name, setFirstName] = useState('')
    const [last_name, setLastName] = useState('')
    const [birthday, setBirthday] = useState('')
    const [ethnicity, setEthnicity] = useState('Cuban')
    const [race, setRace] = useState('American Indian or Alaska Native')

    const [error_name, setErrorName] = useState('')
    const [error_birthday, setErrorBirthday] = useState('')
    const [error_ethnicity, setErrorEthnicity] = useState('Cuban')
    const [error_race, setErrorRace] = useState('American Indian or Alaska Native')

    async function finishSignUp() {

    }

    async function onChange(e, target) {

    }

    return (
        <div
            className="relative mx-auto px-4 mt-8 mb-4 z-30 text-left w-full md:w-96"
        >
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
                    value={last_name}
                    name="last-name"
                    required
                    className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 ${errpr_name
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

                <label for="birthday" className="uppercase text-gray-600">Birthday</label>
                <p
                    className={`text-sm mb-4 ${error_birthday ? 'text-red-800' : 'text-gray-700'}`}
                >
                    {
                        error_birthday
                            ? error_birthday
                            : "Your date of birth. You must be 13 years of age or older to use SciTeens"
                    }
                </p>

                <label for="ethnicity" className="uppercase text-gray-600">Ethnicity</label>
                <select
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
                            id="terms"
                            v-model="terms"
                            type="checkbox"
                            name="terms"
                            className="form-checkbox active:outline-none text-sciteensLightGreen-regular leading-tight"
                        />
                        <label for="terms" className="text-sm text-gray-600">
                            I accept the terms of service.
                        </label>
                        <p v-if="e_terms" className="text-sm text-red-800">
                            {{ e_terms }}
                        </p>
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="bg-sciteensLightGreen-regular text-white rounded-lg p-2 hover:bg-sciteensLightGreen-dark shadow outline-none"
                        onClick={finishSignUp}
                    >
                        Finish
                        <img
                            v-if="loading"
                            src="~/assets/loading.svg"
                            alt="Loading Spinner"
                            className="h-5 w-5 inline-block"
                        />
                    </button>
                </div >
            </form >
        </div >
    )
}