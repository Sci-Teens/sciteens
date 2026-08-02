import { useState, useContext, useEffect } from 'react'
import LoadingSpinner from '../../components/LoadingSpinner'
import isAlpha from 'validator/lib/isAlpha'
import { doc, setDoc } from '@firebase/firestore'
import { updateProfile } from '@firebase/auth'
import { db as firestore } from '../../lib/firebase'
import { useUser } from '../../context/AuthContext'
import { useRouter } from 'next/router'
import moment from 'moment'
import SocialMeta from '../../components/SocialMeta'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
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
import { INLINE_LINK } from '@/lib/typography'

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
      institution: '',
      position: '',
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
      // race/gender/birthday are PII; kept off the public profiles
      // doc (see firestore.rules#profiles-private).
      await setDoc(
        doc(firestore, 'profiles-private', user.uid),
        {
          race: values.race,
          gender: values.gender,
          birthday: moment(values.birthday).toISOString(),
        }
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
      <SocialMeta
        title="Finish Sign Up | SciTeens"
        description="Finish setting up your SciTeens account."
        eyebrow="Sign Up"
        path="/signup/finish"
      />
      <AuthCard
        maxWidth="max-w-lg"
        title={t('auth.finish_signup')}
        subtitle={t('auth.why_finish_signup')}
      >
        <form onSubmit={form.handleSubmit(finishSignUp)}>
          <FieldGroup>
            <div className="grid gap-x-3 gap-y-5 sm:grid-cols-2">
              <Controller
                name="first_name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
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
                  <Field data-invalid={fieldState.invalid}>
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

            <Controller
              name="terms"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field
                  orientation="horizontal"
                  className="items-start"
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
                    className="block font-normal"
                  >
                    {t('auth.terms')}&nbsp;
                    <Link
                      href="/legal/terms"
                      className={INLINE_LINK}
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
              className="h-11 w-full text-base"
              disabled={
                loading ||
                !form.formState.isValid ||
                form.formState.isSubmitting
              }
            >
              {t('auth.create_account')}
              {loading ? (
                <LoadingSpinner />
              ) : (
                <ArrowRight
                  aria-hidden="true"
                  className="group-hover/button:translate-x-0.5 transition-transform"
                />
              )}
            </Button>
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
