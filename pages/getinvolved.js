import Link from 'next/link'

export default function GetInvolved() {


    return (
        <div>
            <main>
                <div className="text-left px-4 py-8 md:p-8 w-full md:w-168 lg:w-1/2 mx-auto">
                    <h2 className="text-2xl mb-2 mt-8">
                        Want to get Involved?
                    </h2>

                    <h3 className="text-lg">
                        Students
                    </h3>

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

                    <h3 className="text-lg mt-4">
                        Mentoring
                    </h3>

                    <p className="text-base mb-4">
                        One of the services that SciTeens provides is mentorship opportunities for students. We are always looking for mentors who are willing to be matched with a student based on topics and fields of interest to assist a student. In order to be a mentor, you must be a professor, teacher, graduate or undergraduate STEM student, or be employed in a STEM field and be willing to devote some time to helping passionate STEM students.
                    </p>

                    <Link
                        href='/signup/educator'
                    >
                        <a className="text-center bg-sciteensLightGreen-regular text-white rounded-lg shadow-md p-2 hover:bg-sciteensLightGreen-dark mb-4">
                            Mentor Sign Up
                        </a>
                    </Link>

                    <h3 className="text-lg mt-4">
                        Outreach
                    </h3>

                    <p className="text-base mb-4">
                        One of the core principles of science is collaboration. Our mission depends on collaboration, and we are always looking for ways to bring science to every single student! If you know a school, teacher, science program, or organization that could help us achieve our mission, please reach out to us at
                        <a href="mailto:support@sciteens.org" target="_blank">
                            {' '}opportunities@sciteens.org.{' '}
                        </a>
                    </p>

                    <h3 className="text-lg">
                        Funding
                    </h3>

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
                </div>
            </main >
        </div >

    )
}
