import { Mail, X } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'

// Add-by-email member invite list for the project create/edit forms
// — mirrors LinksField's "add a chip, remove a chip" shape so both
// list-building fields on the form look and behave the same way.
export default function MemberInviteField({
  value,
  onChange,
  error,
  members,
  onRemoveMember,
}) {
  const { t } = useTranslation('common')

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="member">
        {t('project_create_edit.add_members')}
      </FieldLabel>
      <Input
        id="member"
        name="member"
        value={value}
        onChange={onChange}
        type="email"
        inputMode="email"
        autoComplete="email"
        spellCheck={false}
        maxLength={100}
        placeholder={t(
          'project_create_edit.member_placeholder'
        )}
        aria-invalid={!!error}
      />
      {error && <FieldError>{error}</FieldError>}
      {members.length > 0 && (
        <ul className="mt-1 flex flex-col gap-2">
          {members.map((m, index) => (
            <li
              key={m}
              className="border-border/60 bg-muted/50 flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5"
            >
              <span className="text-muted-foreground flex min-w-0 items-center gap-1.5 text-sm">
                <Mail
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">{m}</span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t(
                  'project_create_edit.remove_member'
                )}
                onClick={() => onRemoveMember(index)}
              >
                <X className="text-destructive h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  )
}
