import Link from 'next/link'
import Image from 'next/image';
import { useRouter } from "next/router"
import Head from 'next/head';
import { useEffect, useState, useContext } from 'react';
import { getApp, getApps, initializeApp } from "@firebase/app";
import firebaseConfig from '../firebaseConfig';
import { collection, query as firebase_query, orderBy, getDocs, limit, getFirestore } from '@firebase/firestore';
import algoliasearch from "algoliasearch/lite";
import { useSpring, animated, config } from '@react-spring/web'
import ProfilePhoto from "../components/ProfilePhoto"
import { AppContext } from '../context/context'


// const searchClient = algoliasearch(
//     process.env.NEXT_PUBLIC_AL_APP_ID,
//     process.env.NEXT_PUBLIC_AL_ADMIN_KEY
// );
// const projectIndex = searchClient.initIndex("projects")

function Projects({ projects }) {
    const router = useRouter()
    //const firestore = useFirestore()
    const [search, setSearch] = useState('')
    const [field, setField] = useState('All')
    const [field_names] = useState([
        "All",
        "Biology",
        "Chemistry",
        "Cognitive Science",
        "Computer Science",
        "Earth Science",
        "Electrical Engineering",
        "Environmental Science",
        "Mathematics",
        "Mechanical Engineering",
        "Medicine",
        "Physics",
        "Space Science",
    ])

    const { profile } = useContext(AppContext)



    // useEffect(async () => {
    //     try {
    //         const projectsCollection = collection(firestore, 'projects')
    //         const projectsQuery = query(projectsCollection, orderBy('date', 'asc'), limit(10))
    //         const projectsRef = await getDocs(projectsQuery)
    //         projectsRef.forEach(p => {
    //             setProjects(oldProjects => [...oldProjects, {
    //                 id: p.id,
    //                 ...p.data(),
    //             }])
    //         })
    //         console.log(projects)
    //     }

    //     catch (e) {
    //         console.error(e)
    //     }

    // }, [])

    const imageLoader = ({ src, width, height }) => {
        return `${src}/${width || 256}x${height || 256}`
    }

    useEffect(() => {
        if (router?.isReady) {
            setSearch(router.query?.search ? router.query.search : '')
            setField(router.query?.field ? router.query.field : '')
        }
    }, [router])

    async function handleChange(e, target) {
        e.preventDefault();
        switch (target) {
            case 'searchbar':
                setSearch(e.target.value)
        }
    }

    async function handleSearch(e) {
        e.preventDefault()
        let q = {}
        if (search) {
            q.search = search
        }
        if (field) {
            q.field = field
        }
        router.push({
            pathname: '/projects',
            query: q
        })
    }

    async function handleFieldSearch(field) {
        let q = {}
        q.field = field
        router.push({
            pathname: '/projects',
            query: q
        })
        setField(field)
    }

    function checkForLongFields(fields) {
        if (fields.slice(0, 3).includes("Mechanical Engineering") ||
            fields.slice(0, 3).includes("Electrical Engineering") ||
            fields.slice(0, 3).includes("Environmental Science")) {
            return 2
        } else return 3
    }

    // REACT SPRING ANIMATIONS
    useEffect(() => {
        set({ opacity: 0, transform: 'translateX(150px)', config: { tension: 10000, clamp: true } })
        window.setTimeout(function () { set({ opacity: 1, transform: 'translateX(0)', config: config.slow }) }, 10)
    }, [projects])

    const [project_spring, set] = useSpring(() => ({
        opacity: 1,
        transform: 'translateX(0)',
        from: {
            opacity: 0,
            transform: 'translateX(150px)'
        },
        config: config.slow
    }))

    const projectsComponent = projects.map((project, index) => {
        return (
            <Link key={project.id} href={`/project/${project.id}`}>
                <animated.a style={project_spring} className="p-4 bg-white shadow rounded-lg z-50 mt-6 md:mt-8 flex items-center cursor-pointer overflow-hidden">
                    <div className="h-full max-w-[100px] md:max-w-[200px] max-h-[100px] md:max-h-[200px] relative overflow-hidden rounded-lg">
                        <img src={project.project_photo ? project.project_photo : ''} className="rounded-lg object-cover flex-shrink-0"></img>
                    </div>
                    {/* <Image src={"https://source.unsplash.com/collection/1677633/"} alt="Project Image" height={128} width={128} loader={imageLoader}></Image> */}
                    <div className="ml-4 w-3/4 lg:w-11/12">
                        {project.member_arr && <div className="flex flex-row items-center mb-3">
                            <div className="flex -space-x-2 overflow-hidden">
                                {project.member_arr.map((member) => {
                                    return <div className="inline-block h-6 w-6 lg:h-8 lg:w-8 rounded-full ring-2 ring-white">
                                        <ProfilePhoto uid={member.uid}></ProfilePhoto>
                                    </div>
                                })}
                            </div>
                            <p className="ml-2">By {project.member_arr.map((member) => {
                                return member.display + " "
                            })}</p>
                        </div>}
                        <h3 className="font-semibold text-base md:text-xl lg:text-2xl mb-2 line-clamp-2">{project.title}</h3>
                        <p className="hidden md:block mb-4 line-clamp-none md:line-clamp-2 lg:line-clamp-3">{project.abstract}</p>
                        <div className="flex flex-row">
                            {console.log(project.fields.slice(0, 3).includes("Mechanical Engineering"))}
                            {project.fields.map((field, index) => {
                                if (index < checkForLongFields(project.fields))
                                    return <p className="hidden lg:flex text-xs py-1.5 px-3 bg-gray-100 rounded-full mr-2 mb-2 z-30 shadow whitespace-nowrap">{field}</p>
                            })}
                            {project.fields.length >= 3 &&
                                <p className="hidden lg:flex text-xs text-gray-600 mt-1.5 whitespace-nowrap">+ {project.fields.length - checkForLongFields(project.fields)} more field{project.fields.length - checkForLongFields(project.fields) == 1 ? "" : "s"}</p>
                            }
                        </div>
                    </div>
                </animated.a>
            </Link >
        )
    })

    const loadingComponent = (new Array(10)).fill(1).map(() => {
        return (
            <div className="p-4 h-16 bg-gray-100 shadow rounded-lg z-50 mt-4"></div>
        )
    })

    return (
        <>
            <Head>
                <title>{field ? field + ' ' : ''}Projects {search ? 'related to ' + search : ''} | SciTeens</title>
                <link rel="icon" href="/favicon.ico" />
                <meta name="description" content="SciTeens Projects Page" />
                <meta name="keywords" content="SciTeens, sciteens, projects, teen science" />
            </Head>
            <div className="min-h-screen mx-auto lg:mx-16 xl:mx-32 flex flex-row mt-8 mb-24 overflow-x-hidden md:overflow-visible">
                <div className="w-11/12 md:w-[85%] mx-auto lg:mx-0 lg:w-[60%]">
                    <div className="flex flex-row justify-between">
                        <h1 className="text-3xl md:text-4xl py-4 text-left ml-0 md:ml-4 font-semibold">
                            Latest Projects 📰
                        </h1>
                        {profile.slug &&
                            <Link href="/project/create">
                                {window.innerWidth >= 812 ?
                                    <a className="text-lg font-semibold text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark my-auto py-1.5 px-5 rounded-full border-2 border-sciteensLightGreen-regular hover:border-sciteensLightGreen-dark">Create Project</a>
                                    :
                                    <img src={'assets/zondicons/add-outline.svg'} alt="Share Project" className="h-8 my-auto" />
                                }
                            </Link>
                        }
                    </div>
                    {projects?.length != 0 ? projectsComponent : loadingComponent}
                    {
                        projects.length == 0 &&
                        <div className="mx-auto text-center mt-20">
                            <i className="font-semibold text-xl">
                                Sorry, we couldn't find any searches related to {router?.query.search}
                            </i>
                        </div>
                    }
                </div >

                <div className="hidden lg:block w-0 lg:w-[30%] lg:ml-32">
                    <div className="sticky top-1/2 transform -translate-y-1/2 w-full">
                        <h2 className="text-xl text-gray-700 mb-2">Search Projects</h2>
                        <form onSubmit={e => handleSearch(e)} className="flex flex-row">
                            <input
                                onChange={e => handleChange(e, 'searchbar')}
                                value={search}
                                name="search"
                                required
                                className={`appearance-none border-transparent border-2 bg-white w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 focus:border-sciteensLightGreen-regular text-gray-700 shadow`}
                                type="text"
                                aria-label="search"
                                maxLength="100"
                            />
                            <button type="submit" className="bg-sciteensLightGreen-regular text-white font-semibold rounded-lg px-4 py-2 hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                                onClick={e => handleSearch(e)}>
                                Search
                            </button>
                        </form>

                        <hr className="bg-gray-300 my-8" />

                        <h2 className="text-xl text-gray-700 mb-2">Topics</h2>
                        <div className="flex flex-row flex-wrap">
                            {
                                field_names.map((f) => {
                                    return (
                                        <button key={f} onClick={() => handleFieldSearch(f)} className={`text-sm px-3 py-2 rounded-full mr-4 mb-4 shadow
                                        ${f == field ? "bg-sciteensLightGreen-regular text-white" : "bg-white"}`}>
                                            {f}
                                        </button>
                                    )
                                })
                            }
                        </div>
                    </div>
                </div>
            </div >
        </>

    )
}

export async function getServerSideProps({ query }) {
    let projects = []
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    try {
        // Fetch data from external API (Algolia)
        const searchClient = algoliasearch(
            process.env.NEXT_PUBLIC_AL_APP_ID,
            process.env.NEXT_PUBLIC_AL_SEARCH_KEY
        );

        const projectIndex = searchClient.initIndex("prod_PROJECTS")

        if (query?.search && (!query?.field || query?.field == "All")) {
            console.log("Algolia search")
            let results = await projectIndex
                .search(query.search)
            results.hits.forEach(p => {
                projects.push({
                    id: p.objectID,
                    ...p.data
                })
            })
        }
        else if (query?.search && query?.field != "All") {
            console.log("Algolia field")
            let results = await projectIndex
                .search(query.search, {
                    filters: 'data.fields:' + query.field
                })
            results.hits.forEach(p => {
                projects.push({
                    id: p.objectID,
                    ...p.data
                })
            })
        }
        else {
            const firestore = getFirestore(app)
            const projectsCollection = collection(firestore, 'projects')
            const projectsQuery = firebase_query(projectsCollection, orderBy('date', 'desc'), limit(10))
            const projectsRef = await getDocs(projectsQuery)
            projectsRef.forEach(p => {
                projects.push({
                    id: p.id,
                    ...p.data(),
                })
            })
        }

        return {
            props: { projects: projects }
        }
    }
    catch (e) {
        console.error(e)
        const firestore = getFirestore(app)
        const projectsCollection = collection(firestore, 'projects')
        const projectsQuery = firebase_query(projectsCollection, orderBy('date', 'desc'), limit(10))
        const projectsRef = await getDocs(projectsQuery)
        projectsRef.forEach(p => {
            projects.push({
                id: p.id,
                ...p.data(),
            })
        })
        return {
            props: { projects: projects }
        }
    }
}

export default Projects