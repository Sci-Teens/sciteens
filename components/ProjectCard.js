import { Fragment, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useTranslation } from 'next-i18next'
import { Card, CardContent } from '@/components/ui/card'

import {
  getTranslatedFieldsDict,
  getFieldLabel,
} from '../context/helpers'
import { normalizeProject } from '../lib/projects'
import { getDefaultProjectImage } from '../lib/defaultProjectImage'
import { splitHighlightedText } from '../lib/search'
import ProfilePhoto from './ProfilePhoto'
import ProjectUpvoteButton from './ProjectUpvoteButton'

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

// Renders a Meilisearch `_formatted` value as text plus <mark>s. Projects
// that didn't come from a search hit have no highlight, so this falls back
// to the plain value and the card looks exactly as it always has.
function Highlighted({ highlighted, plain }) {
  const segments = splitHighlightedText(highlighted)
  if (segments.length === 0) return plain
  return segments.map((segment, index) =>
    segment.match ? (
      <mark
        key={index}
        className="bg-sciteensLightGreen-regular/25 text-foreground rounded-sm px-0.5"
      >
        {segment.text}
      </mark>
    ) : (
      <Fragment key={index}>{segment.text}</Fragment>
    )
  )
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
  // `highlight.abstract` is derived from the same indexed field, so it is
  // never present when the plain abstract is empty.
  const hasAbstract = Boolean(normalizedProject.abstract)
  // normalizeProject defaults an absent title to '', which would ship
  // the overlay link with no accessible name at all.
  const cardLabel =
    normalizedProject.title || t('projects.untitled')

  return (
    <Card className="border-border/60 hover:border-border hover:bg-muted/40 relative isolate overflow-hidden transition-colors">
      {/* Inset outline: Card is `overflow-hidden`, so the global
          `outline-offset: 2px` focus ring paints outside the clip box
          and disappears entirely. */}
      <Link
        href={`/project/${encodeURIComponent(
          normalizedProject.id
        )}`}
        aria-label={cardLabel}
        className="focus-visible:outline-ring focus-visible:-outline-offset-2 absolute inset-0 z-10 rounded-xl focus-visible:outline-2"
      />
      <div className="absolute right-2 top-2 z-20">
        <ProjectUpvoteButton
          projectId={normalizedProject.id}
          count={normalizedProject.upvote_count}
          size="sm"
        />
      </div>
      <CardContent className="flex items-start gap-4">
        <div className="bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-lg md:h-36 md:w-36">
          {hasPhoto ? (
            <Image
              src={normalizedProject.project_photo}
              alt={normalizedProject.title}
              fill
              sizes="(min-width: 768px) 144px, 96px"
              className="object-cover"
              onError={() => setPhotoError(true)}
            />
          ) : (
            <Image
              src={getDefaultProjectImage(
                normalizedProject.id
              )}
              alt=""
              fill
              unoptimized
              className="object-cover"
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {(members.length > 0 || date) && (
            <div className="text-muted-foreground mb-2 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1 pr-16 text-sm">
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
          <h2 className="line-clamp-2 text-pretty text-base font-semibold md:text-lg lg:text-xl">
            <Highlighted
              highlighted={
                normalizedProject.highlight?.title
              }
              plain={normalizedProject.title}
            />
          </h2>
          {hasAbstract && (
            <p className="text-muted-foreground md:line-clamp-2 max-md:hidden mt-1.5 max-w-[68ch] text-sm leading-relaxed">
              <Highlighted
                highlighted={
                  normalizedProject.highlight?.abstract
                }
                plain={normalizedProject.abstract}
              />
            </p>
          )}
          {fields.length > 0 && (
            <div className="mt-3 hidden flex-row flex-wrap items-center gap-2 lg:flex">
              {fields
                .slice(0, visibleFieldCount)
                .map((field) => (
                  <span
                    key={field}
                    className="bg-muted text-foreground whitespace-nowrap rounded-full px-3 py-1 text-xs"
                  >
                    {getFieldLabel(translatedFields, field)}
                  </span>
                ))}
              {fields.length > visibleFieldCount && (
                <span className="text-muted-foreground whitespace-nowrap text-xs">
                  {t('projects.more_fields', {
                    count:
                      fields.length - visibleFieldCount,
                  })}
                </span>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
