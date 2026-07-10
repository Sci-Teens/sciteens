import { useState } from 'react'
import { Controller } from 'react-hook-form'
import { useTranslation } from 'next-i18next'
import { Eye, EyeOff } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'

// Shared password field for the auth forms: a masked input with a
// show/hide toggle (reduces mistyped-password sign-up abandonment)
// wired to react-hook-form.
export default function PasswordField({
  control,
  name = 'password',
  label,
  autoComplete = 'current-password',
  disabled = false,
}) {
  const { t } = useTranslation('common')
  const [visible, setVisible] = useState(false)

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>
            {label ?? t('auth.password')}
          </FieldLabel>
          <div className="relative">
            <Input
              {...field}
              id={name}
              type={visible ? 'text' : 'password'}
              autoComplete={autoComplete}
              disabled={disabled}
              aria-invalid={fieldState.invalid}
              className="pr-9"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={disabled}
              onClick={() => setVisible((v) => !v)}
              aria-label={
                visible
                  ? t('auth.hide_password')
                  : t('auth.show_password')
              }
              className="text-muted-foreground hover:text-foreground absolute right-0.5 top-1/2 -translate-y-1/2"
            >
              {visible ? (
                <EyeOff className="size-4" />
              ) : (
                <Eye className="size-4" />
              )}
            </Button>
          </div>
          {fieldState.invalid && (
            <FieldError errors={[fieldState.error]} />
          )}
        </Field>
      )}
    />
  )
}
