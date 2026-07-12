import {
  useState,
  useCallback,
  useEffect,
  useContext,
} from 'react'
import LoadingSpinner from '../../components/LoadingSpinner'

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
  addDoc,
  setDoc,
  doc,
  updateDoc,
} from '@firebase/firestore'
import {
  ref,
  uploadBytes,
  getDownloadURL,
} from '@firebase/storage'

import isEmail from 'validator/lib/isEmail'
import debounce from 'lodash.debounce'
import moment from 'moment'
import { useDropzone } from 'react-dropzone'
import {
  ALLOWED_UPLOAD_MIME_TYPES,
  buildFileRecord,
  getProjectFieldOptions,
  getSafeUploadName,
  isAllowedLink,
} from '../../context/helpers'
import { generatePdfThumbnailBlob } from '../../lib/pdfThumbnail'
import { AppContext } from '../../context/context'
import LinksField from '../../components/LinksField'
import FileUploadField from '../../components/FileUploadField'
import MemberInviteField from '../../components/MemberInviteField'
import AuthCard from '../../components/AuthCard'
import firebaseConfig from '../../firebaseConfig'

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

export default function CreateProject() {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(false)
  const [member, setMember] = useState('')
  const [members, setMembers] = useState([])
  const [field_values, setFieldValues] = useState(
    new Array(
      Object.keys(getProjectFieldOptions(t)).length
    ).fill(false)
  )

  const [files, setFiles] = useState([])
  const [links, setLinks] = useState([])
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
          links: links.filter(isAllowedLink),
          date: moment().toISOString(),
          subscribers: [],
          fields: Object.keys(
            getProjectFieldOptions(t)
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
          `projects/${res.id}/${safeName}`
        )
        await uploadBytes(fileRef, f)
        const downloadURL = await getDownloadURL(fileRef)
        const isPhoto = f.name == project_photo

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
                res.id
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
            res.id,
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

        if (isPhoto) {
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

      if (!ALLOWED_UPLOAD_MIME_TYPES.includes(f.type)) {
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
        title={t('project_create_edit.create_project')}
        subtitle={t(
          'project_create_edit.why_create_project'
        )}
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
              entries={files}
              getFile={(f) => f}
              getKey={(f, index) =>
                `${f.name}_${f.size}_${f.lastModified}_${index}`
              }
              onRemove={removeFile}
              onSetPhoto={setPhoto}
              photoLabel={t(
                'project_create_edit.display_photo'
              )}
              emptyHint={t(
                'project_create_edit.suggest_photo'
              )}
            />

            <Button
              type="submit"
              size="lg"
              className="w-full"
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
      </AuthCard>
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
