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
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app'
// getServerSideProps below deliberately imports its own
// firestore accessors from the top-level 'firebase/firestore'
// package rather than reusing the '@firebase/firestore' ones the
// client component uses — mixing the two around the same app
// instance throws "Expected first argument to collection() to be
// a CollectionReference..." (they resolve to distinct app
// registries in the server bundle).
import {
  collection as collectionSSR,
  getDocs as getDocsSSR,
  getFirestore as getFirestoreSSR,
  limit as limitSSR,
  query as querySSR,
  where as whereSSR,
} from 'firebase/firestore'
import {
  collection,
  updateDoc,
  query as firebase_query,
  getDocs,
  doc,
  setDoc,
  deleteDoc,
  orderBy,
} from '@firebase/firestore'
import {
  ref,
  getDownloadURL,
  uploadBytes,
  deleteObject,
} from '@firebase/storage'
import { updateProfile as updateFirebaseProfile } from '@firebase/auth'

import { useDropzone } from 'react-dropzone'
import File from '../../../components/File'
import LinksField from '../../../components/LinksField'
import { AppContext } from '../../../context/context'
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  buildFileRecord,
  getSafeUploadName,
  isAllowedLink,
  MAX_LINKS,
} from '../../../context/helpers'
import { generatePdfThumbnailBlob } from '../../../lib/pdfThumbnail'
import firebaseConfig from '../../../firebaseConfig'

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
  // { key, kind: 'existing', id, record } for a Firestore file
  // record already in Storage, or { key, kind: 'new', file } for a
  // freshly dropped, not-yet-uploaded File.
  const [entries, setEntries] = useState([])
  const [select_photo_mode, setMode] = useState(false)

  const [error_file, setErrorFile] = useState('')

  const [links, setLinks] = useState(
    Array.isArray(user_profile.links)
      ? user_profile.links.filter(isAllowedLink)
      : []
  )

  // Resume is a single-slot Firestore file record (isResume: true),
  // kept out of `entries` (the photo/gallery list) so it never gets
  // swept into the "set display photo" reorder logic. Removing an
  // existing resume deletes it immediately (mirrors removeFile
  // below); only a freshly picked replacement waits for submit.
  const [resume, setResume] = useState(null)
  const [errorResume, setErrorResume] = useState('')

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

  useEffect(() => {
    async function loadFiles() {
      setEntries([])
      setResume(null)
      try {
        const filesSnap = await getDocs(
          firebase_query(
            collection(
              firestore,
              'profiles',
              user_profile.id,
              'files'
            ),
            orderBy('createdAt', 'asc')
          )
        )
        const loaded = filesSnap.docs.map((snap) => ({
          key: snap.id,
          kind: 'existing',
          id: snap.id,
          record: snap.data(),
        }))
        const resumeIndex = loaded.findIndex(
          (entry) => entry.record.isResume
        )
        if (resumeIndex !== -1) {
          const [resumeEntry] = loaded.splice(
            resumeIndex,
            1
          )
          setResume(resumeEntry)
        }
        const photoIndex = loaded.findIndex(
          (entry) => entry.record.isPhoto
        )
        if (photoIndex > 0) {
          const [photo] = loaded.splice(photoIndex, 1)
          loaded.unshift(photo)
        }
        setEntries(loaded)
      } catch (e) {
        router.push(`/profile/${user_profile.id}`)
      }
    }
    loadFiles()
  }, [])

  const updateProfile = async (values) => {
    setLoading(true)
    try {
      await updateDoc(
        doc(firestore, 'profiles', user_profile.id),
        {
          about: values.about.trim(),
          links: links
            .filter(isAllowedLink)
            .slice(0, MAX_LINKS),
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
      let newPhotoUrl = ''
      for (let i = 0; i < entries.length; i++) {
        const entry = entries[i]
        const isPhoto = i === 0

        if (entry.kind === 'existing') {
          if (entry.record.isPhoto !== isPhoto) {
            await updateDoc(
              doc(
                firestore,
                'profiles',
                user_profile.id,
                'files',
                entry.id
              ),
              { isPhoto }
            )
          }
          if (isPhoto) newPhotoUrl = entry.record.url
          continue
        }

        const f = entry.file
        const safeName = getSafeUploadName(f)
        if (!safeName) {
          setErrorFile(
            t('edit_profile.format_not_accepted')
          )
          continue
        }
        const fileRef = ref(
          storage,
          `profiles/${user_profile.id}/${safeName}`
        )
        await uploadBytes(fileRef, f)
        const downloadURL = await getDownloadURL(fileRef)

        // Best-effort: a thumbnail-generation failure (corrupt/
        // encrypted/unrenderable PDF) must never block the upload
        // itself — File.js just falls back to live rendering.
        let thumbnailUrl = null
        if (f.type === 'application/pdf') {
          try {
            const thumbnailBlob =
              await generatePdfThumbnailBlob(f)
            const thumbnailRef = ref(
              storage,
              `profiles/${
                user_profile.id
              }/thumbnails/${safeName.replace(
                /\.pdf$/,
                '.png'
              )}`
            )
            await uploadBytes(thumbnailRef, thumbnailBlob, {
              contentType: 'image/png',
            })
            thumbnailUrl = await getDownloadURL(
              thumbnailRef
            )
          } catch (error) {
            console.error(
              'Failed to generate PDF thumbnail',
              error
            )
          }
        }

        await setDoc(
          doc(
            firestore,
            'profiles',
            user_profile.id,
            'files',
            safeName
          ),
          buildFileRecord({
            storagePath: fileRef.fullPath,
            bucket: firebaseConfig.storageBucket,
            name: f.name,
            contentType: f.type,
            size: f.size,
            url: downloadURL,
            uploadedBy: user_profile.id,
            isPhoto,
            thumbnailUrl,
          })
        )
        if (isPhoto) newPhotoUrl = downloadURL
      }

      // A new resume is uploaded on submit, like any other pending
      // file; removing an existing one already deleted it
      // immediately (see removeResume below), so there's nothing
      // left to clean up here.
      if (resume?.kind === 'new') {
        const resumeFile = resume.file
        const safeResumeName = getSafeUploadName(resumeFile)
        if (safeResumeName) {
          const resumeRef = ref(
            storage,
            `profiles/${user_profile.id}/${safeResumeName}`
          )
          await uploadBytes(resumeRef, resumeFile)
          const resumeDownloadURL = await getDownloadURL(
            resumeRef
          )
          await setDoc(
            doc(
              firestore,
              'profiles',
              user_profile.id,
              'files',
              safeResumeName
            ),
            buildFileRecord({
              storagePath: resumeRef.fullPath,
              bucket: firebaseConfig.storageBucket,
              name: resumeFile.name,
              contentType: resumeFile.type,
              size: resumeFile.size,
              url: resumeDownloadURL,
              uploadedBy: user_profile.id,
              isResume: true,
            })
          )
        }
      }

      await setDoc(
        doc(firestore, 'profile-pictures', user_profile.id),
        { picture: newPhotoUrl }
      )
      await updateFirebaseProfile(signInCheckResult.user, {
        photoURL: newPhotoUrl,
      })

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

      if (!ALLOWED_UPLOAD_MIME_TYPES.includes(f.type)) {
        setErrorFile(t('edit_profile.format_not_accepted'))
      } else if (f.size > 8000000) {
        setErrorFile(
          t('project_create_edit.file_too_large')
        )
      } else {
        reader.readAsDataURL(f)
        setEntries((old) => [
          ...old,
          {
            key: crypto.randomUUID(),
            kind: 'new',
            file: f,
          },
        ])
      }
    }
  })

  const { getRootProps, getInputProps, isDragActive } =
    useDropzone({
      onDrop,
      accept: ALLOWED_UPLOAD_MIME_TYPES.join(','),
    })

  const removeFile = async (e, id) => {
    e.preventDefault()
    const removed = entries[id]
    const temp = [...entries]
    temp.splice(id, 1)
    setEntries(temp)

    if (removed.kind !== 'existing') return

    try {
      await deleteObject(ref(storage, removed.record.path))
      if (removed.record.thumbnailUrl) {
        await deleteObject(
          ref(storage, removed.record.thumbnailUrl)
        ).catch((error) =>
          console.error('Failed to delete thumbnail', error)
        )
      }
      await deleteDoc(
        doc(
          firestore,
          'profiles',
          user_profile.id,
          'files',
          removed.id
        )
      )
    } catch (error) {
      console.error('Failed to remove file', error)
    }
  }

  const setPhoto = (e, id) => {
    e?.preventDefault()
    const temp = [...entries]
    const chosen = temp[id]
    temp[id] = temp[0]
    temp[0] = chosen
    setEntries(temp)
    setMode(false)
  }

  const onResumeChange = (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (f.type !== 'application/pdf') {
      setErrorResume(
        t('edit_profile.resume_format_not_accepted')
      )
      return
    }
    if (f.size > 8000000) {
      setErrorResume(
        t('project_create_edit.file_too_large')
      )
      return
    }
    setErrorResume('')
    setResume({
      key: crypto.randomUUID(),
      kind: 'new',
      file: f,
    })
  }

  const removeResume = async (e) => {
    e?.preventDefault()
    const removed = resume
    setResume(null)
    setErrorResume('')

    if (removed?.kind !== 'existing') return

    try {
      await deleteObject(ref(storage, removed.record.path))
      await deleteDoc(
        doc(
          firestore,
          'profiles',
          user_profile.id,
          'files',
          removed.id
        )
      )
    } catch (error) {
      console.error('Failed to remove resume', error)
    }
  }

  // Maps an entry to the `file` shape File.js expects — a real
  // File/Blob for a pending upload, or a plain descriptor for an
  // already-uploaded record (no blob download needed to preview it).
  function fileForEntry(entry) {
    if (entry.kind === 'existing') {
      const r = entry.record
      return {
        name: r.name,
        type: r.contentType,
        size: r.size,
        url: r.url,
        thumbnailUrl: r.thumbnailUrl,
      }
    }
    return entry.file
  }

  if (status == 'success' && signInCheckResult.signedIn) {
    return (
      <>
        <main>
          <div className="bg-card relative z-30 mx-auto mb-24 mt-8 w-11/12 rounded-lg px-4 py-8 text-left shadow-sm md:w-2/3 md:px-12 md:py-12 lg:w-[45%] lg:px-20">
            <h1 className="mb-2 text-center text-3xl font-semibold">
              {t('edit_profile.update_your_profile')}
            </h1>
            <p className="text-muted-foreground mb-6 text-center">
              {t('edit_profile.why_update_your_profile')}
            </p>
            <form
              onSubmit={form.handleSubmit(updateProfile)}
            >
              <FieldGroup>
                <Controller
                  name="about"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid}
                    >
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
              <LinksField
                links={links}
                setLinks={setLinks}
              />
              <div
                {...getRootProps()}
                className={`h-40 w-full border-2 ${
                  error_file
                    ? 'bg-red-200 hover:bg-red-300'
                    : 'bg-muted hover:bg-accent'
                }  text-muted-foreground flex items-center justify-center rounded-lg border-dashed border-gray-600 text-center`}
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
              {entries.length !== 0 && (
                <div className="mb-6">
                  {entries.length > 1 && (
                    <p className="mb-2">
                      {t(
                        'project_create_edit.multiple_photos'
                      )}{' '}
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setMode(!select_photo_mode)
                        }
                        onKeyDown={(e) => {
                          if (
                            e.key === 'Enter' ||
                            e.key === ' '
                          ) {
                            e.preventDefault()
                            setMode(!select_photo_mode)
                          }
                        }}
                        className="text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark cursor-pointer font-semibold"
                      >
                        {t(
                          'project_create_edit.set_display_photo'
                        )}
                      </span>
                      .
                    </p>
                  )}
                  <label
                    htmlFor="project_photo"
                    className="text-muted-foreground mt-2 uppercase"
                  >
                    {t('edit_profile.profile_photo')}
                  </label>
                  <File
                    file={fileForEntry(entries[0])}
                    id={0}
                    removeFile={removeFile}
                    setPhoto={setPhoto}
                  ></File>
                </div>
              )}
              <div className="flex flex-col space-y-3">
                {entries.length > 1 && (
                  <>
                    <label
                      htmlFor="other_files"
                      className="text-muted-foreground -mb-3 mt-2 text-left uppercase"
                    >
                      {t('project_create_edit.other_photo')}
                    </label>
                    {entries.map((entry, id) => {
                      if (id === 0) return null
                      return (
                        <div
                          className="flex w-full flex-row"
                          key={entry.key}
                        >
                          <button
                            onClick={(e) => setPhoto(e, id)}
                            className={`border-sciteensLightGreen-regular text-sciteensLightGreen-regular hover:border-sciteensLightGreen-dark hover:text-sciteensLightGreen-dark hover:bg-accent rounded-lg border-2 font-semibold transition-all duration-500 ${
                              select_photo_mode
                                ? 'mr-4 w-28'
                                : 'w-0 overflow-hidden border-none'
                            }`}
                          >
                            Select
                          </button>
                          <File
                            file={fileForEntry(entry)}
                            id={id}
                            removeFile={removeFile}
                            setPhoto={setPhoto}
                          ></File>
                        </div>
                      )
                    })}
                  </>
                )}
              </div>

              <div className="mb-6">
                <label
                  htmlFor="resume"
                  className="text-muted-foreground mt-2 uppercase"
                >
                  {t('edit_profile.resume')}
                </label>
                <p className="text-muted-foreground mb-2 text-sm">
                  {t('edit_profile.resume_hint')}
                </p>
                {resume ? (
                  <File
                    file={fileForEntry(resume)}
                    id="resume"
                    removeFile={removeResume}
                  ></File>
                ) : (
                  <label
                    htmlFor="resume-input"
                    className={`h-16 w-full border-2 ${
                      errorResume
                        ? 'bg-red-200 hover:bg-red-300'
                        : 'bg-muted hover:bg-accent'
                    } text-muted-foreground flex cursor-pointer items-center justify-center rounded-lg border-dashed border-gray-600 text-center`}
                  >
                    {t('edit_profile.resume_upload')}
                    <input
                      id="resume-input"
                      type="file"
                      accept="application/pdf"
                      className="hidden"
                      onChange={onResumeChange}
                    />
                  </label>
                )}
                {errorResume && (
                  <p className="mt-2 text-sm text-red-800">
                    {errorResume}
                  </p>
                )}
              </div>

              <div className="flex w-full justify-end">
                <Button
                  type="submit"
                  size="lg"
                  disabled={
                    !form.formState.isValid ||
                    form.formState.isSubmitting ||
                    loading ||
                    error_file ||
                    errorResume
                  }
                  className="mr-2 mt-4 w-full"
                >
                  {t('edit_profile.update')}
                  {loading && <LoadingSpinner />}
                </Button>
                <Link
                  href={`/profile/${user_profile.slug}`}
                  className="border-border bg-muted text-foreground hover:border-border hover:bg-accent ml-2 mt-4 w-full rounded-lg border-2 p-2 text-center text-lg font-semibold shadow-sm disabled:opacity-50"
                >
                  {t('edit_profile.cancel')}
                </Link>
              </div>
            </form>
          </div>
        </main>
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
  // getServerSideProps runs in a webpack-split server bundle that
  // doesn't carry over lib/firebase.js's app-init side effect (only
  // the React component below references `db`/`storage`) — without
  // this, getFirestore() throws "No Firebase App '[DEFAULT]'".
  const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  const firestore = getFirestoreSSR(app)
  const profilesRef = collectionSSR(firestore, 'profiles')
  const profileQuery = querySSR(
    profilesRef,
    whereSSR('slug', '==', query.slug),
    limitSSR(1)
  )
  const profileRes = await getDocsSSR(profileQuery)
  if (!profileRes.empty) {
    let profile
    profileRes.forEach((p) => {
      if (p.exists()) {
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
