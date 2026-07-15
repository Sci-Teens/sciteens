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
  orderBy,
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
import LinksField from '../../../components/LinksField'
import FileUploadField from '../../../components/FileUploadField'
import MemberInviteField from '../../../components/MemberInviteField'
import AuthCard from '../../../components/AuthCard'
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  buildFileRecord,
  getProjectFieldOptions,
  getSafeUploadName,
  getUploadStoragePath,
  isAllowedLink,
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
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'

export default function UpdateProject({ query }) {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(false)
  const [member, setMember] = useState('')
  const [members, setMembers] = useState([])
  const [member_uids, setMemberUids] = useState([])

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
            ? projectData.links.filter(isAllowedLink)
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
          links: links.filter(isAllowedLink),
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
          getUploadStoragePath(
            'projects',
            query.id,
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

  // The `emails` collection is intentionally unreadable from the
  // client (firestore.rules: leaking it would make email existence
  // a queryable oracle). The real existence check happens
  // server-side, in functions/index.js#newProjectInvite, when the
  // invite is actually processed via the Admin SDK — an unknown
  // email is just silently skipped there. So here we only format-
  // validate (already done by the isEmail() gate in onChange above)
  // and add to the local list; setMembers uses the updater form so
  // rapid additions never race a stale closure.
  const validateEmail = useCallback(
    debounce((email) => {
      setErrorMember('')
      setMembers((prev) => [...new Set([...prev, email])])
      setMember('')
    }, 500),
    []
  )

  const removeMember = (index) => {
    const temp = [...members]
    temp.splice(index, 1)
    setMembers(temp)
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
      <AuthCard
        maxWidth="max-w-2xl"
        title={t('project_create_edit.update_project')}
        subtitle={
          <>
            {t('project_create_edit.why_update_project')}{' '}
            <span className="italic">
              {form.watch('title')}
            </span>
            .
          </>
        }
      >
        <form
          noValidate
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <FieldGroup>
            <Controller
              name="title"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
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

            <div className="flex flex-col gap-4 sm:flex-row">
              <Controller
                name="start_date"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    className="flex-1"
                    data-invalid={fieldState.invalid}
                  >
                    <FieldLabel htmlFor="start-date">
                      {t('project_create_edit.start_date')}
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
                    className="flex-1"
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
            </div>

            <Controller
              name="abstract"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
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

            <MemberInviteField
              value={member}
              onChange={(e) => onChange(e, 'member')}
              error={error_member}
              members={members}
              onRemoveMember={removeMember}
            />

            <FieldSet>
              <FieldLegend variant="label">
                {t('project_create_edit.fields')}
              </FieldLegend>
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
                {Object.entries(
                  getProjectFieldOptions(t)
                ).map(([key, value], index) => (
                  <Field key={key} orientation="horizontal">
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
                ))}
              </div>
            </FieldSet>

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
              photoLabel={t(
                'project_create_edit.display_photo'
              )}
              emptyHint={t(
                'project_create_edit.suggest_photo'
              )}
            />

            <div className="flex gap-3">
              <Button
                type="submit"
                size="lg"
                className="flex-1"
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
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="flex-1"
                render={
                  <Link href={`/project/${query.id}`} />
                }
              >
                {t('project_create_edit.cancel')}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </AuthCard>
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
