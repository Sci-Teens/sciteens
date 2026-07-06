import { useContext } from 'react'

import Link from 'next/link'
import Head from 'next/head'
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
  resolveRefPath,
} from '../../context/helpers'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

export default function MentorSignIn() {
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
      <Head>
        <title>Educator Sign In | SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Sign in to SciTeens"
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, mentor sign in, teen science"
        />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
        <meta property="og:type" content="website" />
      </Head>
      <main>
        <div className="relative z-30 mx-auto mb-24 mt-8 w-11/12 rounded-lg bg-white px-4 py-8 text-left shadow-sm md:w-2/3 md:px-12 md:py-12 lg:w-[45%] lg:px-20">
          <h1 className="mb-2 text-center text-3xl font-semibold">
            {t('auth.educator_sign_in')}
          </h1>
          <p className="mb-6 text-center text-gray-700">
            {t('auth.why_educator_sign_in')}&nbsp;
            <Link
              href={
                router.query?.ref
                  ? {
                      pathname: '/signin/student',
                      query: {
                        ref: router.query?.ref,
                      },
                    }
                  : '/signin/student'
              }
              className="cursor-pointer font-bold"
            >
              {t('auth.sign_in_here')}
            </Link>
          </p>
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
              <Controller
                name="password"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor="password">
                      {t('auth.password')}
                    </FieldLabel>
                    <Input
                      {...field}
                      id="password"
                      type="password"
                      autoComplete="current-password"
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
              <div className="my-2 flex flex-col justify-between">
                <Link
                  href="/signin/reset"
                  className="mb-2 mr-1 flex-1 rounded-sm py-2 text-sm text-gray-600"
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
          <div className="mt-4 flex justify-center">
            <p className="text-gray-700">
              {t('auth.new_here')}&nbsp;
              <Link
                href={
                  router.query?.ref
                    ? {
                        pathname: '/signup/educator',
                        query: {
                          ref: router.query?.ref,
                        },
                      }
                    : '/signup/educator'
                }
                className="font-bold"
              >
                {t('auth.sign_up')}
              </Link>
            </p>
          </div>
        </div>
      </main>
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
