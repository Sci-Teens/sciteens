import Link from "next/link"
import { useState } from "react"

export default function SignUpIndex() {
    const [show_mentor_info, setShowMentorInfo] = useState(false)
    const [show_student_info, setShowStudentInfo] = useState(false)


    return (
        <div class="flex flex-col justify-center">
            <h1 class="text-4xl">
                I am a
            </h1>
            <div class="mx-auto">
                Have an account?&nbsp;
                <Link href="/signin/student" >
                    <a class="font-bold">Sign In instead</a>
                </Link>
            </div>
            <div class="flex flex-wrap mx-auto justify-center">
                <Link href="/signup/student">
                    <div class="rounded bg-white shadow h-56 w-56 m-6 hover:shadow-md">
                        {show_student_info ?
                            <div v-if="show_student_info" class="relative pt-1/6">
                                <img
                                    src="~assets/zondicons/close-solid.svg"
                                    alt="Close"
                                    class="h-6 w-6 absolute top-0 right-0 m-2"
                                    onClick={e => {
                                        e.preventDefault();
                                        setShowStudentInfo(!show_student_info)
                                    }}
                                />
                                <h2 class="text-xl text-sciteensGreen-regular mx-2">
                                    Sign up as a student if you are currently in high school or
                                    between the ages of 14 and 18.
                                </h2>
                            </div> : <div class="relative">
                                <img
                                    src="~assets/zondicons/question.svg"
                                    alt="Question"
                                    class="h-6 w-6 absolute top-0 right-0 m-2"
                                    onClick={e => {
                                        e.preventDefault();
                                        setShowStudentInfo(!show_student_info)
                                    }}
                                />
                                <img
                                    src="~assets/student.svg"
                                    alt="Student Icon"
                                    class="h-40 p-4 mx-auto"
                                />
                                <h2 class="text-xl text-sciteensGreen-regular">
                                    Student
                                </h2>
                            </div>}
                    </div>

                </Link>
                <Link href="/signup/mentor"

                >
                    <div class="rounded bg-white shadow h-56 w-56 m-6 hover:shadow-md">
                        {show_mentor_info ?
                            <div v-if="show_mentor_info" class="relative pt-1/6">
                                <img
                                    src="~assets/zondicons/close-solid.svg"
                                    alt="Close"
                                    class="h-6 w-6 absolute top-0 right-0 m-2"
                                    onClick={e => {
                                        e.preventDefault();
                                        setShowMentorInfo(!show_mentor_info)
                                    }}
                                />
                                <h2 class="text-lg text-sciteensGreen-regular mx-2">
                                    Sign up as a mentor if you are in higher academia or industry, and
                                    want to mentor STEM high school students.
                                </h2>
                            </div> :
                            <div class="relative">
                                <img
                                    src="~assets/zondicons/question.svg"
                                    alt="Question"
                                    class="h-6 w-6 absolute top-0 right-0 m-2"
                                    onClick={e => {
                                        e.preventDefault();
                                        setShowMentorInfo(!show_mentor_info)
                                    }}
                                />
                                <img
                                    src="~assets/mentor.svg"
                                    alt="Student Icon"
                                    class="h-40 p-4 mx-auto"
                                />
                                <h2 class="text-xl text-sciteensGreen-regular">
                                    Mentor
                                </h2>
                            </div>}
                    </div>

                </Link>
            </div >
            <div class="mx-auto mb-1/4">
                <p class="text-gray-700">
                    Neither of the above?&nbsp;
                    <Link href="/getinvolved"

                    >
                        <a class="font-bold">See how you can help</a>

                    </Link>
                </p>
            </div >
        </div >
    )
}