import {
  useState,
  useCallback,
  useEffect,
  useContext,
} from 'react'
import LoadingSpinner from '../../components/LoadingSpinner'

import Head from 'next/head'
import Error from 'next/error'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import {
  db as firestore,
  storage,
} from '../../lib/firebase'
import { useSigninCheck } from '../../context/AuthContext'
import {
  collection,
  query,
  startAt,
  endAt,
  orderBy,
  limit,
  getDocs,
  addDoc,
  setDoc,
  doc,
  updateDoc,
} from '@firebase/firestore'
import {
  ref,
  uploadBytes,
  updateMetadata,
  getDownloadURL,
} from '@firebase/storage'

import isEmail from 'validator/lib/isEmail'
import debounce from 'lodash.debounce'
import moment from 'moment'
import { useDropzone } from 'react-dropzone'
import {
  getTranslatedFieldsDict,
  sanitizeFileName,
} from '../../context/helpers'
import { AppContext } from '../../context/context'
import File from '../../components/File'

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

export default function CreateProject() {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(false)
  const [member, setMember] = useState('')
  const [members, setMembers] = useState([])
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
  const [project_photo, setProjectPhoto] = useState('')
  const [error_member, setErrorMember] = useState('')
  const [error_file, setErrorFile] = useState('')

  const { profile } = useContext(AppContext)
  const { status, data: signInCheckResult } =
    useSigninCheck()

  const router = useRouter()

  useEffect(() => {
    if (
      status == 'success' &&
      !signInCheckResult?.signedIn
    ) {
      router.push({
        pathname: '/signin/student',
        query: { ref: 'project|create' },
      })
    }
  })

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

  const onSubmit = async (values) => {
    setLoading(true)
    try {
      const res = await addDoc(
        collection(firestore, 'projects'),
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
          subscribers: [],
          fields: Object.keys(
            getTranslatedFieldsDict(t)
          ).filter((item, i) => field_values[i]),
          member_uids: [signInCheckResult.user.uid],
          member_arr: [
            {
              display: signInCheckResult.user.displayName,
              slug: profile.slug,
              uid: signInCheckResult.user.uid,
            },
          ],
        }
      )
      await setDoc(
        doc(firestore, 'project-invites', res.id),
        {
          emails: members,
          title: values.title.trim(),
        }
      )
      for (const f of files) {
        const safeName = sanitizeFileName(f.name)
        const fileRef = ref(
          storage,
          `projects/${res.id}/${safeName}`
        )
        await uploadBytes(fileRef, f)
        if (f.name == project_photo) {
          await updateMetadata(fileRef, {
            customMetadata: {
              project_photo: 'true',
            },
          })
          const downloadURL = await getDownloadURL(fileRef)
          await updateDoc(res, {
            project_photo: downloadURL,
          })
        }
      }
      router.push(`/project/${res.id}`)
      setLoading(false)
    } catch (error) {
      form.setError('title', {
        message: t('project_create_edit.could_not_create'),
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
          file_extensions.includes(f.type) ||
          f.name.includes('.docx') ||
          f.name.includes('.pptx')
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
        setFiles((oldfiles) => [
          ...new Set([...oldfiles, f]),
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

  const removeFile = (e, id) => {
    e.preventDefault()
    let temp = [...files]
    temp.splice(id, 1)
    setFiles([...temp])
  }

  const setPhoto = (e, id) => {
    e?.preventDefault()
    let temp_files = files
    let new_project_photo = files[id]
    temp_files[id] = temp_files[0]
    temp_files[0] = new_project_photo
    setProjectPhoto(new_project_photo.name)
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
        <Head></Head>
        <main>
          <div className="relative z-30 mx-auto mb-24 mt-8 w-11/12 rounded-lg bg-white px-4 py-8 text-left shadow-sm md:w-2/3 md:px-12 md:py-12 lg:w-[45%] lg:px-20">
            <h1 className="mb-2 text-center text-3xl font-semibold">
              {t('project_create_edit.create_project')}
            </h1>
            <p className="mb-6 text-center text-gray-700">
              {t('project_create_edit.why_create_project')}
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
                        placeholder="Not Required..."
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
                        placeholder="Not Required..."
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
                  <p key={index} className="p-2">
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
                {files.length == 0 && (
                  <p className="text-sm">
                    {t('project_create_edit.suggest_photo')}
                  </p>
                )}
                {files.length != 0 && (
                  <div className="mb-6">
                    {files.length > 1 && (
                      <p className="mb-2">
                        {t(
                          'project_create_edit.multiple_photos'
                        )}{' '}
                        <span
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (
                              e.key === 'Enter' ||
                              e.key === ' '
                            ) {
                              e.preventDefault()
                              setMode(!select_photo_mode)
                            }
                          }}
                          onClick={() =>
                            setMode(!select_photo_mode)
                          }
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
                      id={files[0].id}
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
                        Other Photo
                        {files.length > 1 ? 's' : ''}
                      </label>
                      {files.map((f, id) => {
                        if (
                          (project_photo != '' &&
                            f.name != project_photo) ||
                          id > 0
                        )
                          return (
                            <div
                              key={f.id}
                              className="flex w-full flex-row"
                            >
                              <button
                                onClick={(e) =>
                                  setPhoto(e, id)
                                }
                                className={`border-sciteensLightGreen-regular text-sciteensLightGreen-regular hover:border-sciteensLightGreen-dark hover:text-sciteensLightGreen-dark rounded-lg border-2 font-semibold transition-all duration-500 hover:bg-gray-50 ${
                                  select_photo_mode
                                    ? 'mr-4 px-3'
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
                      })}
                    </>
                  )}
                </div>
                <Button
                  type="submit"
                  size="lg"
                  className="mt-4 w-full"
                  disabled={
                    !form.formState.isValid ||
                    form.formState.isSubmitting ||
                    loading ||
                    error_file
                  }
                >
                  {t('project_create_edit.create')}
                  {loading && (
                    <LoadingSpinner className="ml-2" />
                  )}
                </Button>
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

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
