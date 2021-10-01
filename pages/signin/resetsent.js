import Link from "next/link"

export default function ResetSent() {
    return (
        <div className="h-screen relative mx-auto mt-8 mb-4 z-30 text-center w-full md:w-96 flex flex-col justify-center px-4">
            <img src="/assets/sciteens_logo_main.svg" alt="SciTeens Logo Main" />
            <p className="text-lg text-center mb-4">
                We just sent you a link to reset your password. Be sure to check your spam
                for this email as well.
            </p>
            <Link href="/">
                <a className="bg-sciteensLightGreen-regular text-white rounded-lg p-2 hover:bg-sciteensLightGreen-dark shadow outline-none">
                    Go Home
                </a>
            </Link>
        </div>

    )

}