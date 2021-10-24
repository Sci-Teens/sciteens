import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSigninCheck, useAuth } from 'reactfire'
import { useContext, useState, useEffect, useRef } from 'react'
import { AppContext } from '../context/context'
import { signOut } from '@firebase/auth'
import { debounce } from 'lodash'

export default function NavBar() {
    const router = useRouter()
    const auth = useAuth()
    const { status, data: signInCheckResult } = useSigninCheck();
    const { profile, setProfile } = useContext(AppContext);

    const [showProfileMenu, setShowProfileMenu] = useState(false)

    function handleShowMenu() {
        showProfileMenu ? setTimeout(e => setShowProfileMenu(false), 500) : setShowProfileMenu(true)
    }

    async function handleSignOut() {
        setProfile({})
        signOut(auth)
    }

    function handleSignOutAndClose() {
        setShowMobileNav(false)
        handleSignOut()
    }

    const menuRef = useRef();

    const [showMobileNav, setShowMobileNav] = useState(false)

    function handleClick(e) {
        if (menuRef.current && menuRef.current.contains(e.target)) {
            return;
        }
        setShowMobileNav(false);
    }

    useEffect(() => {
        document.addEventListener('mousedown', handleClick)

        // Functionality for showing/removing navbar based on scroll behavior
        let previousY = document.documentElement.scrollTop
        document.addEventListener('scroll', function () {
            let currentY = document.documentElement.scrollTop

            // If you're within 350px from the top of the page, the scrollbar is always visible
            if (currentY <= 350) {
                setVisibleNav(true)
                previousY = currentY
            } else {
                if (currentY - previousY >= 200) {
                    setVisibleNav(false)
                    setShowMobileNav(false)
                    previousY = currentY
                }
                if (previousY - currentY >= 200) {
                    setVisibleNav(true)
                    previousY = currentY
                }
            }
        })

        return () => {
            document.removeEventListener('mousedown', handleClick);
            document.removeEventListener('scroll', function () { })
        };
    }, [])

    const [visibleNav, setVisibleNav] = useState(true)

    return (
        <nav>
            <div className={`bg-white mx-4 shadow rounded-lg z-50 mt-3 flex justify-between h-16 items-center transform transition-transform duration-300
            ${visibleNav ? "translate-y-0" : "-translate-y-32"}`}>
                <div className="inline-block md:w-1/2">
                    <Link href="/">
                        <img className="h-16 ml-4" src={'../assets/sciteens_logo_initials.svg'} alt="" />
                    </Link>
                </div>
                <div className="mr-4 md:w-1/2 flex items-center justify-end">
                    <Link href="/">
                        <a className={`p-2 hover:bg-gray-200 hover:shadow-inner text-gray-700 rounded-lg hidden lg:block mr-2 ${router.pathname == '/' ? 'text-sciteensGreen-regular underline' : 'text-gray-700'}`}>
                            Home
                        </a>
                    </Link>
                    <Link href="/about" >
                        <a className={`p-2 hover:bg-gray-200 hover:shadow-inner text-gray-700 rounded-lg hidden lg:block mr-2 ${router.pathname.includes('about') ? 'text-sciteensGreen-regular underline' : 'text-gray-700'}`}>
                            About
                        </a>
                    </Link>
                    <Link href="/articles">
                        <a className={`p-2 hover:bg-gray-200 hover:shadow-inner text-gray-700 rounded-lg hidden lg:block mr-2 ${router.pathname.includes('articles') ? 'text-sciteensGreen-regular underline' : 'text-gray-700'}`}>
                            Articles
                        </a>
                    </Link>
                    <Link href="/projects" >
                        <a className={`p-2 hover:bg-gray-200 hover:shadow-inner text-gray-700 rounded-lg hidden lg:block mr-2 ${router.pathname.includes('projects') ? 'text-sciteensGreen-regular underline' : 'text-gray-700'}`}>
                            Projects
                        </a>
                    </Link>
                    <Link href="/courses" >
                        <a className={`p-2 hover:bg-gray-200 hover:shadow-inner text-gray-700 rounded-lg hidden lg:block mr-2 ${router.pathname.includes('courses') ? 'text-sciteensGreen-regular underline' : 'text-gray-700'}`}>
                            Courses
                        </a>
                    </Link>
                    <Link href="/getinvolved" >
                        <a className={`p-2 hover:bg-gray-200 hover:shadow-inner text-gray-700 rounded-lg hidden lg:block mr-2 whitespace-nowrap ${router.pathname.includes('getinvolved') ? 'text-sciteensGreen-regular underline' : 'text-gray-700'}`}>
                            Get Involved
                        </a>
                    </Link>
                    <Link href="/donate" >
                        <a className={`p-2 hover:bg-gray-200 hover:shadow-inner text-gray-700 rounded-lg hidden lg:block mr-2 ${router.pathname.includes('donate') ? 'text-sciteensGreen-regular underline' : 'text-gray-700'}`}>
                            Donate
                        </a>
                    </Link>
                    <button onClick={() => setShowMobileNav(true)} className="mr-4 lg:hidden">
                        <img src={'/assets/zondicons/menu.svg'} alt="menu" className="h-8" />
                    </button>
                    <div className="hidden lg:flex">
                        {status === "success" && signInCheckResult?.signedIn === true ?
                            <div onMouseEnter={handleShowMenu} onMouseLeave={handleShowMenu}>
                                <Link href={`/profile/${profile?.slug ? profile.slug : ''}`} >
                                    <div className="relative h-10 w-10 rounded-full border-4 border-white hover:border-gray-100 hover:shadow-inner" >
                                        <img src={signInCheckResult.user.photoURL} className="object-contain rounded-full" />
                                    </div>
                                </Link>                        {
                                    showProfileMenu && <div className="p-4 rounded-lg bg-white absolute shadow-lg top-20 w-32 right-4" onClick={handleSignOut}>
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
                </div>
            </div>
            {/* Mobile Nav Menu */}
            <div ref={menuRef} className={`fixed right-0 top-0 h-screen bg-white text-lg text-gray-700 transition-all duration-500 transform
            ${showMobileNav ? "" : "translate-x-full"}`}>
                <div className="flex flex-col px-6 pt-16">
                    <Link href="/">
                        <div onClick={() => setShowMobileNav(false)} className={`flex flex-row py-3 px-6 rounded-lg mb-4
                        ${router.pathname == '/' ? "underline bg-gray-100" : ""}`}>
                            <img src={'assets/zondicons/home.svg'} alt="" className="h-6 my-auto mr-4" />
                            <p>Home</p>
                        </div>
                    </Link>
                    <Link href="/about" >
                        <div onClick={() => setShowMobileNav(false)} className={`flex flex-row py-3 px-6 rounded-lg mb-4
                        ${router.pathname.includes('about') ? "underline bg-gray-100" : ""}`}>
                            <img src={'assets/zondicons/question.svg'} alt="" className="h-6 my-auto mr-4" />
                            <p>About</p>
                        </div>
                    </Link>
                    <Link href="/articles">
                        <div onClick={() => setShowMobileNav(false)} className={`flex flex-row py-3 px-6 rounded-lg mb-4
                        ${router.pathname.includes('articles') ? "underline bg-gray-100" : ""}`}>
                            <img src={'assets/zondicons/folder.svg'} alt="" className="h-6 my-auto mr-4" />
                            <p>Articles</p>
                        </div>
                    </Link>
                    <Link href="/projects" >
                        <div onClick={() => setShowMobileNav(false)} className={`flex flex-row py-3 px-6 rounded-lg mb-4
                        ${router.pathname.includes('projects') ? "underline bg-gray-100" : ""}`}>
                            <img src={'assets/zondicons/news-paper.svg'} alt="" className="h-6 my-auto mr-4" />
                            <p>Projects</p>
                        </div>
                    </Link>
                    <Link href="/courses" >
                        <div onClick={() => setShowMobileNav(false)} className={`flex flex-row py-3 px-6 rounded-lg mb-4
                        ${router.pathname.includes('courses') ? "underline bg-gray-100" : ""}`}>
                            <img src={'assets/zondicons/education-nav.svg'} alt="" className="h-6 my-auto mr-4" />
                            <p>Courses</p>
                        </div>
                    </Link>
                    <Link href="/getinvolved" >
                        <div onClick={() => setShowMobileNav(false)} className={`flex flex-row py-3 px-6 rounded-lg mb-4
                        ${router.pathname.includes('getinvolved') ? "underline bg-gray-100" : ""}`}>
                            <img src={'assets/zondicons/user-group.svg'} alt="" className="h-6 my-auto mr-4" />
                            <p className="whitespace-nowrap">Get Involved</p>
                        </div>
                    </Link>
                    <Link href="/donate" >
                        <div onClick={() => setShowMobileNav(false)} className={`flex flex-row py-3 px-6 rounded-lg mb-4
                        ${router.pathname.includes('donate') ? "underline bg-gray-100" : ""}`}>
                            <img src={'assets/zondicons/wallet.svg'} alt="" className="h-6 my-auto mr-4" />
                            <p>Donate</p>
                        </div>
                    </Link>
                    {signInCheckResult?.signedIn === false &&
                        <Link href="/signup" >
                            <div onClick={() => setShowMobileNav(false)} className={`flex flex-row py-3 px-6 rounded-lg mb-4
                            ${router.pathname.includes('signup') ? "underline bg-gray-100" : ""}`}>
                                <img src={'assets/zondicons/user-add.svg'} alt="" className="h-6 my-auto mr-4" />
                                <p>Sign Up</p>
                            </div>
                        </Link>
                    }

                </div>
                {status === "success" && signInCheckResult?.signedIn === true &&
                    <>
                        <hr className="w-[80%] mx-auto bg-black" />
                        <div className="mx-8">
                            <div className="flex flex-row mt-6 mb-2 mx-auto">
                                <img src={signInCheckResult.user.photoURL} alt="" className="h-10 mr-6" />
                                <p className="text-xl my-auto">{signInCheckResult.user.displayName}</p>
                            </div>
                            <div className="flex flex-col text-left ml-4">
                                <Link href={`/profile/${profile?.slug ? profile.slug : ''}`}>
                                    <div className="flex flex-row">
                                        <div className={`w-0.5 h-auto mr-6
                                        ${router.pathname.includes('profile') ? "bg-sciteensLightGreen-regular" : "bg-gray-400"}`} />
                                        <p onClick={() => setShowMobileNav(false)}>Profile</p>
                                    </div>
                                </Link>
                                <div className="w-0.5 h-2 bg-gray-400" />
                                <div className="flex flex-row">
                                    <div className="w-0.5 h-auto bg-gray-400 mr-6" />
                                    <button onClick={handleSignOutAndClose}>Sign Out</button>
                                </div>
                            </div>
                        </div>
                    </>
                }
                <button onClick={() => setShowMobileNav(false)} className="absolute z-30 top-6 right-6">
                    <img src={'/assets/zondicons/close.svg'} alt="close" className="h-8 w-8" />
                </button>
            </div>
        </nav>
    )
}