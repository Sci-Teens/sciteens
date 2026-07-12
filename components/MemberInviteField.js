import { X } from 'lucide-react'
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
        maxLength={100}
        aria-invalid={!!error}
      />
      {error && <FieldError>{error}</FieldError>}
      {members.length > 0 && (
        <ul className="flex flex-col gap-1.5">
          {members.map((m, index) => (
            <li
              key={m}
              className="text-muted-foreground flex items-center gap-1.5 text-sm"
            >
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
              {m}
            </li>
          ))}
        </ul>
      )}
    </Field>
  )
}
