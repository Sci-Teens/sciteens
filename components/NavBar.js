import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSigninCheck } from 'reactfire'
import { useContext } from 'react'
import { AppContext } from '../context/context'

export default function NavBar() {
    const router = useRouter()
    const { status, data: signInCheckResult } = useSigninCheck();
    const { profile } = useContext(AppContext);

    return (
        <nav className="bg-white w-full shadow z-50 flex justify-between h-16 items-center">
            <div className="inline-block md:w-1/2">
                <Link href="/">
                    <img className="h-16 ml-4" src={'../assets/sciteens_logo_initials.svg'} alt="" />
                </Link>
            </div>
            <div className="mr-4 md:w-1/2 flex items-center justify-end">
                <Link href="/">
                    <a className={`p-2 hover:bg-gray-200 hover:shadow-inner text-gray-700 rounded-lg hidden lg:block mr-2 ${router.basePath == '/' ? 'text-sciteensGreen-regular underline' : 'text-gray-700'}`}>
                        Home
                    </a>
                </Link>
                <Link href="/about" >
                    <a className={`p-2 hover:bg-gray-200 hover:shadow-inner text-gray-700 rounded-lg hidden lg:block mr-2 ${router.basePath.includes('about') ? 'text-sciteensGreen-regular underline' : 'text-gray-700'}`}>
                        About
                    </a>
                </Link>
                <Link href="/articles">
                    <a className={`p-2 hover:bg-gray-200 hover:shadow-inner text-gray-700 rounded-lg hidden lg:block mr-2 ${router.basePath.includes('articles') ? 'text-sciteensGreen-regular underline' : 'text-gray-700'}`}>
                        Articles
                    </a>
                </Link>
                <Link href="/projects" >
                    <a className={`p-2 hover:bg-gray-200 hover:shadow-inner text-gray-700 rounded-lg hidden lg:block mr-2 ${router.basePath.includes('projects') ? 'text-sciteensGreen-regular underline' : 'text-gray-700'}`}>
                        Projects
                    </a>
                </Link>
                <Link href="/getinvolved" >
                    <a className={`p-2 hover:bg-gray-200 hover:shadow-inner text-gray-700 rounded-lg hidden lg:block mr-2 ${router.basePath.includes('getinvolved') ? 'text-sciteensGreen-regular underline' : 'text-gray-700'}`}>
                        Get Involved
                    </a>
                </Link>
                <Link href="/donate" >
                    <a className={`p-2 hover:bg-gray-200 hover:shadow-inner text-gray-700 rounded-lg hidden lg:block mr-2 ${router.basePath.includes('donate') ? 'text-sciteensGreen-regular underline' : 'text-gray-700'}`}>
                        Donate
                    </a>
                </Link>
                {status === "success" && signInCheckResult?.signedIn === true ?
                    <div>
                        <Link href={`/profile/${profile?.slug}`} >
                            <div className="h-10 w-10 rounded-full border-4 border-white hover:border-gray-100 hover:shadow-inner">
                                <img src={signInCheckResult.user.photoURL} className="object-contain rounded-full" />
                            </div>
                        </Link>
                    </div> :
                    <div>
                        <Link href="/signup" >
                            <a className={`p-2 hover:bg-sciteensLightGreen-dark bg-sciteensLightGreen-regular text-white rounded-lg hidden lg:block mr-2 shadow`}>
                                Sign Up
                            </a>
                        </Link>
                    </div>}
            </div>
        </nav>
    )
}