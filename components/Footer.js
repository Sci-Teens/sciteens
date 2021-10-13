export default function Footer() {
    return (
        <footer>
            <img src={'./assets/svgs/footer.svg'} alt="" />
            <div className="px-10 md:px-24 bg-sciteensGreen-regular text-gray-100 pt-4 pb-8">
                <div className="flex flex-col md:flex-row mr-0 lg:mr-12 justify-between">
                    <div className="w-1/8 mb-8 md:mb-0">
                        <p className="text-white font-semibold mb-1 md:mb-2">ORGANIZATION</p>
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
                        <p className="text-white font-semibold mb-1 md:mb-2">LEGAL</p>
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
                        <p className="text-white font-semibold mb-1 md:mb-2">LANGUAGE</p>
                        <ul>
                            <li>
                                <a>English</a>
                            </li>
                            <li>
                                <a>Español</a>
                            </li>
                        </ul>
                    </div>
                    <div className="w-1/8 mb-8 md:mb-0">
                        <p className="text-white font-semibold mb-2">FOLLOW US</p>
                        <div className="flex flex-row">
                            <a href="https://www.facebook.com/SciTeensinfo" target="_blank" rel="noopener noreferrer">
                                <img className="h-6 mr-4" src={'../assets/icons/facebook-flat.svg'} alt="Facebook" />
                            </a>
                            <a href="https://www.instagram.com/sci.teens/" target="_blank" rel="noopener noreferrer">
                                <img className="h-6 mr-4" src={'../assets/icons/instagram.svg'} alt="Instagram" />
                            </a>
                            <a href="https://www.linkedin.com/company/sciteens/" target="_blank" rel="noopener noreferrer">
                                <img className="h-6 mr-4" src={'../assets/icons/linkedin-flat.svg'} alt="LinkedIn" />
                            </a>
                            <a href="https://www.youtube.com/channel/UCXnyAT9TOrXywV0M6HbhaRA" target="_blank" rel="noopener noreferrer">
                                <img className="h-6" src={'../assets/icons/youtube.svg'} alt="YouTube" />
                            </a>
                        </div>
                    </div>
                </div>
                <div className="mt-8 mx-auto border-t-2 border-gray-100">
                    <p className="text-left mt-4">&copy; SciTeens Inc. {new Date().getFullYear()}</p>
                </div>
            </div>
        </footer >
    )
}