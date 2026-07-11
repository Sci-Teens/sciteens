import { useState } from 'react'
import { X } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldLabel } from '@/components/ui/field'
import {
  isAllowedProjectLink,
  MAX_PROJECT_LINKS,
} from '../context/helpers'

// Controlled list of allowlisted outbound links for a project. `links`/
// `setLinks` are owned by the parent form (create/edit) so they submit
// alongside the rest of the fields; every add is re-validated against
// isAllowedProjectLink even though the input has type="url" — HTML
// validation doesn't check the host.
export default function LinksField({ links, setLinks }) {
  const { t } = useTranslation('common')
  const [value, setValue] = useState('')
  const [error, setError] = useState('')

  const addLink = (e) => {
    e.preventDefault()
    const url = value.trim()
    if (!url) return
    if (links.length >= MAX_PROJECT_LINKS) {
      setError(t('project_create_edit.links_too_many'))
      return
    }
    if (!isAllowedProjectLink(url)) {
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
    <Field>
      <FieldLabel htmlFor="project-link">
        {t('project_create_edit.links')}
      </FieldLabel>
      <p className="text-muted-foreground text-sm">
        {t('project_create_edit.links_hint')}
      </p>
      <div className="flex gap-2">
        <Input
          id="project-link"
          type="url"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError('')
          }}
          placeholder="https://github.com/..."
          aria-label={t('project_create_edit.links')}
        />
        <Button type="button" onClick={addLink}>
          {t('project_create_edit.links_add')}
        </Button>
      </div>
      {error && (
        <p className="text-sm text-red-800">{error}</p>
      )}
      {links.length > 0 && (
        <ul className="mt-2 flex flex-col space-y-2">
          {links.map((link, index) => (
            <li
              key={link}
              className="bg-muted flex items-center justify-between rounded-lg px-3 py-2"
            >
              <a
                href={link}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sciteensGreen-regular hover:text-sciteensGreen-dark line-clamp-1 break-all"
              >
                {link}
              </a>
              <button
                type="button"
                aria-label={t(
                  'project_create_edit.links_remove'
                )}
                className="ml-2 shrink-0 text-red-600"
                onClick={(e) => removeLink(e, index)}
              >
                <X className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Field>
  )
}
