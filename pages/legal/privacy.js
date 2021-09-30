import Head from 'next/head'

export default function privacy() {
    return (
        <div className="h-full">
            <Head>
                <title>Policies, Terms, GDPR | SciTeens</title>
            </Head>

            <main className="h-full">
                <div className="h-full flex flex-row justify-around py-8">
                    <div className="w-1/4 h-full bg-red-50">
                        <h2 className="sticky top-0 text-2xl">Table of Contents</h2>
                    </div>
                    <div className="w-2/3">
                        <h1 className="text-3xl">PRIVACY POLICY</h1>
                        <p className="text-gray-700 mt-4 mb-8 whitespace-pre-line">Last Updated 9/29/2021</p>
                        <p className="text-gray-700 mb-12">Thank you for choosing to be part of our community at SciTeens Inc., doing business as
                            SciTeens (“SciTeens”, “we”, “us”, or “our”). We are committed to protecting your personal
                            information and your right to privacy. If you have any questions or concerns about our
                            policy, or our practices with regards to your personal information, please contact us at
                            support@sciteens.org. When you visit our website https://sciteens.org, and use our services,
                            you trust us with your personal information. We take your privacy very seriously. In this
                            privacy policy, we seek to explain to you in the clearest way possible what information we
                            collect, how we use it and what rights you have in relation to it. We hope you take some
                            time to read through it carefully, as it is important. If there are any terms in this
                            privacy policy that you do not agree with, please discontinue use of our Sites and our services.
                            This privacy policy applies to all information collected through our website
                            (such as https://sciteens.org), and/or any related services, sales, marketing or events
                            (we refer to them collectively in this privacy policy as the "Services"). Please read this
                            privacy policy carefully as it will help you make informed decisions about sharing your
                            personal information with us.
                        </p>
                        <h2 id="privacy1" className="text-2xl mb-2">WHAT INFORMATION DO WE COLLECT?</h2>
                        <p className="text-lg mb-2">Personal information you disclose to us.</p>
                        <p className="text-gray-700 mb-4">In Short: We collect personal information that you provide to
                            us. We collect personal information that you voluntarily provide to us when registering at the
                            Services expressing an interest in obtaining information about us or our products and services,
                            when participating in activities on the Services (such as posting messages in our online forums or
                            entering competitions, contests or giveaways) or otherwise contacting us. The personal information
                            that we collect depends on the context of your interactions with us and the Services, the choices
                            you make and the products and features you use. The personal information we collect can include the
                            following:
                            <br />
                            <b>Publicly Available Personal Information.</b>
                            <br />
                            We collect first name, maiden name, last name, and nickname; email addresses; and other similar data.
                            <br />
                            <b>Personal Information Provided by You.</b>
                            <br />
                            We collect passwords; and other similar data.
                            <br />
                            <b>Social Media Login Data.</b>
                            <br />
                            We may provide you with the option to register using social media account details, like your
                            Facebook, Twitter or other social media account. If you choose to register in this way, we will
                            collect the information described in the section called "HOW DO WE HANDLE YOUR SOCIAL LOGINS" below.
                            All personal information that you provide to us must be true, complete and accurate, and you must
                            notify us of any changes to such personal information.
                        </p>
                    </div>
                </div>
            </main>
        </div>
    )
}