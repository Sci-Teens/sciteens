import React, {
  useState,
  useCallback,
  useEffect,
} from 'react'

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
  startAt,
  endAt,
  orderBy,
  limit,
  getDoc,
  getDocs,
  doc,
  updateDoc,
  setDoc,
} from '@firebase/firestore'
import {
  listAll,
  ref,
  getDownloadURL,
  getMetadata,
  uploadBytes,
  updateMetadata,
  deleteObject,
} from '@firebase/storage'

import moment from 'moment'
import isEmail from 'validator/lib/isEmail'
import debounce from 'lodash.debounce'
import { useDropzone } from 'react-dropzone'
import File from '../../../components/File'
import {
  getTranslatedFieldsDict,
  sanitizeFileName,
} from '../../../context/helpers'

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
      Object.keys(getTranslatedFieldsDict(t)).length
    ).fill(false)
  )
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
  const [project_photo, setProjectPhoto] = useState(null)

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

  useEffect(async () => {
    setFiles([])
    const projectRef = doc(firestore, 'projects', query.id)
    const filesRef = ref(storage, `projects/${query.id}`)

    // Find all the prefixes and items.
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
      let temp_fields = new Array(
        Object.keys(getTranslatedFieldsDict(t)).length
      ).fill(false)
      for (
        let i = 0;
        i < Object.keys(getTranslatedFieldsDict(t)).length;
        i++
      ) {
        if (
          projectData.fields.includes(
            Object.keys(getTranslatedFieldsDict(t))[i]
          )
        ) {
          temp_fields[i] = true
        }
      }
      setFieldValues(temp_fields)

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
          }
        }
        xhr.open('GET', url)
        xhr.send()
      }
    } catch (e) {
      console.error(e)
      router.push(`/project/${query.id}`)
    }
  }, [])

  useEffect(() => {
    metadata_arr.map((file, index) => {
      if (file.customMetadata?.project_photo) {
        setPhoto(undefined, index)
      }
    })
  }, [files, metadata_arr])

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
          links: [],
          date: moment().toISOString(),
          fields: Object.keys(
            getTranslatedFieldsDict(t)
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
      for (const f of files) {
        if (f) {
          const fileRef = ref(
            storage,
            `projects/${query.id}/${sanitizeFileName(
              f.name
            )}`
          )
          await uploadBytes(fileRef, f)
          if (f.name == project_photo) {
            await updateMetadata(fileRef, {
              customMetadata: {
                project_photo: 'true',
              },
            })
            const downloadURL = await getDownloadURL(
              fileRef
            )
            await updateDoc(
              doc(firestore, 'projects', query.id),
              {
                project_photo: downloadURL,
              }
            )
          }
        }
      }

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

      if (
        !(
          file_extensions.includes(f?.type) ||
          f?.name.includes('.docx') ||
          f?.name.includes('.pptx')
        )
      ) {
        setErrorFile(
          t('project_create_edit.file_format_not_accepted')
        )
      } else if (f.size > 8000000) {
        setErrorFile(
          t('project_create_edit.file_too_large')
        )
      } else {
        reader.readAsDataURL(f)
        setFiles((old_files) => [
          ...new Set([...old_files, f]),
        ])
      }
    }
  })

  const { getRootProps, getInputProps, isDragActive } =
    useDropzone({ onDrop })

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
        const q = query(
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
    let temp_files = [...files]
    let temp_metadata = [...metadata_arr]
    const removed_file = temp_files.splice(id, 1)
    const removed_metadata = temp_metadata.splice(id, 1)
    setFiles([...temp_files])
    setMetadata([...temp_metadata])
    if (removed_file[0]?.name == project_photo) {
      setProjectPhoto(null)
    }

    const removed_file_ref = ref(
      storage,
      removed_metadata[0].fullPath
    )
    await deleteObject(removed_file_ref)
  }

  const setPhoto = (e, id) => {
    e?.preventDefault()
    let temp_files = files
    let new_project_photo = files[id]
    temp_files[id] = temp_files[0]
    temp_files[0] = new_project_photo
    setProjectPhoto(new_project_photo?.name)
    setFiles(temp_files)
    setMode(false)
  }

  const toggleField = (key) => {
    const index = Object.keys(
      getTranslatedFieldsDict(t)
    ).indexOf(key)
    let temp = [...field_values]
    temp[index] = !temp[index]
    setFieldValues([...temp])
  }

  if (status == 'success' && signInCheckResult.signedIn) {
    return (
      <>
        <main>
          <div className="relative z-30 mx-auto mb-24 mt-8 w-11/12 rounded-lg bg-white px-4 py-8 text-left shadow-sm md:w-2/3 md:px-12 md:py-12 lg:w-[45%] lg:px-20">
            <h1 className="mb-2 text-center text-3xl font-semibold">
              {t('project_create_edit.update_project')}
            </h1>
            <p className="mb-6 text-center text-gray-700">
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

                <label className="uppercase text-gray-600">
                  {t('project_create_edit.fields')}
                </label>
                {Object.entries(
                  getTranslatedFieldsDict(t)
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
                        className="font-normal text-gray-700"
                      >
                        {value}
                      </FieldLabel>
                    </Field>
                  )
                })}
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
                {files.length == 0 ||
                  (!files[0] && (
                    <p className="text-sm">
                      {t(
                        'project_create_edit.suggest_photo'
                      )}
                    </p>
                  ))}
                {files.length != 0 && files[0] && (
                  <div className="mb-6">
                    {files.length > 1 && (
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
                      className="mt-2 uppercase text-gray-600"
                    >
                      {t(
                        'project_create_edit.display_photo'
                      )}
                    </label>
                    <File
                      file={files[0]}
                      id={files[0]?.id}
                      removeFile={removeFile}
                      setPhoto={setPhoto}
                    ></File>
                  </div>
                )}
                <div className="flex flex-col space-y-3">
                  {files.length > 1 && (
                    <>
                      <label
                        htmlFor="other_photos"
                        className="-mb-3 mt-2 text-left uppercase text-gray-600"
                      >
                        {t(
                          'project_create_edit.other_photo'
                        )}
                      </label>
                      {files.map((f, id) => {
                        if (
                          (project_photo != '' &&
                            f?.name != project_photo) ||
                          id > 0
                        )
                          return (
                            f && (
                              <div className="flex w-full flex-row">
                                <button
                                  onClick={(e) =>
                                    setPhoto(e, id)
                                  }
                                  className={`border-sciteensLightGreen-regular text-sciteensLightGreen-regular hover:border-sciteensLightGreen-dark hover:text-sciteensLightGreen-dark rounded-lg border-2 font-semibold transition-all duration-500 hover:bg-gray-50 ${
                                    select_photo_mode
                                      ? 'mr-4 w-28'
                                      : 'w-0 overflow-hidden border-none'
                                  }`}
                                >
                                  Select
                                </button>
                                <File
                                  file={f}
                                  id={id}
                                  key={f.id}
                                  removeFile={removeFile}
                                  setPhoto={setPhoto}
                                ></File>
                              </div>
                            )
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
                    {loading && (
                      <img
                        src="/assets/loading.svg"
                        alt="Loading Spinner"
                        className="inline-block h-5 w-5"
                      />
                    )}
                  </Button>
                  <Link
                    href={`/project/${query.id}`}
                    className="ml-2 mt-4 w-full rounded-lg border-2 border-gray-200 bg-gray-100 p-2 text-center text-lg font-semibold text-black shadow-sm hover:border-gray-300 hover:bg-gray-200 disabled:opacity-50"
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
