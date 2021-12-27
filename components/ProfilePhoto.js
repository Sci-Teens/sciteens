import { useEffect, useState } from "react";
import { useFirestore } from "reactfire";
import { doc, getDoc } from "@firebase/firestore"

export default function ProfilePhoto({ uid }) {
    const firestore = useFirestore()
    const [img_src, setImgSrc] = useState(null)

    useEffect(async () => {
        const profile_photo_ref = doc(firestore, 'profile-pictures', uid)
        const profile_photo_doc = await getDoc(profile_photo_ref)
        if (profile_photo_doc.exists()) {
            setImgSrc(profile_photo_doc.data()?.picture)
        }
    }, [""])

    useEffect(() => {

    }, [img_src])

    return (
        <>
            {
                img_src ? < img src={img_src} alt="Profile Photo" className="object-fill h-full w-full rounded-full" ></img > :
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="object-fill fill-current text-gray-700 h-full max-h-24 w-full rounded-full" > < path d="M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM7 6v2a3 3 0 1 0 6 0V6a3 3 0 1 0-6 0zm-3.65 8.44a8 8 0 0 0 13.3 0 15.94 15.94 0 0 0-13.3 0z" /></svg >
            }
        </>
    )
}