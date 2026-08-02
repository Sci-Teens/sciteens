import { auth } from '../../lib/firebase'
import { useRouter } from 'next/router'
import { sendPasswordResetEmail } from '@firebase/auth'
import isEmail from 'validator/lib/isEmail'
import { ArrowRight } from 'lucide-react'
import LoadingSpinner from '../../components/LoadingSpinner'
import SocialMeta from '../../components/SocialMeta'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import AuthCard from '@/components/AuthCard'
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
      <SocialMeta
        title="Reset Password | SciTeens"
        description="Reset your SciTeens password."
        eyebrow="Sign In"
        path="/signin/reset"
      />
      <AuthCard
        title={t('auth.reset_password')}
        subtitle={t('auth.why_reset_password')}
      >
        <form
          onSubmit={form.handleSubmit(submitForgotPassword)}
        >
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
                    inputMode="email"
                    autoComplete="email"
                    spellCheck={false}
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
            <Button
              type="submit"
              size="lg"
              className="h-11 w-full text-base"
              disabled={
                !form.formState.isValid ||
                form.formState.isSubmitting
              }
            >
              {t('auth.reset_password')}
              {form.formState.isSubmitting ? (
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
