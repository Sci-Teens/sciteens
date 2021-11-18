import { doc, getDocs, getFirestore, query as firebase_query, collection, where, limit } from "@firebase/firestore";
import { getApp, getApps, initializeApp } from "@firebase/app";
import firebaseConfig from "../../../firebaseConfig";
import { listAll, ref, getDownloadURL, getMetadata } from "@firebase/storage";
import { useStorage } from "reactfire";
import { useRouter } from "next/router";
import Head from "next/head";
import Error from 'next/error'
import Link from "next/link";
import moment from "moment";
import { useEffect, useState, useContext } from "react";
import { useSigninCheck } from "reactfire";
import { AppContext } from "../../../context/context";

function Project({ profile }) {
    const router = useRouter();
    const storage = useStorage()

    const [files, setFiles] = useState([])
    const { status, data: signInCheckResult } = useSigninCheck();
    const { profile: current_user_profile } = useContext(AppContext)

    useEffect(async () => {
        const filesRef = ref(storage, `profiles/${profile.id}`);

        // Find all the prefixes and items.

        try {
            const res = await listAll(filesRef)
            for (let r of res.items) {
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

    useEffect(() => {
    }, [status])

    return (<>
        <Head>
            <title>{profile.display}'s Profile | SciTeens</title>
            <link rel="icon" href="/favicon.ico" />
            <meta name="description" content={profile?.about ? profile.about : `${profile.display}'s Profile on SciTeens`} />
            <meta name="keywords" content="SciTeens, sciteens, profile, teen science" />
        </Head>
        <article className="prose-sm lg:prose mx-auto px-4 lg:px-0 mt-8">
            <div>
                <h1>
                </h1>
                <div className="leading-none m-0 p-0 flex flex-row justify-between">
                    <h1>
                        {profile.display}
                    </h1>
                    {(status === "success" && signInCheckResult.signedIn && current_user_profile?.slug === router.query?.slug) &&
                        <Link href={`/profile/${router?.query?.slug}/edit`}>
                            <div className="cursor-pointer h-1/3 py-1.5 px-6 border-2 text-xl font-semibold text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark rounded-full border-sciteensLightGreen-regular hover:border-sciteensLightGreen-dark text-center">Edit</div>
                        </Link>
                    }
                </div>
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
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const firestore = getFirestore(app)
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