import { doc, getDocs, getFirestore, query as firebase_query, collection, where, limit } from "@firebase/firestore";
import { listAll, ref, getDownloadURL, getMetadata } from "@firebase/storage";
import { useFirestore, useFirestoreDocDataOnce, useStorage } from "reactfire";
import { useRouter } from "next/router";
import Head from "next/head";
import Error from 'next/error'
import Link from "next/link";
import moment from "moment";
import { useEffect, useState } from "react";

function Project({ profile }) {
    const router = useRouter();
    const storage = useStorage()

    const [files, setFiles] = useState([])

    useEffect(async () => {
        const filesRef = ref(storage, `profiles/${profile.id}`);

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
                        console.log(blob)
                        blob.name = metadata.name
                        setFiles([...files, blob])
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

    return (<>
        <Head>
            <title>{profile.display}</title>
            <link rel="icon" href="/favicon.ico" />
        </Head>
        <article className="prose-sm lg:prose mx-auto px-4 lg:px-0 mt-8">
            <div>
                <h1>
                    {profile.display}
                </h1>
                <h4>
                    Joined {moment(profile.joined).calendar(null, { sameElse: 'MMMM DD, YYYY' })}
                </h4>
                <p>
                </p>
                <div className="border-b-2 mt-2">
                    {profile.about}
                </div>
            </div>
            <div>
                <img src={profile.image ? profile.image : 'https://external-content.duckduckgo.com/iu/?u=http%3A%2F%2Fgetwallpapers.com%2Fwallpaper%2Ffull%2F3%2F7%2F2%2F538871.jpg&f=1&nofb=1'} className="w-full mt-0 object-contain" />
            </div>
        </article>
    </>)
}

export async function getServerSideProps({ query }) {
    const firestore = getFirestore()
    const profilesRef = collection(firestore, "profiles");
    const profileQuery = firebase_query(profilesRef, where("slug", "==", query.slug), limit(1));
    const profileRes = await getDocs(profileQuery)
    if (!profileRes.empty) {
        let profile;
        profileRes.forEach(p => {
            if (p.exists) {
                profile = {
                    ...p.data(),
                    id: p.id
                }
            }
        })
        return { props: { profile: profile } }
    }

    else {
        return {
            notFound: true,
        }
    }
}

export default Project