import { doc } from "@firebase/firestore";
import { listAll, ref } from "@firebase/storage";
import { useFirestore, useFirestoreDocData, useStorage } from "reactfire";
import { useRouter } from "next/router";
import Head from "next/head";
import Image from "next/image";
import Error from 'next/error'
import Link from "next/link";
import { useEffect } from "react";



function Project({ query }) {
    const router = useRouter();
    const firestore = useFirestore();
    const storage = useStorage()

    const projectRef = doc(firestore, 'projects', query.id);
    const { status, data: project } = useFirestoreDocData(projectRef);

    useEffect(async () => {
        const filesRef = ref(storage, `projects/${query.id}`);

        // Find all the prefixes and items.

        try {
            const res = await listAll(filesRef)
            console.log(res)
            for (const f of res.items) {
                console.log(f)
            }
        }
        catch (e) {
            console.error(e)
        }
    })

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
        <article className="prose-sm lg:prose mx-auto px-4">
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
    </>)
}

export async function getServerSideProps({ query }) {
    return { props: { query: query } }
}

export default Project