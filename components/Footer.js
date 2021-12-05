import Link from "next/link"
import { useRouter } from "next/router"

export default function Footer() {
    const router = useRouter()
    return (
        <footer>
            <svg viewBox="0 0 900 40" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" version="1.1">
                <rect x="0" y="0" width="100%" height="100%" fill="#F5FFF5" />
                <path d="M0 10L13.7 11.5C27.3 13 54.7 16 82 16C109.3 16 136.7 13 163.8 10.7C191 8.3 218 6.7 245.2 8C272.3 9.3 299.7 13.7 327 14.3C354.3 15 381.7 12 409 10.7C436.3 9.3 463.7 9.7 491 11.7C518.3 13.7 545.7 17.3 573 17.3C600.3 17.3 627.7 13.7 654.8 13.5C682 13.3 709 16.7 736.2 16C763.3 15.3 790.7 10.7 818 8.2C845.3 5.7 872.7 5.3 886.3 5.2L900 5L900 41L886.3 41C872.7 41 845.3 41 818 41C790.7 41 763.3 41 736.2 41C709 41 682 41 654.8 41C627.7 41 600.3 41 573 41C545.7 41 518.3 41 491 41C463.7 41 436.3 41 409 41C381.7 41 354.3 41 327 41C299.7 41 272.3 41 245.2 41C218 41 191 41 163.8 41C136.7 41 109.3 41 82 41C54.7 41 27.3 41 13.7 41L0 41Z" fill="#58b386" />
                <path d="M0 17L13.7 16.7C27.3 16.3 54.7 15.7 82 16.8C109.3 18 136.7 21 163.8 21.2C191 21.3 218 18.7 245.2 18.7C272.3 18.7 299.7 21.3 327 22.2C354.3 23 381.7 22 409 20.8C436.3 19.7 463.7 18.3 491 17.5C518.3 16.7 545.7 16.3 573 17.5C600.3 18.7 627.7 21.3 654.8 22.3C682 23.3 709 22.7 736.2 22.5C763.3 22.3 790.7 22.7 818 22.3C845.3 22 872.7 21 886.3 20.5L900 20L900 41L886.3 41C872.7 41 845.3 41 818 41C790.7 41 763.3 41 736.2 41C709 41 682 41 654.8 41C627.7 41 600.3 41 573 41C545.7 41 518.3 41 491 41C463.7 41 436.3 41 409 41C381.7 41 354.3 41 327 41C299.7 41 272.3 41 245.2 41C218 41 191 41 163.8 41C136.7 41 109.3 41 82 41C54.7 41 27.3 41 13.7 41L0 41Z" fill="#439e70" />
                <path d="M0 30L13.7 29.3C27.3 28.7 54.7 27.3 82 27.3C109.3 27.3 136.7 28.7 163.8 28.7C191 28.7 218 27.3 245.2 26.7C272.3 26 299.7 26 327 25.7C354.3 25.3 381.7 24.7 409 25.3C436.3 26 463.7 28 491 27.8C518.3 27.7 545.7 25.3 573 25.5C600.3 25.7 627.7 28.3 654.8 28.5C682 28.7 709 26.3 736.2 25.5C763.3 24.7 790.7 25.3 818 26.5C845.3 27.7 872.7 29.3 886.3 30.2L900 31L900 41L886.3 41C872.7 41 845.3 41 818 41C790.7 41 763.3 41 736.2 41C709 41 682 41 654.8 41C627.7 41 600.3 41 573 41C545.7 41 518.3 41 491 41C463.7 41 436.3 41 409 41C381.7 41 354.3 41 327 41C299.7 41 272.3 41 245.2 41C218 41 191 41 163.8 41C136.7 41 109.3 41 82 41C54.7 41 27.3 41 13.7 41L0 41Z" fill="#2d8a5b" />
            </svg>
            <div className="px-10 md:px-24 bg-sciteensGreen-regular text-gray-100 pt-4 pb-8">
                <div className="flex flex-col md:flex-row mr-0 lg:mr-12 justify-between">
                    <div className="w-1/8 mb-8 md:mb-0">
                        <p className="text-white font-semibold mb-1 md:mb-2">ORGANIZATION</p>
                        <ul>
                            <li>
                                <Link href='/about'>
                                    <a>
                                        About
                                    </a>
                                </Link>
                            </li>
                            <li>
                                <Link href='/faq'>
                                    <a>
                                        FAQ
                                    </a>
                                </Link>
                            </li>
                            <li>
                                <a href="mailto:info@sciteens.org" target="_blank">
                                    Contact
                                </a>
                            </li>
                            <li>
                                <Link href='/getinvolved'>
                                    <a>
                                        Get Involved
                                    </a>
                                </Link>
                            </li>
                            <li>
                                <a href="https://docs.google.com/forms/d/e/1FAIpQLScbDPaXgLflGrV3NSXpOTSFYoU2dIcEFy-xT2Kz9-6dMUYotQ/viewform?usp=sf_link" target="_blank">
                                    Feedback
                                </a>
                            </li>
                        </ul>
                    </div>
                    <div className="w-1/8 mb-8 md:mb-0">
                        <p className="text-white font-semibold mb-1 md:mb-2">LEGAL</p>
                        <ul>
                            <li>
                                <Link href='/legal/privacy'>
                                    <a>
                                        Privacy
                                    </a>
                                </Link>
                            </li>
                            <li>
                                <Link href='/legal/terms'>
                                    <a>
                                        Terms
                                    </a>
                                </Link>
                            </li>
                            <li>
                                <Link href='/legal/gdpr'>
                                    <a>
                                        Cookies
                                    </a>
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div className="w-1/8 mb-8 md:mb-0">
                        <p className="text-white font-semibold mb-1 md:mb-2">LANGUAGE</p>
                        <ul>
                            <li>
                                <Link href={router.pathname} locale="en">
                                    <a>English</a>
                                </Link>
                            </li>
                            <li>
                                <Link href={router.pathname} locale="es">
                                    <a>Español</a>
                                </Link>
                            </li>
                            <li>
                                <Link href={router.pathname} locale="fr">
                                    <a>Français</a>
                                </Link>
                            </li>
                            <li>
                                <Link href={router.pathname} locale="hi">
                                    <a>नहीं</a>
                                </Link>
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
                                <img className="h-6 mr-4" src={'../assets/icons/youtube.svg'} alt="YouTube" />
                            </a>
                            <a href="https://www.tiktok.com/@sciteens" target="_blank" rel="noopener noreferrer">
                                <img className="h-6" src={'../assets/icons/tiktok.svg'} alt="TikTok" />
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