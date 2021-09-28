
export default function Footer() {
    return (
        <footer className="w-full bg-gray-100 text-gray-700 py-12">
            <div className="flex flex-row justify-around">
                <div className="w-1/8">
                    <p className="text-black font-semibold mb-2">ORGANIZATION</p>
                    <ul>
                        <li>
                            <a>About</a>
                        </li>
                        <li>
                            <a>FAQ</a>
                        </li>
                        <li>
                            <a>Contact</a>
                        </li>
                        <li>
                            <a>Get Involved</a>
                        </li>
                        <li>
                            <a>Feedback</a>
                        </li>
                    </ul>
                </div>
                <div className="w-1/8">
                    <p className="text-black font-semibold mb-2">LEGAL</p>
                    <ul>
                        <li>
                            <a>Privacy</a>
                        </li>
                        <li>
                            <a>Terms</a>
                        </li>
                        <li>
                            <a>Cookies</a>
                        </li>
                    </ul>
                </div>
                <div className="w-1/8">
                    <p className="text-black font-semibold mb-2">LANGUAGE</p>
                    <ul>
                        <li>
                            <a>English</a>
                        </li>
                        <li>
                            <a>Español</a>
                        </li>
                    </ul>
                </div>
                <div className="w-1/5">
                    <p className="text-black font-semibold mb-2">PARTNERS</p>
                    <div className="grid grid-rows-2 grid-cols-2 gap-6">
                        <img src={'../public/assets/logos/Google.png'} alt="Google" />
                        <p>Yale</p>
                        <p>MIT</p>
                        <p>FSU</p>
                    </div>
                </div>
            </div>
            <div className="mt-8 mx-auto border-t-2 border-gray-300 w-11/12">
                <div className="flex flex-row justify-center my-4">
                    <a href="https://www.facebook.com/SciTeensinfo" target="_blank" rel="noopener noreferrer">
                        <img src="" alt="Facebook" />
                    </a>
                    <a href="https://www.instagram.com/sci.teens/" target="_blank" rel="noopener noreferrer">
                        <img src="" alt="Instagram" />
                    </a>
                    <a href="https://www.linkedin.com/company/sciteens/" target="_blank" rel="noopener noreferrer">
                        <img src="" alt="Linkedin" />
                    </a>
                    <a href="https://www.youtube.com/channel/UCXnyAT9TOrXywV0M6HbhaRA" target="_blank" rel="noopener noreferrer">
                        <img src="" alt="YouTube" />
                    </a>
                </div>
                <p className="text-center">© SciTeens Inc. 2021</p>
            </div>
        </footer>
    )
}