import { useState } from 'react'
import { ExternalLink, X } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from '@/components/ui/field'
import { INLINE_LINK } from '../lib/typography'
import {
  isAllowedLink,
  MAX_LINKS,
} from '../context/helpers'

// Controlled list of allowlisted outbound links for a project or
// profile. `links`/`setLinks` are owned by the parent form
// (create/edit) so they submit alongside the rest of the fields;
// every add is re-validated against isAllowedLink even though the
// input has type="url" — HTML validation doesn't check the host.
export default function LinksField({ links, setLinks }) {
  const { t } = useTranslation('common')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const addLink = (e) => {
    e.preventDefault()
    const url = value.trim()
    if (!url) return
    if (links.length >= MAX_LINKS) {
      setError(t('project_create_edit.links_too_many'))
      return
    }
    if (!isAllowedLink(url)) {
      setError(t('project_create_edit.links_not_allowed'))
      return
    }
    if (!links.includes(url)) {
      setLinks([...links, url])
    }
    setValue('')
    setError('')
  }

  const removeLink = (e, index) => {
    e.preventDefault()
    setLinks(links.filter((_, i) => i !== index))
  }

  return (
    <Field data-invalid={!!error}>
      <FieldLabel htmlFor="project-link">
        {t('project_create_edit.links')}
      </FieldLabel>
      <FieldDescription>
        {t('project_create_edit.links_hint')}
      </FieldDescription>
      <div className="flex gap-2">
        <Input
          id="project-link"
          type="url"
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError('')
          }}
          onKeyDown={(e) => {
            // Enter here means "add this link", not "submit the
            // project". Only claim the key when there is something to
            // add, so an empty box still submits like every other
            // input on the form.
            if (
              e.key === 'Enter' &&
              !e.nativeEvent.isComposing &&
              value.trim()
            ) {
              addLink(e)
            }
          }}
          placeholder="https://github.com/…"
          aria-invalid={!!error}
        />
        <Button
          type="button"
          variant="outline"
          onClick={addLink}
          disabled={!value.trim()}
        >
          {t('project_create_edit.links_add')}
        </Button>
      </div>
      {error && <FieldError>{error}</FieldError>}
      {links.length > 0 && (
        <ul className="mt-1 flex flex-col gap-2">
          {links.map((link, index) => (
            <li
              key={link}
              className="border-border/60 bg-muted/50 flex items-center justify-between gap-2 rounded-lg border px-3 py-1.5"
            >
              <a
                href={link}
                target="_blank"
                rel="noreferrer noopener"
                className={`${INLINE_LINK} flex min-w-0 items-center gap-1.5 text-sm`}
              >
                <ExternalLink
                  className="h-3.5 w-3.5 shrink-0"
                  aria-hidden="true"
                />
                <span className="truncate">{link}</span>
              </a>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label={t(
                  'project_create_edit.links_remove'
                )}
                onClick={(e) => removeLink(e, index)}
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
