import Link from 'next/link'
import Image from 'next/image';
import { useRouter } from "next/router"
import Head from 'next/head';
import { useFirestore } from 'reactfire';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, limit } from '@firebase/firestore';

function Projects() {
    const router = useRouter()
    const firestore = useFirestore()

    const [projects, setProjects] = useState([])

    useEffect(async () => {
        try {
            const projectsCollection = collection(firestore, 'projects')
            const projectsQuery = query(projectsCollection, orderBy('date', 'asc'), limit(10))
            const projectsRef = await getDocs(projectsQuery)
            projectsRef.forEach(p => {
                setProjects(oldProjects => [...oldProjects, {
                    id: p.id,
                    ...p.data(),
                }])
            })
            console.log(projects)
        }

        catch (e) {
            console.error(e)
        }

    }, [])

    const projectsComponent = projects.map((project, index) => {

        return (
            <Link key={index} href={`/project/${project.id}`}>

                <div className="p-4 bg-white shadow rounded-lg z-50 mt-4 flex items-center">
                    <div className="h-full w-1/4 lg:w-1/12 relative">
                        <image src="" alt="Project Image"></image>
                    </div>
                    <div className="ml-4 w-3/4 lg:w-11/12">
                        <h3 className="font-semibold text-lg">{project.title}</h3>
                        <p className="hidden lg:block">{project.abstract}</p>
                        <div className="flex flex-row items-center mt-2">
                            <p className="ml-2">By {project.members}</p>
                        </div>
                    </div>

                </div>
            </Link >
        )
    })
    return (
        <>
            <Head>
                <title>Projects Page {router?.query?.page ? router.query.page : 1}</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div className="w-full">
                <h1 className="text-4xl py-4 text-left ml-4">
                    📰 Latest Projects
                </h1>
                {projectsComponent}
            </div>
        </>

    )
}

export default Projects