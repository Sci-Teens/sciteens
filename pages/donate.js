import Link from 'next/link'

export default function Donate() {

    return (
        <div className="w-full">
            <div className="text-left px-4 py-8 md:p-8 w-full lg:w-2/3 mx-auto">
                <h1 className="text-4xl">
                    Annual Donation Appeal
                </h1>
                <div className="w-full flex flex-row mt-4 mb-8">
                    <a
                        href="https://www.paypal.com/donate?hosted_button_id=7B8QACYV83ACA"
                        target="_blank"
                        className="bg-blue-500 text-white rounded-lg shadow-md p-2 mr-2 hover:bg-blue-600"
                    >
                        Donate Now
                    </a>
                    <Link
                        href="/about"
                    >
                        <a className="text-gray-700 p-2 ml-2 hover:underline">
                            Read our Mission
                        </a>
                    </Link>
                </div>
                <p>
                    Dear SciTeens Supporter,
                </p>
                <p className="my-2">
                    At SciTeens, we take great pride in our technological abilities and
                    youth to deliver the best resources to underrepresented high school
                    students across America. This past year, it was a difficult one for all
                    of us but here at SciTeens we were prepared. As teaching across America
                    shifted online, our online platform allowed students to explore their
                    interest in stem via our articles, online curriculums, and guest speaker
                    series.
                </p>
                <p className="my-2">
                    This is why we depend on generous people like you, who see the future
                    and immediate need for more online resources that are accessible to
                    students. Your generosity will allow us to reach out to more students
                    across America that will be able to benefit from our resources for free.
                    SciTeens plans on expanding its curriculums to more low income high
                    schools across America. Today more than ever, it is evident that online
                    education is the future for an equitable STEM education.
                </p>
                <p className="my-2">
                    We kindly ask that you consider SciTeens as an organization that you
                    will donate to so we may continue carrying out our mission and engage
                    more students in the beauty of STEM.
                </p>
                <p className="my-8">
                    Sincerely, <br />
                    <img
                        src="/assets/sutor_signature.png"
                        alt="John Sutor Signature"
                        className="h-12"
                    />
                    John Sutor <br />
                    Co-Founder and Executive Director
                </p>
            </div>
        </div>
    )
}
