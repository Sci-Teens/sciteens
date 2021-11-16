import Link from 'next/link'

export default function GetInvolved() {


    return (
        <div>
            <main>
                <div className="text-left px-4 py-8 md:p-8 w-full lg:w-5/6 mx-auto">
                    <h1 className="text-3xl md:text-5xl text-center font-semibold my-4 mb-10">
                        Want to get Involved?
                    </h1>
                    <div className="grid grid-rows-2 grid-cols-2">

                        <div className="relative bg-white mr-0 md:mr-8 mb-8 p-12 rounded-lg shadow-md overflow-hidden">
                            <h2 className="text-xl md:text-3xl font-semibold mb-3">
                                Students
                            </h2>
                            <p className="text-base mb-4">
                                As a student, getting involved with SciTeens is as simple as signing up! Once registered, you can connect with amazing STEM programs and mentors, as well as share your amazing projects. If you want to start a STEM club at your high school, we're more than willing to sponsor and assist you as well; just reach out to
                                <a href="mailto:opportunities@sciteens.org" target="_blank">
                                    {' '}opportunities@sciteens.org.{' '}
                                </a>
                            </p>
                            <Link
                                href='/signup/student'
                            >
                                <a className="text-center bg-sciteensLightGreen-regular text-white rounded-lg shadow-md p-2 hover:bg-sciteensLightGreen-dark mb-4">
                                    Student Sign Up
                                </a>
                            </Link>
                            <svg className="absolute h-2/3 -top-8 -left-8 transform -rotate-12 opacity-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M3.33 8L10 12l10-6-10-6L0 6h10v2H3.33zM0 8v8l2-2.22V9.2L0 8zm10 12l-5-3-2-1.2v-6l7 4.2 7-4.2v6L10 20z" /></svg>
                        </div>

                        <div className="relative bg-white ml-0 md:ml-8 mb-8 p-12 rounded-lg shadow-md overflow-hidden">
                            <h2 className="text-xl md:text-3xl font-semibold mb-3">
                                Mentors
                            </h2>
                            <p className="text-base mb-4">
                                One of the services that SciTeens provides is mentorship opportunities for students. We are always looking for mentors who are willing to be matched with a student based on topics and fields of interest to assist a student. In order to be a mentor, you must be a professor, teacher, graduate or undergraduate STEM student, or be employed in a STEM field and be willing to devote some time to helping passionate STEM students.
                            </p>
                            <Link
                                href='/signup/educator'
                            >
                                <a className="text-center bg-sciteensLightGreen-regular text-white rounded-lg shadow-md p-2 hover:bg-sciteensLightGreen-dark">
                                    Mentor Sign Up
                                </a>
                            </Link>
                            <svg className="absolute h-2/3 -top-8 -left-8 transform -rotate-12 opacity-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="#4A5568"><path d="M7 8a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0 1c2.15 0 4.2.4 6.1 1.09L12 16h-1.25L10 20H4l-.75-4H2L.9 10.09A17.93 17.93 0 0 1 7 9zm8.31.17c1.32.18 2.59.48 3.8.92L18 16h-1.25L16 20h-3.96l.37-2h1.25l1.65-8.83zM13 0a4 4 0 1 1-1.33 7.76 5.96 5.96 0 0 0 0-7.52C12.1.1 12.53 0 13 0z" /></svg>
                        </div>

                        <div className="relative bg-white mr-0 md:mr-8 mt-8 p-12 rounded-lg shadow-md overflow-hidden">
                            <h2 className="text-xl md:text-3xl font-semibold mb-3 mr-6">
                                Outreach
                            </h2>
                            <p className="text-base mb-4">
                                One of the core principles of science is collaboration. Our mission depends on collaboration, and we are always looking for ways to bring science to every single student! If you know a school, teacher, science program, or organization that could help us achieve our mission, please reach out to us at
                                <a href="mailto:support@sciteens.org" target="_blank">
                                    {' '}opportunities@sciteens.org.{' '}
                                </a>
                            </p>
                            <a href="mailto:support@sciteens.org" target="_blank" className="text-center bg-sciteensLightGreen-regular text-white rounded-lg shadow-md p-2 hover:bg-sciteensLightGreen-dark">
                                Contact Us
                            </a>
                            <svg className="absolute h-2/3 -top-8 -left-8 transform -rotate-12 opacity-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm2-2.25a8 8 0 0 0 4-2.46V9a2 2 0 0 1-2-2V3.07a7.95 7.95 0 0 0-3-1V3a2 2 0 0 1-2 2v1a2 2 0 0 1-2 2v2h3a2 2 0 0 1 2 2v5.75zm-4 0V15a2 2 0 0 1-2-2v-1h-.5A1.5 1.5 0 0 1 4 10.5V8H2.25A8.01 8.01 0 0 0 8 17.75z" /></svg>
                        </div>

                        <div className="relative bg-white ml-0 md:ml-8 mt-8 p-12 rounded-lg shadow-md overflow-hidden">
                            <h2 className="text-xl md:text-3xl font-semibold mb-3">
                                Funding
                            </h2>
                            <p className="text-base mb-4">
                                We are a nonprofit organization that relies on crowdfunding, grants, and private donations. If you know someone who is willing to donate or would like to help us out in finding ways of getting funded, please reach out to us at
                                <a href="mailto:support@sciteens.org" target="_blank">
                                    {' '}opportunities@sciteens.org.{' '}
                                </a>
                                No student should be limited by their income level when it comes to conducting scientific research, so every donation counts.
                            </p>
                            <a
                                href="https://www.paypal.com/donate?hosted_button_id=7B8QACYV83ACA"
                                target="_blank"
                                className="bg-blue-500 text-white rounded-lg shadow-md p-2 mr-2 hover:bg-blue-600"
                            >
                                Donate Now
                            </a>
                            <svg className="absolute h-2/3 -top-8 -left-8 transform -rotate-12 opacity-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm1-5h1a3 3 0 0 0 0-6H7.99a1 1 0 0 1 0-2H14V5h-3V3H9v2H8a3 3 0 1 0 0 6h4a1 1 0 1 1 0 2H6v2h3v2h2v-2z" /></svg>                        </div>
                    </div>
                </div>
            </main >
        </div >

    )
}