export default function Footer() {
    return (
        <footer className="w-full bg-gray-100 text-gray-700 py-12">
            <div className="flex flex-col md:flex-row ml-10 md:ml-0 justify-around">
                <div className="w-1/8 mb-8 md:mb-0">
                    <p className="text-black font-semibold mb-1 md:mb-2">ORGANIZATION</p>
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
                <div className="w-1/8 mb-8 md:mb-0">
                    <p className="text-black font-semibold mb-1 md:mb-2">LEGAL</p>
                    <ul>
                        <li>
                            <a href='/legal/privacy'>Privacy</a>
                        </li>
                        <li>
                            <a href='/legal/terms'>Terms</a>
                        </li>
                        <li>
                            <a href='/legal/gdpr'>Cookies</a>
                        </li>
                    </ul>
                </div>
                <div className="w-1/8 mb-8 md:mb-0">
                    <p className="text-black font-semibold mb-1 md:mb-2">LANGUAGE</p>
                    <ul>
                        <li>
                            <a>English</a>
                        </li>
                        <li>
                            <a>Español</a>
                        </li>
                    </ul>
                </div>
                <div className="w-1/2 md:w-1/5">
                    <p className="text-black font-semibold mb-2">PARTNERS</p>
                    <div className="grid grid-rows-2 grid-cols-2 gap-8">
                        <a href="https://www.google.com/nonprofits/" target="_blank" rel="noopener noreferrer">
                            <img className="w-1/2" src={'../assets/logos/Google.png'} alt="Google" />
                        </a>
                        <a href="https://www.bio.fsu.edu/ysp/" target="_blank" rel="noopener noreferrer">
                            <img className="w-1/2" src={'../assets/logos/FSU.png'} alt="FSU" />
                        </a>
                        <a href="https://city.yale.edu/" target="_blank" rel="noopener noreferrer">
                            <img className="w-1/2" src={'../assets/logos/Yale.png'} alt="Yale" />
                        </a>
                        <a href="https://innovation.mit.edu/opportunity/mit-ideas-global-challenge/" target="_blank" rel="noopener noreferrer">
                            <img className="w-1/2" src={'../assets/logos/MIT.png'} alt="MIT" />
                        </a>
                    </div>
                </div>
            </div>
            <div className="mt-8 mx-auto border-t-2 border-gray-300 w-11/12">
                <div className="flex flex-row justify-center mt-6 mb-4">
                    <a href="https://www.facebook.com/SciTeensinfo" target="_blank" rel="noopener noreferrer">
                        <img className="h-6 md:h-8 mr-4" src={'../assets/icons/facebook-flat.svg'} alt="Facebook" />
                    </a>
                    <a href="https://www.instagram.com/sci.teens/" target="_blank" rel="noopener noreferrer">
                        <img className="h-6 md:h-8 mr-4" src={'../assets/icons/instagram.svg'} alt="Instagram" />
                    </a>
                    <a href="https://www.linkedin.com/company/sciteens/" target="_blank" rel="noopener noreferrer">
                        <img className="h-6 md:h-8 mr-4" src={'../assets/icons/linkedin-flat.svg'} alt="Linkedin" />
                    </a>
                    <a href="https://www.youtube.com/channel/UCXnyAT9TOrXywV0M6HbhaRA" target="_blank" rel="noopener noreferrer">
                        <img className="h-6 md:h-8" src={'../assets/icons/youtube.svg'} alt="YouTube" />
                    </a>
                </div>
                <p className="text-center">&copy; SciTeens Inc. {new Date().getFullYear()}</p>
            </div>
        </footer>
    )
}