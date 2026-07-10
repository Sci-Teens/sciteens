import { useState } from 'react'
import Image from 'next/image'
import { Image as ImageIcon } from 'lucide-react'
import { useTranslation } from 'next-i18next'
import { Card, CardContent } from '@/components/ui/card'

import {
  getTranslatedFieldsDict,
  getFieldLabel,
} from '../context/helpers'
import { normalizeProject } from '../lib/projects'
import ProfilePhoto from './ProfilePhoto'

function getProfileHref(member) {
  if (member?.slug) {
    return `/profile/${member.slug}`
  }
  if (member?.uid) {
    return `/profile/${member.uid}`
  }
  return null
}

function fieldLimit(fields) {
  const longFields = [
    'mechanical engineering',
    'electrical engineering',
    'environmental science',
    'fall 2022 science fair',
  ]

  return fields
    .slice(0, 3)
    .some((field) =>
      longFields.includes(field.toLowerCase())
    )
    ? 2
    : 3
}

export default function ProjectCard({
  project,
  date,
  showMemberLinks = true,
}) {
  const { t } = useTranslation('common')
  const [photoError, setPhotoError] = useState(false)
  const normalizedProject = normalizeProject(project)
  const fields = Array.isArray(normalizedProject?.fields)
    ? normalizedProject.fields
    : []
  const members = Array.isArray(
    normalizedProject?.member_arr
  )
    ? normalizedProject.member_arr
    : []
  const visibleFieldCount = fieldLimit(fields)
  const translatedFields = getTranslatedFieldsDict(t)
  const hasPhoto =
    Boolean(normalizedProject?.project_photo) && !photoError

  return (
    <Card className="animate-in border-border/60 fade-in slide-in-from-right-8 relative isolate overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-md">
      <a
        href={`/project/${normalizedProject.id}`}
        aria-label={normalizedProject.title}
        className="focus-visible:ring-3 focus-visible:ring-ring/50 absolute inset-0 z-10 rounded-xl"
      />
      <CardContent className="flex items-center">
        <div className="bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-lg md:h-40 md:w-40">
          {hasPhoto ? (
            <Image
              src={normalizedProject.project_photo}
              alt={normalizedProject.title}
              fill
              sizes="(min-width: 768px) 160px, 96px"
              className="object-cover"
              onError={() => setPhotoError(true)}
            />
          ) : (
            <div className="text-muted-foreground/50 flex h-full w-full items-center justify-center">
              <ImageIcon
                strokeWidth={1.5}
                aria-hidden="true"
                className="h-8 w-8 md:h-12 md:w-12"
              />
            </div>
          )}
        </div>
        <div className="ml-4 min-w-0 flex-1">
          {(members.length > 0 || date) && (
            <div className="text-muted-foreground mb-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 text-sm">
              {members.length > 0 && (
                <>
                  <div className="flex -space-x-2 overflow-hidden">
                    {members.map((member, index) => (
                      <div
                        key={member.uid || index}
                        className="ring-background inline-block h-6 w-6 rounded-full ring-2 lg:h-8 lg:w-8"
                      >
                        <ProfilePhoto uid={member.uid} />
                      </div>
                    ))}
                  </div>
                  <p className="min-w-0">
                    By&nbsp;
                    {members.map((member) => {
                      const href = getProfileHref(member)
                      const label = `${
                        member.display || ''
                      } `

                      if (showMemberLinks && href) {
                        return (
                          <a
                            key={
                              member.uid || member.display
                            }
                            href={href}
                            className="text-sciteensGreen-regular hover:text-sciteensGreen-dark relative z-20 font-bold no-underline"
                          >
                            {label}
                          </a>
                        )
                      }

                      return (
                        <span
                          key={member.uid || member.display}
                        >
                          {label}
                        </span>
                      )
                    })}
                  </p>
                </>
              )}
              {date && (
                <div
                  className={
                    members.length > 0
                      ? 'col-start-2'
                      : 'col-span-2'
                  }
                >
                  {date}
                </div>
              )}
            </div>
          )}
          <h3 className="line-clamp-2 mb-2 text-base font-semibold md:text-xl lg:text-2xl">
            {normalizedProject.title}
          </h3>
          {normalizedProject.abstract && (
            <p className="line-clamp-none text-muted-foreground md:line-clamp-2 lg:line-clamp-3 mb-4 hidden md:block">
              {normalizedProject.abstract}
            </p>
          )}
          {fields.length > 0 && (
            <div className="hidden flex-row lg:flex">
              {fields
                .slice(0, visibleFieldCount)
                .map((field) => (
                  <p
                    key={field}
                    className="bg-muted z-30 mb-2 mr-2 whitespace-nowrap rounded-full px-3 py-1.5 text-xs shadow-sm"
                  >
                    {getFieldLabel(translatedFields, field)}
                  </p>
                ))}
              {fields.length >= 3 && (
                <p className="text-muted-foreground mt-1.5 hidden whitespace-nowrap text-xs lg:flex">
                  + {fields.length - visibleFieldCount} more
                  field
                  {fields.length - visibleFieldCount === 1
                    ? ''
                    : 's'}
                </p>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
