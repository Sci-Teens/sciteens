import Image from 'next/image'
import { UserRound } from 'lucide-react'
import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../lib/firebase'

export default function ProfilePhoto({ uid, alt }) {
  const [img_src, setImgSrc] = useState(null)
  const [img_error, setImgError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setImgSrc(null)
    setImgError(false)

    if (!uid) return undefined

    async function loadPhoto() {
      try {
        const profile_photo_ref = doc(
          db,
          'profile-pictures',
          uid
        )
        const profile_photo_doc = await getDoc(
          profile_photo_ref
        )
        if (!cancelled && profile_photo_doc.exists()) {
          setImgSrc(
            profile_photo_doc.data()?.picture || null
          )
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadPhoto()

    return () => {
      cancelled = true
    }
  }, [uid])

  const showImage = Boolean(img_src) && !img_error

  return (
    <span className="bg-muted relative block h-full w-full overflow-hidden rounded-full">
      {showImage ? (
        <Image
          src={img_src}
          alt={alt || 'Profile'}
          fill
          sizes="96px"
          className="object-cover"
          onError={() => setImgError(true)}
        />
      ) : (
        <UserRound
          strokeWidth={1.5}
          aria-hidden="true"
          className="text-muted-foreground/60 h-full w-full p-[15%]"
        />
      )}
    </span>
  )
}
