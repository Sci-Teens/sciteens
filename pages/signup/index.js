import Link from "next/link"
import { useState } from "react"
import Head from "next/head"

export default function SignUpIndex() {
    const [show_mentor_info, setShowMentorInfo] = useState(false)
    const [show_student_info, setShowStudentInfo] = useState(false)


    return (
        <div >
            <Head>
                <title>Sign Up for SciTeens</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <main className="flex flex-col justify-center items-center text-center">
                <h1 className="text-4xl">
                    I am a
                </h1>
                <div className="mx-auto">
                    Have an account?&nbsp;
                    <Link href="/signin/student" >
                        <a className="font-bold">Sign In instead</a>
                    </Link>
                </div>
                <div className="flex flex-wrap mx-auto justify-center">
                    <Link href="/signup/student">
                        <a className="rounded bg-white shadow h-56 w-56 m-6 hover:shadow-md">
                            {show_student_info ?
                                <div className="relative pt-8">
                                    <img
                                        src="/assets/zondicons/close-solid.svg"
                                        alt="Close"
                                        className="h-6 w-6 absolute top-0 right-0 m-2"
                                        onClick={e => {
                                            e.preventDefault();
                                            setShowStudentInfo(!show_student_info)
                                        }}
                                    />
                                    <h2 className="text-xl text-sciteensGreen-regular mx-2">
                                        Sign up as a student if you are currently in high school or
                                        between the ages of 14 and 18.
                                    </h2>
                                </div> : <div className="relative">
                                    <img
                                        src="/assets/zondicons/question.svg"
                                        alt="Question"
                                        className="h-6 w-6 absolute top-0 right-0 m-2"
                                        onClick={e => {
                                            e.preventDefault();
                                            setShowStudentInfo(!show_student_info)
                                        }}
                                    />
                                    <img
                                        src="/assets/student.svg"
                                        alt="Student Icon"
                                        className="h-40 p-4 mx-auto"
                                    />
                                    <h2 className="text-xl text-sciteensGreen-regular">
                                        Student
                                    </h2>
                                </div>}
                        </a>

                    </Link>
                    <Link href="/signup/mentor"

                    >
                        <a className="rounded bg-white shadow h-56 w-56 m-6 hover:shadow-md">
                            {show_mentor_info ?
                                <div className="relative pt-8">
                                    <img
                                        src="/assets/zondicons/close-solid.svg"
                                        alt="Close"
                                        className="h-6 w-6 absolute top-0 right-0 m-2"
                                        onClick={e => {
                                            e.preventDefault();
                                            setShowMentorInfo(!show_mentor_info)
                                        }}
                                    />
                                    <h2 className="text-lg text-sciteensGreen-regular mx-2">
                                        Sign up as a mentor if you are in higher academia or industry, and
                                        want to mentor STEM high school students.
                                    </h2>
                                </div> :
                                <div className="relative">
                                    <img
                                        src="/assets/zondicons/question.svg"
                                        alt="Question"
                                        className="h-6 w-6 absolute top-0 right-0 m-2"
                                        onClick={e => {
                                            e.preventDefault();
                                            setShowMentorInfo(!show_mentor_info)
                                        }}
                                    />
                                    <img
                                        src="/assets/mentor.svg"
                                        alt="Student Icon"
                                        className="h-40 p-4 mx-auto"
                                    />
                                    <h2 className="text-xl text-sciteensGreen-regular">
                                        Mentor
                                    </h2>
                                </div>}
                        </a>

                    </Link>
                </div >
                <div className="mx-auto mb-1/4">
                    <p className="text-gray-700">
                        Neither of the above?&nbsp;
                        <Link href="/getinvolved"

                        >
                            <a className="font-bold">See how you can help</a>

                        </Link>
                    </p>
                </div >
            </main>
        </div >
    )
}