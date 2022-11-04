import { useEffect, useState, useRef } from 'react';

import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from "next/router"
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { useIntersectionObserver } from '../context/helpers';

import { useFirestore, useFirestoreCollectionData } from 'reactfire';
import firebaseConfig from '../firebaseConfig';
import { getApp, getApps, initializeApp } from "@firebase/app";
import { collection, query as firebase_query, orderBy, getDocs, limit, getFirestore, where as firebase_where, startAfter, documentId } from '@firebase/firestore';

import algoliasearch from "algoliasearch/lite";
import { useSpring, animated, config } from '@react-spring/web'
import ProfilePhoto from "../components/ProfilePhoto"
import { getTranslatedFieldsDict } from '../context/helpers';


function Projects({ cached_projects }) {
    const router = useRouter()
    const firestore = useFirestore()
    const [projects, setProjects] = useState(cached_projects)

    useEffect(async () => {
        if (router.asPath !== '/projects') {
            let ps = []
            if (router.query.search) {
                let ids = []
                // Fetch data from external API (Algolia)
                const searchClient = algoliasearch(
                    process.env.NEXT_PUBLIC_AL_APP_ID,
                    process.env.NEXT_PUBLIC_AL_SEARCH_KEY
                );

                const projectIndex = searchClient.initIndex("prod_PROJECTS")

                if (!router.query?.field || router.query?.field == "All") {
                    let results = await projectIndex
                        .search(router.query.search)
                    results.hits.forEach(p => {
                        ids.push(p.objectID)
                        // ps.push({
                        //     id: p.objectID,
                        //     ...p.data
                        // })
                    })
                }

                else {
                    let results = await projectIndex
                        .search(query.search, {
                            filters: 'data.fields:' + query.field
                        })
                    results.hits.forEach(p => {
                        ids.push(p.objectID)

                        // ps.push({
                        //     id: p.objectID,
                        //     ...p.data
                        // })
                    })
                }
                const projectsCollection = collection(firestore, 'projects')
                const projectsQuery = firebase_query(projectsCollection, firebase_where(documentId(), 'in', ids.slice(0, 10)))
                const projectsRef = await getDocs(projectsQuery)
                projectsRef.forEach(p => {
                    ps.push({
                        id: p.id,
                        ...p.data(),
                    })
                })

                setProjects(ps)
            }

            // Firebase
            else {
                const projectsCollection = collection(firestore, 'projects')
                let projectsQuery
                if (!router.query?.field || router.query?.field == "All") {
                    console.log("Firebase regular")
                    projectsQuery = firebase_query(projectsCollection, orderBy('date', 'desc'), limit(10))

                }

                else {
                    projectsQuery = firebase_query(projectsCollection, firebase_where('fields', 'array-contains', router.query.field), orderBy('date', 'desc'), limit(10))
                }
                const projectsRef = await getDocs(projectsQuery)
                projectsRef.forEach(p => {
                    ps.push({
                        id: p.id,
                        ...p.data(),
                    })
                })
                setProjects(ps)
            }
        }
    }, [router])

    const [search, setSearch] = useState('')
    const [field, setField] = useState('All')

    const imageLoader = ({ src, width, height }) => {
        return `${src}/${width || 256}x${height || 256}`
    }

    useEffect(() => {
        if (router?.isReady) {
            setSearch(router.query?.search ? router.query.search : '')
            setField(router.query?.field ? router.query.field : '')
        }
    }, [router])

    const ref = useRef(null);
    const isBottomVisible = useIntersectionObserver(ref, { threshold: 0 }, false);


    async function load_more_projects() {
        if (!router?.query?.search) {
            let ps = []
            const projectsCollection = collection(firestore, 'projects')
            let projectsQuery
            if (!router.query?.field || router.query?.field == "All") {
                console.log("Firebase regular")
                projectsQuery = firebase_query(projectsCollection, orderBy('date', 'desc'), startAfter(projects[projects.length - 1].date), limit(10))
            }

            else {
                projectsQuery = firebase_query(projectsCollection, firebase_where('fields', 'array-contains', router.query.field), orderBy('date', 'desc'), startAfter(projects[projects.length - 1].date), limit(10))
            }
            const projectsRef = await getDocs(projectsQuery)
            projectsRef.forEach(p => {
                ps.push({
                    id: p.id,
                    ...p.data(),
                })
            })
            setProjects(old_ps => [...old_ps, ...ps])
        }
    }
    useEffect(() => {
        //load next page when bottom is visible
        isBottomVisible && load_more_projects()
    }, [isBottomVisible]);


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
            fields.slice(0, 3).includes("Environmental Science") ||
            fields.slice(0, 3).includes("Fall 2022 Science Fair")) {
            return 2
        } else return 3
    }

    // REACT SPRING ANIMATIONS
    useEffect(() => {
        if (projects.length <= 10) {
            set({ opacity: 0, transform: 'translateX(150px)', config: { tension: 10000, clamp: true } })
            window.setTimeout(function () { set({ opacity: 1, transform: 'translateX(0)', config: config.slow }) }, 10)
        }
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
    const { t } = useTranslation('common');

    const projectsComponent = projects.map((project, index) => {
        return (
            <Link key={project.id} href={`/project/${project.id}`}>
                <animated.a style={project_spring} className="p-4 bg-white shadow rounded-lg z-50 mt-6 md:mt-8 flex items-center cursor-pointer overflow-hidden">
                    <div className="h-full max-w-[100px] md:max-w-[200px] max-h-[100px] md:max-h-[200px] relative overflow-hidden rounded-lg">
                        <img src={project.project_photo ? project.project_photo : ''} className="rounded-lg object-cover flex-shrink-0"></img>
                    </div>
                    <div className="ml-4 w-3/4 lg:w-11/12">
                        {project.member_arr && <div className="flex flex-row items-center mb-1">
                            <div className="flex -space-x-2 overflow-hidden">
                                {project.member_arr.map((member, index) => {
                                    return <div key={index} className="inline-block h-6 w-6 lg:h-8 lg:w-8 rounded-full ring-2 ring-white">
                                        <ProfilePhoto uid={member.uid}></ProfilePhoto>
                                    </div>
                                })}
                            </div>
                            <p className="ml-2">By&nbsp;
                                {project.member_arr.map((member) => {
                                    return (
                                        <Link href={`/profile/${member.slug ? member.slug : ''}`}>
                                            <a className="text-sciteensGreen-regular hover:text-sciteensGreen-dark no-underline font-bold">
                                                {member.display + " "}
                                            </a>
                                        </Link>
                                    )
                                })}
                            </p>
                        </div>}
                        <div className="text-gray-500 mb-3 ml-10">{project.start_date}</div>
                        <h3 className="font-semibold text-base md:text-xl lg:text-2xl mb-2 line-clamp-2">{project.title}</h3>
                        <p className="hidden md:block mb-4 line-clamp-none md:line-clamp-2 lg:line-clamp-3">{project.abstract}</p>
                        <div className="hidden lg:flex flex-row">
                            {project.fields.map((field, index) => {
                                if (index < checkForLongFields(project.fields))
                                    return <p key={index} className="text-xs py-1.5 px-3 bg-gray-100 rounded-full mr-2 mb-2 z-30 shadow whitespace-nowrap">{getTranslatedFieldsDict(t)[field]}</p>
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

    const loadingComponent = (new Array(10)).fill(1).map((index) => {
        return (
            <div key={index} className="p-4 h-16 bg-gray-100 shadow rounded-lg z-50 mt-4"></div>
        )
    })

    return (
        <>
            <Head>
                <title>{field ? field + ' ' : ''}Projects {search ? 'related to ' + search : ''} | SciTeens</title>
                <link rel="icon" href="/favicon.ico" />
                <meta name="description" content="SciTeens Projects Page" />
                <meta name="keywords" content="SciTeens, sciteens, projects, teen science" />
                <meta property="og:type" content="website" />
                <meta name="og:image" content="/assets/sciteens_initials.jpg" />
            </Head>
            <div className="min-h-screen mx-auto lg:mx-16 xl:mx-32 flex flex-row mt-8 mb-24 overflow-x-hidden md:overflow-visible">
                <div className="w-11/12 md:w-[85%] mx-auto lg:mx-0 lg:w-[60%]">
                    <div className="flex flex-row justify-between">
                        <h1 className="text-3xl md:text-4xl py-4 text-left ml-0 md:ml-4 font-semibold">
                            {t('projects.projects')} 🔬
                        </h1>
                        <Link href="/project/create">
                            {process.browser && window.innerWidth >= 812 ?
                                <a className="text-lg font-semibold text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark my-auto py-1.5 px-5 rounded-full border-2 border-sciteensLightGreen-regular hover:border-sciteensLightGreen-dark">Create Project</a>
                                :
                                <img src={'assets/zondicons/add-outline.svg'} alt="Share Project" className="h-8 my-auto" />
                            }
                        </Link>
                    </div>
                    {projects?.length != 0 ? projectsComponent : loadingComponent}
                    {
                        projects.length == 0 &&
                        <div className="mx-auto text-center mt-20">
                            <i className="font-semibold text-xl">
                                {t('projects.sorry')}  {router?.query.search}
                            </i>
                        </div>
                    }
                    <div ref={ref} style={{ width: "100%", height: "20px" }}>
                    </div>
                </div >

                <div className="hidden lg:block w-0 lg:w-[30%] lg:ml-32">
                    <div className="sticky top-1/2 transform -translate-y-1/2 w-full">
                        <h2 className="text-xl text-gray-700 mb-2">
                            {t('projects.search_projects')}
                        </h2>
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
                                {t('projects.search')}
                            </button>
                        </form>

                        <hr className="bg-gray-300 my-8" />

                        <h2 className="text-xl text-gray-700 mb-2">{t('projects.topics')}</h2>
                        <div className="flex flex-row flex-wrap">
                            {Object.entries(getTranslatedFieldsDict(t)).map(([key, value]) => {
                                return (
                                    <button key={value} onClick={() => handleFieldSearch(key)} className={`text-sm px-3 py-2 rounded-full mr-4 mb-4 shadow
                                        ${key == field ? "bg-sciteensLightGreen-regular text-white" : "bg-white"}`}>
                                        {value}
                                    </button>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div >
        </>

    )
}

export async function getStaticProps({ locale }) {
    let projects = []
    const translations = await serverSideTranslations(locale, ['common'])
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
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
        props: { cached_projects: projects, ...translations }
    }
}

export default Projects