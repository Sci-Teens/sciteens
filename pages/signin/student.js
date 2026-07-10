import { useContext } from 'react'

import Link from 'next/link'
import Image from 'next/image'
import SocialMeta from '../../components/SocialMeta'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { auth, db as firestore } from '../../lib/firebase'
import { doc, getDoc } from '@firebase/firestore'
import { signInWithEmailAndPassword } from '@firebase/auth'

import isEmail from 'validator/lib/isEmail'

import { AppContext } from '../../context/context'
import {
  validatePassword,
  providerSignIn,
  resolveRefPath,
} from '../../context/helpers'

import AuthCard from '@/components/AuthCard'
import PasswordField from '@/components/PasswordField'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from '@/components/ui/field'

export default function StudentSignIn() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { setProfile } = useContext(AppContext)

  const f_signin_errors = {
    'auth/invalid-email': t('auth.auth_invalid_email'),
    'auth/user-disabled': t('auth.auth_user_disabled'),
    'auth/user-not-found': t('auth.auth_user_not_found'),
    'auth/wrong-password': t('auth.auth_wrong_password'),
    'Please verify your email before signing in': t(
      'auth.please_verify'
    ),
  }

  const schema = z.object({
    email: z.string().refine((v) => isEmail(v), {
      message: t('auth.valid_email'),
    }),
    password: z.string().superRefine((val, ctx) => {
      const message = validatePassword(val, t)
      if (message) {
        ctx.addIssue({ code: 'custom', message })
      }
    }),
  })

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { email: '', password: '' },
  })

  async function emailSignIn({ email, password }) {
    try {
      const res = await signInWithEmailAndPassword(
        auth,
        email,
        password
      )
      const prof = await getDoc(
        doc(firestore, 'profiles', res.user.uid)
      )
      setProfile(prof.data())
      const dest = resolveRefPath(router.query.ref)
      router.push(dest || '/')
    } catch (e) {
      console.log(e.code)
      form.setValue('email', '')
      form.setError('email', {
        type: 'server',
        message:
          f_signin_errors[e.code] ||
          t('auth.sign_in_failed'),
      })
    }
  }

  return (
    <div>
      <SocialMeta
        title="Student Sign In | SciTeens"
        description="Sign in to SciTeens to share your work and explore free STEM opportunities."
        eyebrow="Sign In"
        path="/signin/student"
      />
      <AuthCard
        title={t('auth.student_sign_in')}
        subtitle={
          <>
            {t('auth.why_student_sign_in')}&nbsp;
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
              className="cursor-pointer font-bold"
            >
              {t('auth.sign_in_here')}
            </Link>
          </>
        }
      >
        <form onSubmit={form.handleSubmit(emailSignIn)}>
          <FieldGroup>
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
                    id="email"
                    type="email"
                    autoComplete="email"
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
              autoComplete="current-password"
            />
            <div className="flex flex-col justify-between">
              <Link
                href="/signin/reset"
                className="text-muted-foreground mb-2 mr-1 flex-1 rounded-sm py-2 text-sm"
              >
                {t('auth.reset_password')}
              </Link>
              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={
                  !form.formState.isValid ||
                  form.formState.isSubmitting
                }
              >
                {t('auth.sign_in')}
              </Button>
            </div>
          </FieldGroup>
        </form>
        <FieldSeparator className="my-6">
          {t('auth.or')}
        </FieldSeparator>
        <Button
          variant="outline"
          type="button"
          size="lg"
          className="w-full"
          onClick={() =>
            providerSignIn(
              auth,
              firestore,
              router,
              setProfile
            )
          }
        >
          <Image
            src="/assets/logos/Google.png"
            alt="Google Logo"
            width={20}
            height={20}
            className="mr-2 h-5 w-5"
          />
          {t('auth.google_sign_in')}
        </Button>
        <div className="mt-4 flex justify-center">
          <p className="text-muted-foreground">
            {t('auth.new_here')}&nbsp;
            <Link
              href={
                router.query?.ref
                  ? {
                      pathname: '/signup/student',
                      query: {
                        ref: router.query?.ref,
                      },
                    }
                  : '/signup/student'
              }
              className="font-bold"
            >
              {t('auth.sign_up')}
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
