import { useState, useContext, useEffect } from 'react'
import LoadingSpinner from '../../components/LoadingSpinner'
import isAlpha from 'validator/lib/isAlpha'
import { doc, setDoc } from '@firebase/firestore'
import { updateProfile } from '@firebase/auth'
import { db as firestore } from '../../lib/firebase'
import { useUser } from '../../context/AuthContext'
import { useRouter } from 'next/router'
import moment from 'moment'
import Head from 'next/head'
import Link from 'next/link'
import { AppContext } from '../../context/context'
import { createUniqueSlug } from '../../context/helpers'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import AuthCard from '@/components/AuthCard'
import BirthdayField from '@/components/BirthdayField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

export default function FinishSignUp() {
  const { t } = useTranslation('common')
  const [loading, setLoading] = useState(false)

  const { data: user } = useUser()
  const router = useRouter()

  const { setProfile } = useContext(AppContext)

  const schema = z.object({
    first_name: z.string().superRefine((val, ctx) => {
      const trimmed = val.trim()
      if (!isAlpha(trimmed) || trimmed.length < 1) {
        ctx.addIssue({
          code: 'custom',
          message: t('auth.error_name'),
        })
      } else if (trimmed.split(' ').length > 1) {
        ctx.addIssue({
          code: 'custom',
          message: t('auth.error_first_name'),
        })
      }
    }),
    last_name: z.string().superRefine((val, ctx) => {
      const trimmed = val.trim()
      if (!isAlpha(trimmed) || trimmed.length < 1) {
        ctx.addIssue({
          code: 'custom',
          message: t('auth.error_name'),
        })
      } else if (trimmed.split(' ').length > 1) {
        ctx.addIssue({
          code: 'custom',
          message: t('auth.error_last_name'),
        })
      }
    }),
    birthday: z.string().superRefine((val, ctx) => {
      if (
        moment(val).isAfter(
          moment().subtract(13, 'years')
        ) ||
        val.length < 1
      ) {
        ctx.addIssue({
          code: 'custom',
          message: t('auth.error_birthday'),
        })
      }
    }),
    gender: z.string(),
    race: z.string(),
    terms: z.literal(true, {
      message: t('auth.error_terms'),
    }),
  })

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: {
      first_name: '',
      last_name: '',
      birthday: '',
      gender: 'Male',
      race: 'American Indian or Alaska Native',
      terms: false,
    },
  })

  useEffect(() => {
    if (router.isReady) {
      form.setValue(
        'first_name',
        router?.query?.first_name
          ? router.query.first_name
          : ''
      )
      form.setValue(
        'last_name',
        router?.query?.last_name
          ? router.query.last_name
          : ''
      )
    }
  }, [router])

  async function finishSignUp(values) {
    setLoading(true)
    const first_name = values.first_name.trim()
    const last_name = values.last_name.trim()
    let unique_slug = await createUniqueSlug(
      firestore,
      first_name.toLowerCase() +
        '-' +
        last_name.toLowerCase(),
      'profile-slugs',
      1
    )
    const profile = {
      display: first_name + ' ' + last_name,
      authorized: true, // Only students are authorized upon signup
      slug: unique_slug,
      about: '',
      fields: [],
      programs: [],
      links: [],
      joined: moment().toISOString(),
      birthday: moment(values.birthday).toISOString(),
      institution: '',
      position: '',
      race: values.race,
      gender: values.gender,
      subs_p: [],
      subs_e: [],
      mentor: false,
    }
    profile.uid = user.uid

    try {
      await setDoc(
        doc(firestore, 'profiles', user.uid),
        profile
      )
      await setDoc(
        doc(firestore, 'profile-slugs', unique_slug),
        { slug: unique_slug }
      )
      await setDoc(doc(firestore, 'emails', user.uid), {
        email: user.email,
      })
      await updateProfile(user, {
        displayName: first_name + ' ' + last_name,
      })
      setProfile(profile)
      router.push('/')
    } catch (error) {
      setLoading(false)
      form.setError('first_name', {
        type: 'server',
        message: t('auth.sign_in_failed'),
      })
      console.error(error)
    }
  }

  return (
    <div>
      <Head>
        <title>Finish Sign Up | SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Finish Signing Up to SciTeens"
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, finish sign up, teen science"
        />
        <meta property="og:type" content="website" />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
      </Head>
      <AuthCard
        maxWidth="max-w-lg"
        title={t('auth.finish_signup')}
        subtitle={t('auth.why_finish_signup')}
      >
        <form onSubmit={form.handleSubmit(finishSignUp)}>
          <FieldGroup>
            <div className="flex flex-row gap-2">
              <Controller
                name="first_name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    className="flex-1"
                    data-invalid={fieldState.invalid}
                  >
                    <FieldLabel htmlFor="first_name">
                      {t('auth.first_name')}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="first_name"
                      type="text"
                      maxLength={50}
                      autoComplete="given-name"
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
                name="last_name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    className="flex-1"
                    data-invalid={fieldState.invalid}
                  >
                    <FieldLabel htmlFor="last_name">
                      {t('auth.last_name')}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="last_name"
                      type="text"
                      maxLength={50}
                      autoComplete="family-name"
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

            <BirthdayField control={form.control} />

            <Controller
              name="gender"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="gender">
                    {t('auth.gender')}
                  </FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="gender"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">
                        {t('auth.male')}
                      </SelectItem>
                      <SelectItem value="Female">
                        {t('auth.female')}
                      </SelectItem>
                      <SelectItem value="Other">
                        {t('auth.other')}
                      </SelectItem>
                      <SelectItem value="Prefer not to answer">
                        {t('auth.prefer_not_answer')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <Controller
              name="race"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="race">
                    {t('auth.race')}
                  </FieldLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="race"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="American Indian or Alaska Native">
                        {t('auth.american_indian')}
                      </SelectItem>
                      <SelectItem value="Asian (including Indian subcontinent and Philippines origin)">
                        {t('auth.asian')}
                      </SelectItem>
                      <SelectItem value="Black or African American">
                        {t('auth.black')}
                      </SelectItem>
                      <SelectItem value="Hispanic or Latino">
                        {t('auth.hispanic')}
                      </SelectItem>
                      <SelectItem value="White (including Middle Eastern origin)">
                        {t('auth.white')}
                      </SelectItem>
                      <SelectItem value="Native Hawaiian or Other Pacific Islander">
                        {t('auth.native_hawaiian')}
                      </SelectItem>
                      <SelectItem value="Prefer not to answer">
                        {t('auth.prefer_not_answer')}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <div className="flex flex-col justify-between">
              <Controller
                name="terms"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    orientation="horizontal"
                    data-invalid={fieldState.invalid}
                  >
                    <Checkbox
                      id="terms"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-invalid={fieldState.invalid}
                    />
                    <FieldLabel
                      htmlFor="terms"
                      className="font-normal"
                    >
                      {t('auth.terms')}&nbsp;
                      <Link
                        href="/legal/terms"
                        className="text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark font-semibold"
                      >
                        {t('auth.terms_link')}
                      </Link>
                    </FieldLabel>
                  </Field>
                )}
              />
              <Button
                type="submit"
                size="lg"
                className="mt-4 w-full"
                disabled={
                  loading ||
                  !form.formState.isValid ||
                  form.formState.isSubmitting
                }
              >
                {t('auth.create_account')}
                {loading && <LoadingSpinner />}
              </Button>
            </div>
          </FieldGroup>
        </form>
      </AuthCard>
    </div>
  )
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
