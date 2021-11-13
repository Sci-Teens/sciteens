import { doc } from "@firebase/firestore";
import { listAll, ref, getDownloadURL, getMetadata } from "@firebase/storage";
import { useFirestore, useFirestoreDocData, useStorage, useSigninCheck } from "reactfire";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import Error from 'next/error'
import Link from "next/link";
import File from '../../../components/File';
import { useEffect, useState, useContext } from "react";
import { AppContext } from '../../../context/context';
import Discussion from "../../../components/Discussion";



function Project({ query }) {
    const router = useRouter();
    const firestore = useFirestore();
    const storage = useStorage()


    const projectRef = doc(firestore, 'projects', query.id);
    const { status, data: project } = useFirestoreDocData(projectRef);

    const [files, setFiles] = useState([])
    const [project_photo, setProjectPhoto] = useState('')

    const { profile } = useContext(AppContext)

    const { authStatus, data: signInCheckResult } = useSigninCheck();


    useEffect(async () => {
        const filesRef = ref(storage, `projects/${query.id}`);

        // Find all the prefixes and items.

        try {
            const res = await listAll(filesRef)
            for (const r of res.items) {
                const url = await getDownloadURL(r)
                const metadata = await getMetadata(r)
                const xhr = new XMLHttpRequest();
                xhr.responseType = 'blob';
                xhr.onload = (e) => {
                    const blob = xhr.response;
                    if (xhr.status == 200) {
                        blob.name = metadata.name
                        if (metadata?.customMetadata?.project_photo == 'true') {
                            setProjectPhoto(URL.createObjectURL(blob))
                        }
                        setFiles(fs => [...fs, blob])
                    }
                };
                xhr.open('GET', url);
                xhr.send();
            }
        }
        catch (e) {
            console.error(e)
        }
    }, [""])

    useEffect(() => {
        for (const f of files) {
            if (f.name.includes('project_photo') && f.type.includes('image')) {
                setProjectPhoto(URL.createObjectURL(f))
            }
        }
    }, [files])

    if (status === 'loading') {
        return <div className="prose-sm lg:prose mx-auto mt-4 mb-24 animate-pulse">
            <div className="w-full h-12 bg-gray-200 rounded-lg" />
            <div className="w-full h-8 mt-8 bg-gray-200 rounded-lg" />
            <div className="w-full h-8 mt-8 bg-gray-200 rounded-lg" />
            <div className="w-full h-64 mt-8 bg-gray-200 rounded-lg" />
            <div className="w-full h-8 mt-8 bg-gray-200 rounded-lg" />
            <div className="w-full h-24 mt-8 bg-gray-200 rounded-lg" />

        </div>
    }

    else if (status === 'error') {
        return <Error statusCode={404} />
    }

    return (<>
        <Head>
            <title>{project.title} | SciTeens</title>
            <link rel="icon" href="/favicon.ico" />
            <meta name="description" content={project?.abstract ? project.abstract : `${project.title} on SciTeens`} />
            <meta name="keywords" content="SciTeens, sciteens, project, teen science" />
        </Head>
        <article className="prose-sm lg:prose mx-auto px-4 lg:px-0 mt-8">
            <div>
                <div className="leading-none m-0 p-0 flex flex-row justify-between">
                    <h1>
                        {project.title}
                    </h1>
                    {project.member_uids.includes(signInCheckResult?.user?.uid) &&
                        <Link href={`/project/${router?.query?.id}/edit`}>
                            <div className="cursor-pointer h-1/3 py-1.5 px-6 border-2 text-xl font-semibold text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark rounded-full border-sciteensLightGreen-regular hover:border-sciteensLightGreen-dark text-center">Edit</div>
                        </Link>
                    }
                </div>
                <p>
                    {project.abstract}
                </p>
                <div className="border-b-2 mt-2"></div>
            </div>
            <div>
                {
                    project_photo ? <img
                        src={project_photo}
                        alt="Project Image"
                        className="w-full mt-0 object-contain" />
                        :
                        <div className="w-full my-8 h-64 bg-gray-200 rounded-lg animate-pulse" />
                }


            </div>
        </article>
        <div className="max-w-prose mx-auto mb-4 px-4 lg:px-0">
            {
                files.length > 0 && <h2 className="text-lg font-semibold mb-2">
                    Files
                </h2>
            }
            <div className="flex flex-col items-center space-y-2">
                {
                    files.map((f, id) => {
                        return <File file={f} id={id} key={f.name}></File>
                    })
                }
            </div>
            <Discussion type="projects" item_id={query.id}>
            </Discussion>
        </div>
    </>)
}

export async function getServerSideProps({ query }) {
    return { props: { query: query } }
}

export default Project