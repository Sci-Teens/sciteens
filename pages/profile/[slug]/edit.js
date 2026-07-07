import React, {
  useState,
  useCallback,
  useEffect,
  useContext,
} from 'react'
import LoadingSpinner from '../../../components/LoadingSpinner'

import Error from 'next/error'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import { useSigninCheck } from '../../../context/AuthContext'
import {
  db as firestore,
  storage,
} from '../../../lib/firebase'
import {
  collection,
  updateDoc,
  limit,
  getFirestore,
  query as firebase_query,
  where,
  getDocs,
  doc,
  setDoc,
} from '@firebase/firestore'
import {
  listAll,
  ref,
  getDownloadURL,
  getMetadata,
  uploadBytes,
  deleteObject,
} from '@firebase/storage'
import { updateProfile as updateFirebaseProfile } from '@firebase/auth'

import { useDropzone } from 'react-dropzone'
import File from '../../../components/File'
import { AppContext } from '../../../context/context'
import { sanitizeFileName } from '../../../context/helpers'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

export default function UpdateProfilePage({
  user_profile,
}) {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(false)
  const [members] = useState([])
  const [file_extensions] = useState([
    'text/html',
    'image/png',
    'image/jpg',
    'image/jpeg',
    'application/pdf',
    'application/vnd.ms-word',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/x-ipynb+json',
    'application/vnd.jupyter',
    'application/vnd.jupyter.cells',
    'application/vnd.jupyter.dragindex',
  ])
  const [files, setFiles] = useState([])
  const [metadata_arr, setMetadata] = useState([])
  const [profile_photo, setProfilePhoto] = useState(null)

  const [error_file, setErrorFile] = useState('')

  const { status, data: signInCheckResult } =
    useSigninCheck()

  const router = useRouter()
  const { profile } = useContext(AppContext)

  const schema = z.object({
    about: z.string().refine((v) => v.trim() !== '', {
      message: t('fill_out_about'),
    }),
  })

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { about: user_profile.about || '' },
  })

  useEffect(() => {
    if (
      status == 'success' &&
      !signInCheckResult?.signedIn
    ) {
      router.push({
        pathname: '/signin/student',
        query: { ref: `profile|${user_profile.slug}` },
      })
    } else if (
      status == 'success' &&
      router.query.slug != profile.slug &&
      signInCheckResult.user.uid != profile.id
    ) {
      router.back()
    }
  })

  useEffect(async () => {
    setFiles([])
    const filesRef = ref(
      storage,
      `profiles/${user_profile.id}`
    )

    // Find all the prefixes and items.
    try {
      const res = await listAll(filesRef)
      for (let r of res.items) {
        const url = await getDownloadURL(r)
        const metadata = await getMetadata(r)
        const xhr = new XMLHttpRequest()
        xhr.responseType = 'blob'
        xhr.onload = () => {
          const blob = xhr.response
          if (xhr.status == 200) {
            blob.name = metadata.name
            setFiles((oldFiles) => [...oldFiles, blob])
            setMetadata((oldMetadata) => [
              ...oldMetadata,
              metadata,
            ])

            if (metadata.name.includes('profile_photo')) {
              setProfilePhoto(metadata.name)
            }
          }
        }
        xhr.open('GET', url)
        xhr.send()
      }
    } catch (e) {
      router.push(`/profile/${user_profile.id}`)
    }
  }, [])

  const updateProfile = async (values) => {
    setLoading(true)
    try {
      await updateDoc(
        doc(firestore, 'profiles', user_profile.id),
        {
          about: values.about.trim(),
          links: [],
        }
      )
    } catch (e) {
      console.error(e)
      form.setError('about', {
        type: 'server',
        message: t('edit_profile.couldnt_update_profile'),
      })
    }

    try {
      for (const f of files) {
        const isProfilePhoto = f.name == profile_photo
        const ext = (
          f.name.split('.').pop() || ''
        ).toLowerCase()
        const safeName = isProfilePhoto
          ? `profile_photo.${ext || 'img'}`
          : sanitizeFileName(f.name)
        const fileRef = ref(
          storage,
          `profiles/${user_profile.id}/${safeName}`
        )
        await uploadBytes(fileRef, f)

        // Set user profile photo
        if (f.name == profile_photo) {
          const photoURL = await getDownloadURL(fileRef)
          const profile_photo_doc = doc(
            firestore,
            'profile-pictures',
            user_profile.id
          )
          await setDoc(profile_photo_doc, {
            picture: photoURL,
          })
          await updateFirebaseProfile(
            signInCheckResult.user,
            { photoURL: photoURL }
          )
        }
      }
      router.push(`/profile/${user_profile.slug}`)
      setLoading(false)
    } catch (error) {
      form.setError('about', {
        type: 'server',
        message: t('edit_profile.couldnt_update_profile'),
      })
      console.error(error)
      setLoading(false)
    }
  }

  const onDrop = useCallback((fs) => {
    for (const f of fs) {
      const reader = new FileReader()

      reader.onabort = () =>
        setErrorFile(t('edit_profile.file_aborted'))
      reader.onerror = () =>
        setErrorFile(t('edit_profile.file_failed'))
      reader.onload = () => setErrorFile('')

      if (
        !(
          file_extensions.includes(f.type) ||
          f.name.includes('.docx') ||
          f.name.includes('.pptx')
        )
      ) {
        setErrorFile(t('edit_profile.format_not_accepted'))
      } else if (f.size > 8000000) {
        setErrorFile(
          t('project_create_edit.file_too_large')
        )
      } else {
        reader.readAsDataURL(f)
        setFiles((oldfiles) => [
          ...new Set([...oldfiles, f]),
        ])
      }
    }
  })

  const { getRootProps, getInputProps, isDragActive } =
    useDropzone({ onDrop })

  const removeFile = async (e, id) => {
    e.preventDefault()
    let temp_files = [...files]
    let temp_metadata = [...metadata_arr]
    temp_files.splice(id, 1)
    const removed_metadata = temp_metadata.splice(id, 1)
    setFiles([...temp_files])
    setMetadata([...temp_metadata])
    const removed_file_ref = ref(
      storage,
      removed_metadata[0].fullPath
    )
    await deleteObject(removed_file_ref)
  }

  const setPhoto = (e, file) => {
    e.preventDefault()
    setProfilePhoto(file.name)
  }

  if (status == 'success' && signInCheckResult.signedIn) {
    return (
      <>
        <div className="relative z-30 mx-auto mb-24 mt-8 w-11/12 rounded-lg bg-white px-4 py-8 text-left shadow-sm md:w-2/3 md:px-12 md:py-12 lg:w-[45%] lg:px-20">
          <h1 className="mb-2 text-center text-3xl font-semibold">
            {t('edit_profile.update_your_profile')}
          </h1>
          <p className="mb-6 text-center text-gray-700">
            {t('edit_profile.why_update_your_profile')}
          </p>
          <form onSubmit={form.handleSubmit(updateProfile)}>
            <FieldGroup>
              <Controller
                name="about"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="about">
                      {t('edit_profile.about')}
                    </FieldLabel>
                    <Textarea
                      {...field}
                      id="about"
                      rows={7}
                      maxLength={1000}
                      placeholder={t(
                        'edit_profile.tell_us_about'
                      )}
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid && (
                      <FieldError
                        errors={[fieldState.error]}
                      />
                    )}
                  </Field>
                )}
              />
            </FieldGroup>

            {members.map((m, index) => (
              <p key={index} className="p-2">
                {m}
              </p>
            ))}

            <div className="mb-4"></div>
            <div
              {...getRootProps()}
              className={`h-40 w-full border-2 ${
                error_file
                  ? 'bg-red-200 hover:bg-red-300'
                  : 'bg-gray-100 hover:bg-gray-200'
              }  flex items-center justify-center rounded-lg border-dashed border-gray-600 text-center text-gray-700`}
            >
              <input {...getInputProps()} />
              {isDragActive ? (
                <p>{t('edit_profile.drop_files')}</p>
              ) : (
                <p>{t('edit_profile.drag_files')}</p>
              )}
            </div>
            <p className="mb-4 text-sm text-red-800">
              {error_file}
            </p>
            <div className="flex flex-col items-center space-y-2">
              {files.map((f, id) => {
                return (
                  <File
                    file={f}
                    id={id}
                    key={f.name}
                    removeFile={removeFile}
                    setPhoto={setPhoto}
                  ></File>
                )
              })}
            </div>
            {profile_photo && (
              <label
                htmlFor="project_photo"
                className="mt-2 uppercase text-gray-600"
              >
                {t('edit_profile.profile_photo')}
              </label>
            )}
            <div>
              {files.map((f, id) => {
                if (f.name == profile_photo) {
                  return (
                    <File
                      file={f}
                      id={id}
                      key={f.name}
                      removeFile={removeFile}
                      setPhoto={setPhoto}
                    ></File>
                  )
                }
              })}
            </div>

            <div className="flex w-full justify-end">
              <Button
                type="submit"
                size="lg"
                disabled={
                  !form.formState.isValid ||
                  form.formState.isSubmitting ||
                  loading ||
                  error_file
                }
                className="mr-2 mt-4 w-full"
              >
                {t('edit_profile.update')}
                {loading && <LoadingSpinner />}
              </Button>
              <Link
                href={`/profile/${user_profile.slug}`}
                className="ml-2 mt-4 w-full rounded-lg border-2 border-gray-200 bg-gray-100 p-2 text-center text-lg font-semibold text-black shadow-sm hover:border-gray-300 hover:bg-gray-200 disabled:opacity-50"
              >
                {t('edit_profile.cancel')}
              </Link>
            </div>
          </form>
        </div>
      </>
    )
  } else if (status == 'error') {
    return <Error statusCode={404}></Error>
  } else {
    return <div className="h-screen">Loading...</div>
  }
}

export async function getServerSideProps({
  query,
  locale,
}) {
  const translations = await serverSideTranslations(
    locale,
    ['common']
  )
  const firestore = getFirestore()
  const profilesRef = collection(firestore, 'profiles')
  const profileQuery = firebase_query(
    profilesRef,
    where('slug', '==', query.slug),
    limit(1)
  )
  const profileRes = await getDocs(profileQuery)
  if (!profileRes.empty) {
    let profile
    profileRes.forEach((p) => {
      if (p.exists) {
        profile = {
          ...p.data(),
          id: p.id,
        }
      }
    })
    return {
      props: { user_profile: profile, ...translations },
    }
  } else {
    return {
      notFound: true,
    }
  }
}
