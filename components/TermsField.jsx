import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { Controller } from 'react-hook-form'

import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { INLINE_LINK } from '@/lib/typography'

export default function TermsField({ control }) {
  const { t } = useTranslation('common')

  return (
    <Controller
      name="terms"
      control={control}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <div className="flex items-start gap-2">
            <Checkbox
              render={<span ref={field.ref} />}
              id="terms"
              name={field.name}
              required
              checked={field.value}
              onCheckedChange={field.onChange}
              onBlur={field.onBlur}
              aria-invalid={fieldState.invalid}
              aria-describedby={
                fieldState.invalid
                  ? 'terms-error'
                  : undefined
              }
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
          </div>
          {fieldState.invalid && (
            <FieldError
              id="terms-error"
              errors={[fieldState.error]}
            />
          )}
        </Field>
      )}
    />
  )
}
