import React, {
  useState,
  useCallback,
  useEffect,
} from 'react'
import LoadingSpinner from '../../../components/LoadingSpinner'

import Error from 'next/error'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import {
  db as firestore,
  storage,
} from '../../../lib/firebase'
import { useSigninCheck } from '../../../context/AuthContext'
import {
  collection,
  query as firestoreQuery,
  startAt,
  endAt,
  orderBy,
  limit,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  setDoc,
  deleteDoc,
} from '@firebase/firestore'
import {
  ref,
  getDownloadURL,
  uploadBytes,
  deleteObject,
} from '@firebase/storage'

import moment from 'moment'
import isEmail from 'validator/lib/isEmail'
import debounce from 'lodash.debounce'
import { useDropzone } from 'react-dropzone'
import File from '../../../components/File'
import LinksField from '../../../components/LinksField'
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  buildFileRecord,
  getProjectFieldOptions,
  getSafeUploadName,
  isAllowedProjectLink,
} from '../../../context/helpers'
import { generatePdfThumbnailBlob } from '../../../lib/pdfThumbnail'
import firebaseConfig from '../../../firebaseConfig'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

export default function UpdateProject({ query }) {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(false)
  const [member, setMember] = useState('')
  const [members, setMembers] = useState([])
  const [member_uids, setMemberUids] = useState([])
  const [select_photo_mode, setMode] = useState(false)

  const [field_values, setFieldValues] = useState(
    new Array(
      Object.keys(getProjectFieldOptions(t)).length
    ).fill(false)
  )
  // Each entry is { key, kind: 'existing', id, record } for a
  // Firestore file record already in Storage, or { key, kind: 'new',
  // file } for a freshly dropped, not-yet-uploaded File. entries[0]
  // is always the current display photo — index, not a name/flag,
  // is the single source of truth for "which one is the photo" in
  // this component (see setPhoto/onSubmit below).
  const [entries, setEntries] = useState([])
  const [links, setLinks] = useState([])

  const [error_member, setErrorMember] = useState('')
  const [error_file, setErrorFile] = useState('')

  const { status, data: signInCheckResult } =
    useSigninCheck()

  const router = useRouter()

  const schema = z
    .object({
      title: z
        .string()
        .min(1, t('project_create_edit.error_title')),
      start_date: z
        .string()
        .min(1, t('project_create_edit.error_start_date')),
      end_date: z
        .string()
        .min(1, t('project_create_edit.error_end_date')),
      abstract: z
        .string()
        .min(1, t('project_create_edit.error_abstract')),
    })
    .superRefine((data, ctx) => {
      if (
        data.start_date &&
        data.end_date &&
        data.start_date >= data.end_date
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['end_date'],
          message: t('project_create_edit.error_dates'),
        })
      }
    })

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      title: '',
      start_date: '',
      end_date: '',
      abstract: '',
    },
  })

  useEffect(() => {
    if (
      status == 'success' &&
      !signInCheckResult?.signedIn
    ) {
      router.push({
        pathname: '/signin/student',
        query: { ref: `project|${query.id}/edit` },
      })
    } else if (
      status == 'success' &&
      signInCheckResult.user &&
      member_uids.length &&
      !member_uids.includes(signInCheckResult.user.uid)
    ) {
      router.push(`/project/${query.id}`)
    }
  }, [status, member_uids])

  useEffect(() => {
    async function loadProject() {
      setEntries([])
      const projectRef = doc(
        firestore,
        'projects',
        query.id
      )

      try {
        const projectDoc = await getDoc(projectRef)
        const projectData = projectDoc.data()

        // Check if user is a member
        setMemberUids((old_uids) => [
          ...old_uids,
          ...projectData.member_uids,
        ])
        form.reset({
          title: projectData.title,
          abstract: projectData.abstract,
          start_date: projectData.start
            ? moment(projectData.start).format('yyyy-MM-DD')
            : '',
          end_date: projectData.end
            ? moment(projectData.end).format('yyyy-MM-DD')
            : '',
        })
        setFieldValues(projectData.fields)
        setLinks(
          Array.isArray(projectData.links)
            ? projectData.links.filter(isAllowedProjectLink)
            : []
        )
        let temp_fields = new Array(
          Object.keys(getProjectFieldOptions(t)).length
        ).fill(false)
        for (
          let i = 0;
          i < Object.keys(getProjectFieldOptions(t)).length;
          i++
        ) {
          if (
            projectData.fields.some(
              (f) =>
                f.toLowerCase() ===
                Object.keys(getProjectFieldOptions(t))[
                  i
                ].toLowerCase()
            )
          ) {
            temp_fields[i] = true
          }
        }
        setFieldValues(temp_fields)

        // One-time read, not a live subscription — this page treats
        // the loaded files the same way it treats title/abstract/etc:
        // load once, then edit local state until submit. A live
        // onSnapshot here would fight with in-progress local edits
        // (reordering the display photo, a pending removal) every
        // time another tab wrote to this project's files.
        const filesSnap = await getDocs(
          firestoreQuery(
            collection(
              firestore,
              'projects',
              query.id,
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
        // The current display photo (if any) always renders first,
        // matching the create/edit form's "Display Photo" slot.
        const photoIndex = loaded.findIndex(
          (entry) => entry.record.isPhoto
        )
        if (photoIndex > 0) {
          const [photo] = loaded.splice(photoIndex, 1)
          loaded.unshift(photo)
        }
        setEntries(loaded)
      } catch (e) {
        console.error(e)
        router.push(`/project/${query.id}`)
      }
    }
    loadProject()
  }, [])

  const onSubmit = async (values) => {
    setLoading(true)
    try {
      // Only update editable fields. Never overwrite member_uids or
      // subscribers on a plain edit — that would kick out other members
      // and is also blocked by firestore.rules.
      await updateDoc(
        doc(firestore, 'projects', query.id),
        {
          title: values.title.trim(),
          start: values.start_date
            ? moment(values.start_date).toISOString()
            : moment().toISOString(),
          end: values.end_date
            ? moment(values.end_date).toISOString()
            : '',
          abstract: values.abstract.trim(),
          need_mentor: false,
          links: links.filter(isAllowedProjectLink),
          date: moment().toISOString(),
          fields: Object.keys(
            getProjectFieldOptions(t)
          ).filter((item, i) => field_values[i]),
        }
      )
      if (members.length > 0) {
        await setDoc(
          doc(firestore, 'project-invites', query.id),
          {
            emails: members,
            title: values.title.trim(),
          }
        )
      }
    } catch (error) {
      form.setError('title', {
        message: t('project_create_edit.could_not_update'),
      })
      console.error(error)
      setLoading(false)
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
                'projects',
                query.id,
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
            t(
              'project_create_edit.file_format_not_accepted'
            )
          )
          continue
        }
        const fileRef = ref(
          storage,
          `projects/${query.id}/${safeName}`
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
              `projects/${
                query.id
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
            'projects',
            query.id,
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
            uploadedBy: signInCheckResult.user.uid,
            isPhoto,
            thumbnailUrl,
          })
        )
        if (isPhoto) newPhotoUrl = downloadURL
      }

      await updateDoc(
        doc(firestore, 'projects', query.id),
        { project_photo: newPhotoUrl }
      )

      router.push(`/project/${query.id}`)
      setLoading(false)
    } catch (error) {
      form.setError('title', {
        message: t('project_create_edit.could_not_update'),
      })
      console.error(error)
      setLoading(false)
    }
  }

  const onDrop = useCallback((fs) => {
    for (const f of fs) {
      const reader = new FileReader()

      reader.onabort = () =>
        setErrorFile(t('project_create_edit.file_aborted'))
      reader.onerror = () =>
        setErrorFile(t('project_create_edit.file_failed'))
      reader.onload = () => setErrorFile('')

      if (!ALLOWED_UPLOAD_MIME_TYPES.includes(f?.type)) {
        setErrorFile(
          t('project_create_edit.file_format_not_accepted')
        )
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

  async function onChange(e, target) {
    switch (target) {
      case 'member':
        setMember(e.target.value)
        if (!isEmail(e.target.value)) {
          setErrorMember(
            t('project_create_edit.error_email')
          )
        } else {
          setErrorMember('')
          validateEmail(e.target.value)
        }
        break
    }
  }

  const validateEmail = useCallback(
    debounce(async (email) => {
      try {
        const emails = collection(firestore, 'emails')
        const q = firestoreQuery(
          emails,
          orderBy('email'),
          startAt(email),
          endAt(email + '\u{f8ff}'),
          limit(3)
        )
        const res = await getDocs(q)
        if (res.empty) {
          setErrorMember(
            t('project_create_edit.could_not_find_email')
          )
        } else {
          setErrorMember('')
          res.forEach((snap) => {
            if (snap.data().email == email) {
              setMembers([...new Set([...members, email])])
              setMember('')
            }
          })
        }
      } catch (e) {
        setErrorMember(
          t('project_create_edit.could_not_find_email')
        )
      }
    }, 500),
    []
  )

  const removeMember = (e) => {
    e.preventDefault()
    let temp = [...members]
    const ix = e.target.getAttribute('name')
    temp.splice(ix, 1)
    setMembers([...temp])
  }

  const removeFile = async (e, id) => {
    e.preventDefault()
    const removed = entries[id]
    const temp = [...entries]
    temp.splice(id, 1)
    setEntries(temp)

    // A freshly dropped, not-yet-uploaded file has nothing in Storage
    // or Firestore to clean up.
    if (removed.kind !== 'existing') return

    try {
      await deleteObject(ref(storage, removed.record.path))
      if (removed.record.thumbnailUrl) {
        // ref() accepts a full download URL directly. Best-effort —
        // never block the main delete on thumbnail cleanup.
        await deleteObject(
          ref(storage, removed.record.thumbnailUrl)
        ).catch((error) =>
          console.error('Failed to delete thumbnail', error)
        )
      }
      await deleteDoc(
        doc(
          firestore,
          'projects',
          query.id,
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

  const toggleField = (key) => {
    const index = Object.keys(
      getProjectFieldOptions(t)
    ).indexOf(key)
    let temp = [...field_values]
    temp[index] = !temp[index]
    setFieldValues([...temp])
  }

  if (status == 'success' && signInCheckResult.signedIn) {
    return (
      <>
        <main>
          <div className="bg-card relative z-30 mx-auto mb-24 mt-8 w-11/12 rounded-lg px-4 py-8 text-left shadow-sm md:w-2/3 md:px-12 md:py-12 lg:w-[45%] lg:px-20">
            <h1 className="mb-2 text-center text-3xl font-semibold">
              {t('project_create_edit.update_project')}
            </h1>
            <p className="text-muted-foreground mb-6 text-center">
              {t('project_create_edit.why_update_project')}{' '}
              <span className="italic">
                {form.watch('title')}
              </span>
              .
            </p>
            <form
              noValidate
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FieldGroup>
                <Controller
                  name="title"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid}
                    >
                      <FieldLabel htmlFor="title">
                        {t('project_create_edit.title')}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="title"
                        type="text"
                        aria-label="title"
                        maxLength="100"
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

                <Controller
                  name="start_date"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid}
                    >
                      <FieldLabel htmlFor="start-date">
                        {t(
                          'project_create_edit.start_date'
                        )}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="start-date"
                        type="date"
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

                <Controller
                  name="end_date"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid}
                    >
                      <FieldLabel htmlFor="end-date">
                        {t('project_create_edit.end_date')}
                      </FieldLabel>
                      <Input
                        {...field}
                        id="end-date"
                        type="date"
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

                <Controller
                  name="abstract"
                  control={form.control}
                  render={({ field, fieldState }) => (
                    <Field
                      data-invalid={fieldState.invalid}
                    >
                      <FieldLabel htmlFor="abstract">
                        {t('project_create_edit.summary')}
                      </FieldLabel>
                      <Textarea
                        {...field}
                        id="abstract"
                        rows={5}
                        aria-label="summary"
                        maxLength="1000"
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

                <Field>
                  <FieldLabel htmlFor="member">
                    {t('project_create_edit.add_members')}
                  </FieldLabel>
                  <Input
                    id="member"
                    name="member"
                    value={member}
                    onChange={(e) => onChange(e, 'member')}
                    type="email"
                    aria-label="title"
                    maxLength="100"
                  />
                  {error_member && (
                    <p className="text-sm text-red-800">
                      {error_member}
                    </p>
                  )}
                </Field>
                {members.map((m, index) => (
                  <p className="p-2" key={index}>
                    <button
                      name={index}
                      className="mr-2 h-3 w-3 fill-current hover:text-red-900"
                      onClick={(e) => removeMember(e)}
                    >
                      <svg
                        name={index}
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                      >
                        <path d="M10 8.586L2.929 1.515 1.515 2.929 8.586 10l-7.071 7.071 1.414 1.414L10 11.414l7.071 7.071 1.414-1.414L11.414 10l7.071-7.071-1.414-1.414L10 8.586z" />
                      </svg>
                    </button>
                    {m}
                  </p>
                ))}

                <label className="text-muted-foreground uppercase">
                  {t('project_create_edit.fields')}
                </label>
                {Object.entries(
                  getProjectFieldOptions(t)
                ).map(([key, value], index) => {
                  return (
                    <Field
                      key={key}
                      orientation="horizontal"
                    >
                      <Checkbox
                        id={key}
                        checked={field_values[index]}
                        onCheckedChange={() =>
                          toggleField(key)
                        }
                      />
                      <FieldLabel
                        htmlFor={key}
                        className="text-muted-foreground font-normal"
                      >
                        {value}
                      </FieldLabel>
                    </Field>
                  )
                })}
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
                    <p>
                      {t('project_create_edit.drop_files')}
                    </p>
                  ) : (
                    <p>
                      {t('project_create_edit.drag_files')}
                    </p>
                  )}
                </div>
                <p className="mb-4 text-sm text-red-800">
                  {error_file}
                </p>
                {entries.length === 0 && (
                  <p className="text-sm">
                    {t('project_create_edit.suggest_photo')}
                  </p>
                )}
                {entries.length !== 0 && (
                  <div className="mb-6">
                    {entries.length > 1 && (
                      <p className="mb-2">
                        {t(
                          'project_create_edit.multiple_photos'
                        )}
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
                      {t(
                        'project_create_edit.display_photo'
                      )}
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
                        htmlFor="other_photos"
                        className="text-muted-foreground -mb-3 mt-2 text-left uppercase"
                      >
                        {t(
                          'project_create_edit.other_photo'
                        )}
                      </label>
                      {entries.map((entry, id) => {
                        if (id === 0) return null
                        return (
                          <div
                            className="flex w-full flex-row"
                            key={entry.key}
                          >
                            <button
                              onClick={(e) =>
                                setPhoto(e, id)
                              }
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
                <div className="mt-4 flex w-full justify-end">
                  <Button
                    type="submit"
                    size="lg"
                    className="mr-2 mt-4 w-full"
                    disabled={
                      !form.formState.isValid ||
                      form.formState.isSubmitting ||
                      loading ||
                      error_file
                    }
                  >
                    {t('project_create_edit.update')}
                    {loading && <LoadingSpinner />}
                  </Button>
                  <Link
                    href={`/project/${query.id}`}
                    className="border-border bg-muted text-foreground hover:border-border hover:bg-accent ml-2 mt-4 w-full rounded-lg border-2 p-2 text-center text-lg font-semibold no-underline shadow-sm disabled:opacity-50"
                  >
                    {t('project_create_edit.cancel')}
                  </Link>
                </div>
              </FieldGroup>
            </form>
          </div>
        </main>
      </>
    )
  } else if (status == 'error') {
    return <Error statusCode={404}></Error>
  } else {
    return <div className="h-screen">loading...</div>
  }
}

export async function getServerSideProps({
  locale,
  query,
}) {
  return {
    props: {
      query: query,
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
