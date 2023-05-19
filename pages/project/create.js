import {
  useState,
  useCallback,
  useEffect,
  useContext,
} from 'react'

import Head from 'next/head'
import Error from 'next/error'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import {
  useFirestore,
  useSigninCheck,
  useStorage,
} from 'reactfire'
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
import { useTransition, animated } from '@react-spring/web'
import { getTranslatedFieldsDict } from '../../context/helpers'
import { AppContext } from '../../context/context'
import File from '../../components/File'

export default function CreateProject() {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [start_date, setStartDate] = useState('')
  const [end_date, setEndDate] = useState('')
  const [abstract, setAbstract] = useState('')
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

  const [error_title, setErrorTitle] = useState('')
  const [error_start_date, setErrorStartDate] = useState('')
  const [error_end_date, setErrorEndDate] = useState('')
  const [error_abstract, setErrorAbstract] = useState('')
  const [error_member, setErrorMember] = useState('')
  const [error_file, setErrorFile] = useState('')

  const { profile } = useContext(AppContext)
  const { status, data: signInCheckResult } =
    useSigninCheck()
  const firestore = useFirestore()
  const storage = useStorage()

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

  const createProject = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await addDoc(
        collection(firestore, 'projects'),
        {
          title: title.trim(),
          start: start_date
            ? moment(start_date).toISOString()
            : moment().toISOString(),
          end: end_date
            ? moment(end_date).toISOString()
            : '',
          abstract: abstract.trim(),
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
          title: title.trim(),
        }
      )
      for (const f of files) {
        const fileRef = ref(
          storage,
          `projects/${res.id}/${f.name}`
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
      setErrorTitle(
        t('project_create_edit.could_not_create')
      )
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
        console.log(f)
        setFiles((oldfiles) => [
          ...new Set([...oldfiles, f]),
        ])
      }
    }
  })

  const {
    acceptedFiles,
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({ onDrop })

  async function onChange(e, target) {
    switch (target) {
      case 'title':
        setTitle(e.target.value)
        if (e.target.value.trim() == '') {
          setErrorTitle(
            t('project_create_edit.error_title')
          )
        } else {
          setErrorTitle('')
        }
        break

      case 'start_date':
        console.log(e.target.value)
        setStartDate(e.target.value)
        if (e.target.value == '') {
          setErrorStartDate(
            t('project_create_edit.error_start_date')
          )
        } else {
          setErrorStartDate('')
        }
        break

      case 'end_date':
        setEndDate(e.target.value)
        if (e.target.value == '') {
          setErrorEndDate(
            t('project_create_edit.error_end_date')
          )
        } else if (
          start_date != '' &&
          start_date >= e.target.value
        ) {
          setErrorEndDate(
            t('project_create_edit.error_dates')
          )
        } else {
          setErrorEndDate('')
        }
        break

      case 'abstract':
        setAbstract(e.target.value)
        if (e.target.value == '') {
          setErrorAbstract(
            t('project_create_edit.error_abstract')
          )
        } else {
          setErrorAbstract('')
        }
        break

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

      case 'fields':
        const id = e.target.id
        const index = Object.keys(
          getTranslatedFieldsDict(t)
        ).indexOf(id)
        let temp = [...field_values]
        temp[index] = !temp[index]
        setFieldValues([...temp])
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
        console.log(res)
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

  if (status == 'success' && signInCheckResult.signedIn) {
    return (
      <>
        <Head></Head>
        <main>
          <div className="relative z-30 mx-auto mt-8 mb-24 w-11/12 rounded-lg bg-white px-4 py-8 text-left shadow md:w-2/3 md:px-12 md:py-12 lg:w-[45%] lg:px-20">
            <h1 className="mb-2 text-center text-3xl font-semibold">
              {t('project_create_edit.create_project')}
            </h1>
            <p className="mb-6 text-center text-gray-700">
              {t('project_create_edit.why_create_project')}
            </p>
            <form onSubmit={(e) => createProject(e)}>
              <label
                for="title"
                className="uppercase text-gray-600"
              >
                {t('project_create_edit.title')}
              </label>
              <input
                onChange={(e) => onChange(e, 'title')}
                value={title}
                name="title"
                required
                className={`focus:outline-none mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight ${error_title
                    ? 'border-red-700 text-red-800 placeholder-red-700'
                    : 'text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white'
                  }`}
                type="text"
                aria-label="title"
                maxLength="100"
              />
              <p className="mb-4 text-sm text-red-800">
                {error_title}
              </p>

              <label
                for="start-date"
                className="uppercase text-gray-600"
              >
                {t('project_create_edit.start_date')}
              </label>
              <input
                required
                onChange={(e) => onChange(e, 'start_date')}
                value={start_date}
                type="date"
                id="start-date"
                name="start-date"
                placeholder="Not Required..."
                className={`focus:outline-none mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight ${error_start_date
                    ? 'border-red-700 text-red-800 placeholder-red-700'
                    : 'text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white'
                  }`}
              />
              <p
                className={`mb-4 text-sm ${error_start_date
                    ? 'text-red-800'
                    : 'text-gray-700'
                  }`}
              >
                {error_start_date}
              </p>

              <label
                for="end-date"
                className="uppercase text-gray-600"
              >
                {t('project_create_edit.end_date')}
              </label>
              <input
                required
                onChange={(e) => onChange(e, 'end_date')}
                value={end_date}
                type="date"
                id="end-date"
                name="end-date"
                placeholder="Not Required..."
                className={`focus:outline-none mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight ${error_end_date
                    ? 'border-red-700 text-red-800 placeholder-red-700'
                    : 'text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white'
                  }`}
              />
              <p
                className={`mb-4 text-sm ${error_end_date
                    ? 'text-red-800'
                    : 'text-gray-700'
                  }`}
              >
                {error_end_date}
              </p>

              <label
                for="abstract"
                className="uppercase text-gray-600"
              >
                {t('project_create_edit.summary')}
              </label>
              <textarea
                onChange={(e) => onChange(e, 'abstract')}
                value={abstract}
                name="abstract"
                required
                className={`focus:outline-none mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight ${error_abstract
                    ? 'border-red-700 text-red-800 placeholder-red-700'
                    : 'text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white'
                  }`}
                type="textarea"
                aria-label="summary"
                maxLength="1000"
              />
              <p className="mb-4 text-sm text-red-800">
                {error_abstract}
              </p>

              <label
                for="member"
                className="uppercase text-gray-600"
              >
                {t('project_create_edit.add_members')}
              </label>
              <input
                onChange={(e) => onChange(e, 'member')}
                value={member}
                name="member"
                required
                className={`focus:outline-none mr-3 w-full appearance-none rounded-lg border-2 border-transparent bg-gray-100 p-2 leading-tight ${error_member
                    ? 'border-red-700 text-red-800 placeholder-red-700'
                    : 'text-gray-700 placeholder-sciteensGreen-regular focus:border-sciteensLightGreen-regular focus:bg-white'
                  }`}
                type="email"
                aria-label="title"
                maxLength="100"
              />
              <p className="mb-4 text-sm text-red-800">
                {error_member}
              </p>
              {members.map((m, index) => (
                <p className="p-2">
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

              <label
                for="fields"
                className="uppercase text-gray-600"
              >
                {t('project_create_edit.fields')}
              </label>

              {Object.entries(
                getTranslatedFieldsDict(t)
              ).map(([key, value], index) => {
                return (
                  <div>
                    <input
                      id={key}
                      className="form-checkbox active:outline-none mr-2 text-sciteensLightGreen-regular"
                      type="checkbox"
                      value={field_values[index]}
                      checked={field_values[index]}
                      onChange={(e) =>
                        onChange(e, 'fields')
                      }
                    />
                    <label
                      for={key}
                      className="text-gray-700"
                    >
                      {value}
                      <br />
                    </label>
                  </div>
                )
              })}
              <div className="mb-4"></div>
              <div
                {...getRootProps()}
                className={`h-40 w-full border-2 ${error_file
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
                        onClick={() =>
                          setMode(!select_photo_mode)
                        }
                        className="cursor-pointer font-semibold text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark"
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
                    {t('project_create_edit.display_photo')}
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
                      className="mt-2 -mb-3 text-left uppercase text-gray-600"
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
                          <div className="flex w-full flex-row">
                            <button
                              onClick={(e) =>
                                setPhoto(e, id)
                              }
                              className={`rounded-lg border-2 border-sciteensLightGreen-regular font-semibold text-sciteensLightGreen-regular transition-all duration-500 hover:border-sciteensLightGreen-dark hover:bg-gray-50 hover:text-sciteensLightGreen-dark ${select_photo_mode
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
              <button
                type="submit"
                disabled={
                  loading ||
                  error_abstract ||
                  !abstract ||
                  error_start_date ||
                  error_end_date ||
                  error_file ||
                  error_title ||
                  !title
                }
                className="outline-none mt-4 w-full rounded-lg bg-sciteensLightGreen-regular p-2 text-lg font-semibold text-white shadow hover:bg-sciteensLightGreen-dark disabled:opacity-50"
                onClick={(e) => createProject(e)}
              >
                {t('project_create_edit.create')}
                {loading && (
                  <img
                    src="/assets/loading.svg"
                    alt="Loading Spinner"
                    className="ml-2 inline-block h-5 w-5"
                  />
                )}
              </button>
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
