import Image from 'next/image'
import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function ProfilePhoto({ uid }) {
  const [img_src, setImgSrc] = useState(null)

  useEffect(() => {
    async function loadPhoto() {
      const profile_photo_ref = doc(
        db,
        'profile-pictures',
        uid
      )
      const profile_photo_doc = await getDoc(
        profile_photo_ref
      )
      if (profile_photo_doc.exists()) {
        setImgSrc(profile_photo_doc.data()?.picture)
      }
    }
    loadPhoto()
  }, [uid])

  return (
    <span className="relative block h-full w-full">
      {img_src ? (
        <Image
          src={img_src}
          alt="Profile"
          fill
          sizes="96px"
          className="rounded-full object-cover"
        />
      ) : (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          className="text-muted-foreground h-full max-h-24 w-full rounded-full fill-current object-fill"
        >
          {' '}
          <path d="M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM7 6v2a3 3 0 1 0 6 0V6a3 3 0 1 0-6 0zm-3.65 8.44a8 8 0 0 0 13.3 0 15.94 15.94 0 0 0-13.3 0z" />
        </svg>
      )}
    </span>
  )
}
