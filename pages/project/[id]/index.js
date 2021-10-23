import { doc } from "@firebase/firestore";
import { listAll, ref, getDownloadURL, getMetadata } from "@firebase/storage";
import { useFirestore, useFirestoreDocData, useStorage } from "reactfire";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import Error from 'next/error'
import Link from "next/link";
import File from '../../../components/File'
import { useEffect, useState } from "react";

import Discussion from "../../../components/Discussion";



function Project({ query }) {
    const router = useRouter();
    const firestore = useFirestore();
    const storage = useStorage()

    const projectRef = doc(firestore, 'projects', query.id);
    const { status, data: project } = useFirestoreDocData(projectRef);

    const [files, setFiles] = useState([])

    useEffect(async () => {
        const filesRef = ref(storage, `projects/${query.id}`);

        // Find all the prefixes and items.

        try {
            const res = await listAll(filesRef)
            console.log(res)
            for (const r of res.items) {
                const url = await getDownloadURL(r)
                const metadata = await getMetadata(r)
                const xhr = new XMLHttpRequest();
                xhr.responseType = 'blob';
                xhr.onload = (e) => {
                    const blob = xhr.response;
                    if (xhr.status == 200) {
                        console.log(blob)
                        blob.name = metadata.name
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

    if (status === 'loading') {
        return <span>loading... {status}</span>;
    }

    else if (status === 'error') {
        return <Error statusCode={404} />
    }

    return (<>
        <Head>
            <title>{project.title}</title>
            <link rel="icon" href="/favicon.ico" />
        </Head>
        <article className="prose-sm lg:prose mx-auto px-4 lg:px-0">
            <div>
                <h1>
                    {project.title}
                </h1>
                <p>
                    {project.abstract}
                </p>
                <div className="border-b-2 mt-2"></div>
            </div>
            <div>
                {router.query.id}
                <img src={project.image ? project.image : 'https://external-content.duckduckgo.com/iu/?u=http%3A%2F%2Fgetwallpapers.com%2Fwallpaper%2Ffull%2F3%2F7%2F2%2F538871.jpg&f=1&nofb=1'} className="w-full mt-0 object-contain" />
            </div>
        </article>
        <div className="max-w-prose mx-auto mb-4 px-4 lg:px-0">
            <h2 className="text-lg font-semibold mb-2">
                Files
            </h2>
            <div className="flex flex-col items-center space-y-2">
                {
                    files.map((f, id) => {
                        return <File file={f} id={id} key={f.name}></File>
                    })
                }
            </div>
            <Discussion projectId={query.id}>
            </Discussion>
        </div>
    </>)
}

export async function getServerSideProps({ query }) {
    return { props: { query: query } }
}

export default Project