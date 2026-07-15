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
import FileUploadField from '../../../components/FileUploadField'
import AuthCard from '../../../components/AuthCard'
import { AppContext } from '../../../context/context'
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  buildFileRecord,
  getSafeUploadName,
  getUploadStoragePath,
  isAllowedLink,
  MAX_LINKS,
} from '../../../context/helpers'
import { generatePdfThumbnailBlob } from '../../../lib/pdfThumbnail'
import firebaseConfig from '../../../firebaseConfig'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { cn } from '@/lib/utils'

import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

export default function UpdateProfilePage({
  user_profile,
}) {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(false)
  // { key, kind: 'existing', id, record } for a Firestore file
  // record already in Storage, or { key, kind: 'new', file } for a
  // freshly dropped, not-yet-uploaded File.
  const [entries, setEntries] = useState([])

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
          getUploadStoragePath(
            'profiles',
            user_profile.id,
            safeName,
            isPhoto
          )
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
      <AuthCard
        maxWidth="max-w-2xl"
        title={t('edit_profile.update_your_profile')}
        subtitle={t('edit_profile.why_update_your_profile')}
      >
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

            <LinksField links={links} setLinks={setLinks} />

            <FileUploadField
              dropzone={{
                getRootProps,
                getInputProps,
                isDragActive,
              }}
              error={error_file}
              entries={entries}
              getFile={fileForEntry}
              getKey={(entry) => entry.key}
              onRemove={removeFile}
              onSetPhoto={setPhoto}
              photoLabel={t('edit_profile.profile_photo')}
            />

            <Field>
              <FieldLabel htmlFor="resume-input">
                {t('edit_profile.resume')}
              </FieldLabel>
              <FieldDescription>
                {t('edit_profile.resume_hint')}
              </FieldDescription>
              {resume ? (
                <File
                  file={fileForEntry(resume)}
                  id="resume"
                  removeFile={removeResume}
                />
              ) : (
                <label
                  htmlFor="resume-input"
                  className={cn(
                    'flex h-16 w-full cursor-pointer items-center justify-center rounded-lg border-2 border-dashed text-center text-sm transition-colors',
                    errorResume
                      ? 'border-destructive/40 bg-destructive/5 text-destructive'
                      : 'border-border bg-muted/50 hover:bg-muted text-muted-foreground'
                  )}
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
                <FieldError>{errorResume}</FieldError>
              )}
            </Field>

            <div className="flex gap-3">
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
                className="flex-1"
              >
                {t('edit_profile.update')}
                {loading && <LoadingSpinner />}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                render={
                  <Link
                    href={`/profile/${user_profile.slug}`}
                  />
                }
              >
                {t('edit_profile.cancel')}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </AuthCard>
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
