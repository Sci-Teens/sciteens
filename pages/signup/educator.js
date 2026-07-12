import { useState, useEffect } from 'react'
import LoadingSpinner from '../../components/LoadingSpinner'
import { useContext } from 'react'

import Link from 'next/link'
import SocialMeta from '../../components/SocialMeta'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { auth, db as firestore } from '../../lib/firebase'
import { doc, setDoc } from '@firebase/firestore'
import {
  createUserWithEmailAndPassword,
  RecaptchaVerifier,
} from '@firebase/auth'

import isAlpha from 'validator/lib/isAlpha'
import isEmail from 'validator/lib/isEmail'
import moment from 'moment'

import { AppContext } from '../../context/context'
import {
  validatePassword,
  createUniqueSlug,
  resolveRefPath,
} from '../../context/helpers'

import AuthCard from '@/components/AuthCard'
import PasswordField from '@/components/PasswordField'
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

export default function MentorSignUp() {
  const { t } = useTranslation('common')
  const f_signup_errors = {
    'auth/invalid-email': t('auth.auth_invalid_email'),
    'auth/email-already-in-use': t(
      'auth.auth_email_in_use'
    ),
    'auth/weak-password': t('auth.auth_weak_password'),
    'Please verify your email before signing in': t(
      'auth.please_verify'
    ),
  }

  const [loading, setLoading] = useState(false)
  const [recaptchaSolved, setRecaptchaSolved] =
    useState(false)

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
          message: 'auth.error_first_name',
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
    email: z.string().refine((v) => isEmail(v), {
      message: t('auth.valid_email'),
    }),
    password: z.string().superRefine((val, ctx) => {
      const message = validatePassword(val, t)
      if (message) {
        ctx.addIssue({ code: 'custom', message })
      }
    }),
    institution: z.string().superRefine((val, ctx) => {
      const trimmed = val.trim()
      if (!isAlpha(trimmed) || trimmed.length < 1) {
        ctx.addIssue({
          code: 'custom',
          message: t('auth.valid_institution'),
        })
      }
    }),
    position: z.string(),
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
      email: '',
      password: '',
      institution: '',
      position: 'Educator',
      gender: 'Male',
      race: 'American Indian or Alaska Native',
      terms: false,
    },
  })

  useEffect(() => {
    async function setupRecaptcha() {
      if (
        typeof window !== 'undefined' &&
        !document
          .getElementById('recaptcha-container')
          .hasChildNodes()
      ) {
        const recaptchaVerifier = new RecaptchaVerifier(
          auth,
          'recaptcha-container',
          {
            size: 'normal',
            callback: () => {
              setRecaptchaSolved(true)
            },
            'expired-callback': () => {
              setRecaptchaSolved(false)
            },
          }
        )
        await recaptchaVerifier.render()
        const verified = await recaptchaVerifier.verify()
        if (verified.length) {
          setRecaptchaSolved(true)
        }
      }
    }
    setupRecaptcha()
  }, [])

  async function emailSignUp(values) {
    setLoading(true)
    const first_name = values.first_name.trim()
    const last_name = values.last_name.trim()
    const institution = values.institution.trim()
    try {
      const res = await createUserWithEmailAndPassword(
        auth,
        values.email,
        values.password
      )
      const unique_slug = await createUniqueSlug(
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
        institution: institution,
        position: values.position,
        subs_p: [],
        subs_e: [],
        mentor: true,
      }
      profile.uid = res.user.uid
      await setDoc(
        doc(firestore, 'profiles', res.user.uid),
        profile
      )
      // race/gender are PII; kept off the public profiles doc (see
      // firestore.rules#profiles-private). Educators don't collect a
      // birthday.
      await setDoc(
        doc(firestore, 'profiles-private', res.user.uid),
        {
          race: values.race,
          gender: values.gender,
          birthday: '',
        }
      )
      await setDoc(
        doc(firestore, 'profile-slugs', unique_slug),
        { slug: unique_slug }
      )
      await setDoc(doc(firestore, 'emails', res.user.uid), {
        email: res.user.email,
      })
      setProfile(profile)
      const dest = resolveRefPath(router.query.ref)
      router.push(dest || '/')
    } catch (e) {
      console.log(e.code)
      form.setValue('email', '')
      form.setError('email', {
        type: 'server',
        message:
          f_signup_errors[e.code] ||
          t('auth.sign_in_failed'),
      })
      setLoading(false)
    }
  }

  return (
    <div>
      <SocialMeta
        title="Educator Sign Up | SciTeens"
        description="Sign up as an educator to mentor students and support their STEM journey on SciTeens."
        eyebrow="Sign Up"
        path="/signup/educator"
      />
      <AuthCard
        maxWidth="max-w-lg"
        title={t('auth.educate_on_sciteens')}
        subtitle={t('auth.why_educate_on_sciteens')}
      >
        <p className="text-destructive mb-6 text-center text-sm font-semibold">
          We currently aren&apos;t accepting new educator
          signups.
        </p>

        <form onSubmit={form.handleSubmit(emailSignUp)}>
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
                      disabled
                      id="first_name"
                      type="text"
                      maxLength={50}
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
                      disabled
                      id="last_name"
                      type="text"
                      maxLength={50}
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
              name="email"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="email">
                    {t('auth.email')}
                  </FieldLabel>
                  <Input
                    {...field}
                    disabled
                    id="email"
                    type="email"
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

            <PasswordField
              control={form.control}
              disabled
            />

            <Controller
              name="institution"
              control={form.control}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="institution">
                    {t('auth.institution')}
                  </FieldLabel>
                  <Input
                    {...field}
                    disabled
                    id="institution"
                    type="text"
                    maxLength={50}
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
              name="position"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="position">
                    {t('auth.position')}
                  </FieldLabel>
                  <Select
                    disabled
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <SelectTrigger
                      id="position"
                      className="w-full"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Educator">
                        {t('auth.educator')}
                      </SelectItem>
                      <SelectItem value="Professional">
                        {t('auth.professional')}
                      </SelectItem>
                      <SelectItem value="Researcher">
                        {t('auth.researcher')}
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
              name="gender"
              control={form.control}
              render={({ field }) => (
                <Field>
                  <FieldLabel htmlFor="gender">
                    {t('auth.gender')}
                  </FieldLabel>
                  <Select
                    disabled
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
                    disabled
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

            <div
              id="recaptcha-container"
              className="flex w-full justify-center"
            ></div>

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
              className="w-full"
              disabled={
                true ||
                !form.formState.isValid ||
                form.formState.isSubmitting ||
                loading ||
                !recaptchaSolved
              }
            >
              {t('auth.create_account')}
              {loading && <LoadingSpinner />}
            </Button>
          </FieldGroup>
        </form>
        <div className="mt-4 flex justify-center">
          <p className="text-muted-foreground">
            {t('auth.have_account')}&nbsp;
            <Link
              href={
                router.query?.ref
                  ? {
                      pathname: '/signin/educator',
                      query: {
                        ref: router.query?.ref,
                      },
                    }
                  : '/signin/educator'
              }
              className="font-bold"
            >
              {t('auth.sign_in_link')}
            </Link>
          </p>
        </div>
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
