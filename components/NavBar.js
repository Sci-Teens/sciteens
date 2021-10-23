import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSigninCheck, useAuth } from 'reactfire'
import { useContext, useState } from 'react'
import { AppContext } from '../context/context'
import { signOut } from '@firebase/auth'
import { debounce } from 'lodash'

export default function NavBar() {
    const router = useRouter()
    const auth = useAuth()
    const { status, data: signInCheckResult } = useSigninCheck();
    const { profile, setProfile } = useContext(AppContext);

    const [showMenu, setShowMenu] = useState(false)

    function handleShowMenu() {
        showMenu ? setTimeout(e => setShowMenu(false), 500) : setShowMenu(true)
    }

    async function handleSignOut() {
        setProfile({})
        signOut(auth)
    }


    return (
        <nav className="bg-white mx-4 shadow rounded-lg z-50 mt-3 flex justify-between h-16 items-center">
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
                <Link href="/courses" >
                    <a className={`p-2 hover:bg-gray-200 hover:shadow-inner text-gray-700 rounded-lg hidden lg:block mr-2 ${router.basePath.includes('courses') ? 'text-sciteensGreen-regular underline' : 'text-gray-700'}`}>
                        Courses
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
                    <div onMouseEnter={handleShowMenu} onMouseLeave={handleShowMenu}>
                        <Link href={`/profile/${profile?.slug ? profile.slug : ''}`} >
                            <div className="relative h-10 w-10 rounded-full border-4 border-white hover:border-gray-100 hover:shadow-inner" >
                                <img src={signInCheckResult.user.photoURL} className="object-contain rounded-full" />
                            </div>
                        </Link>                        {
                            showMenu && <div className="p-4 rounded-lg bg-white absolute shadow-lg top-20 w-32 right-4" onClick={handleSignOut}>
                                Sign Out
                            </div>
                        }
                    </div> :
                    <div>
                        <Link href="/signup" >
                            <a className={`p-2 hover:bg-sciteensLightGreen-dark bg-sciteensLightGreen-regular text-white rounded-lg hidden lg:block mr-2 shadow`}>
                                Sign Up
                            </a>
                        </Link>
                    </div>
                }
            </div>
        </nav>
    )
}