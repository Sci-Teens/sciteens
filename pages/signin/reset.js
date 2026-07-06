import { auth } from '../../lib/firebase'
import { useRouter } from 'next/router'
import { sendPasswordResetEmail } from '@firebase/auth'
import isEmail from 'validator/lib/isEmail'
import Head from 'next/head'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'

export default function Reset() {
  const { t } = useTranslation('common')
  const router = useRouter()

  const schema = z.object({
    email: z.string().refine((v) => isEmail(v), {
      message: t('auth.valid_email'),
    }),
  })

  const form = useForm({
    resolver: zodResolver(schema),
    mode: 'onChange',
    defaultValues: { email: '' },
  })

  async function submitForgotPassword({ email }) {
    try {
      await sendPasswordResetEmail(auth, email)
      router.push('/signin/resetsent')
    } catch (e) {
      form.setValue('email', '')
      form.setError('email', {
        type: 'server',
        message: e?.message,
      })
    }
  }

  return (
    <div>
      <Head>
        <title>Reset Password | SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="Reset password on SciTeens"
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, reset password, teen science"
        />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
        <meta property="og:type" content="website" />
      </Head>
      <main className="flex h-screen items-center justify-center">
        <div className="relative z-30 mx-auto mb-24 mt-8 w-11/12 rounded-lg bg-white px-4 py-8 text-left shadow-sm md:w-2/3 md:px-12 md:py-12 lg:w-[45%] lg:px-20">
          <form
            onSubmit={form.handleSubmit(
              submitForgotPassword
            )}
          >
            <h1 className="mb-2 text-center text-3xl font-semibold">
              {t('auth.reset_password')}
            </h1>
            <p className="mb-6 text-center text-gray-700">
              {t('auth.why_reset_password')}
            </p>
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
              <div className="mb-10 mt-2 flex content-end justify-end">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={
                    !form.formState.isValid ||
                    form.formState.isSubmitting
                  }
                >
                  {t('auth.reset_password')}
                </Button>
              </div>
            </FieldGroup>
          </form>
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
