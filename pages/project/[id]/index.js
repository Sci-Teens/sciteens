import {
  collection,
  doc,
  getDoc,
  getFirestore,
  orderBy,
  query as firestoreQuery,
} from 'firebase/firestore'
import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app'
import {
  useFirestoreCollectionData,
  useFirestoreDocData,
} from '../../../lib/firestoreData'
import { useSigninCheck } from '../../../context/AuthContext'
import { db } from '../../../lib/firebase'
import { useRouter } from 'next/router'
import SocialMeta from '../../../components/SocialMeta'
import Image from 'next/image'
import Error from 'next/error'
import Link from 'next/link'
import FileGallery, {
  FileGallerySkeleton,
} from '../../../components/FileGallery'
import { ExternalLink, Pencil } from 'lucide-react'
import ProjectUpvoteButton from '../../../components/ProjectUpvoteButton'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'next-i18next'
import dynamic from 'next/dynamic'
import ProfilePhoto from '../../../components/ProfilePhoto'
import { Button } from '@/components/ui/button'
import HeadingRule from '../../../components/HeadingRule'
import PageHeading from '../../../components/PageHeading'
import {
  DetailLabel,
  DetailMain,
  DetailSection,
} from '../../../components/DetailLayout'
import {
  getTranslatedFieldsDict,
  getFieldLabel,
} from '../../../context/helpers'
import firebaseConfig from '../../../firebaseConfig'
import { normalizeProject } from '../../../lib/projects'
import { formatMediumDate } from '../../../lib/formatDate'
import { INLINE_LINK } from '../../../lib/typography'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

const Discussion = dynamic(
  () => import('../../../components/Discussion'),
  { ssr: false }
)

// A stored link is only ever added through isAllowedLink, but the doc
// is client-written, so a malformed value must degrade to the raw
// string instead of throwing the whole page away at render.
function linkHost(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function Project({ query, initialProject }) {
  const router = useRouter()
  const { t } = useTranslation('common')
  const translatedFields = getTranslatedFieldsDict(t)

  const projectRef = useMemo(
    () => doc(db, 'projects', query.id),
    [query.id]
  )
  const { status, data: liveProject } =
    useFirestoreDocData(projectRef)
  const project = normalizeProject(
    liveProject || initialProject
  )

  const [project_photo_error, setProjectPhotoError] =
    useState(false)

  // Firestore is the source of truth for the photo (create/edit
  // write project_photo there directly, same as ProjectCard); reset
  // any stale error flag whenever the doc hands us a new URL rather
  // than re-deriving the photo from a Storage listing.
  useEffect(() => {
    setProjectPhotoError(false)
  }, [project.project_photo])

  const { status: signInStatus, data: signInCheckResult } =
    useSigninCheck()

  const filesQuery = useMemo(
    () =>
      firestoreQuery(
        collection(db, 'projects', query.id, 'files'),
        orderBy('createdAt', 'asc')
      ),
    [query.id]
  )
  const { status: filesStatus, data: fileRecords } =
    useFirestoreCollectionData(filesQuery, {
      idField: 'id',
    })

  // No loading branch: getServerSideProps either 404s or always hands
  // down `initialProject`, so `project` is populated on first paint and
  // the live doc only ever refines it.
  if (status === 'error' || !project) {
    return <Error statusCode={404} />
  }

  const startDate = formatMediumDate(
    project.start,
    router?.locale
  )

  const members = project.member_arr ?? []
  const isMember = project.member_uids?.includes(
    signInCheckResult?.user?.uid
  )

  return (
    <>
      <SocialMeta
        title={`${project.title} | SciTeens`}
        description={
          project?.abstract
            ? project.abstract
            : `${project.title} on SciTeens`
        }
        eyebrow="Project"
        badge={
          project.fields?.[0]
            ? getFieldLabel(
                translatedFields,
                project.fields[0]
              )
            : undefined
        }
        path={router.asPath}
      />
      <DetailMain className="text-foreground">
        <PageHeading className="wrap-break-word">
          {project.title}
        </PageHeading>
        <HeadingRule />

        <div className="mt-6 flex flex-wrap items-center justify-between gap-x-6 gap-y-4 md:mt-7">
          <div className="flex min-w-0 items-center gap-3">
            {members.length > 0 && (
              <div className="flex shrink-0 -space-x-2">
                {members.map((member) => (
                  <div
                    key={member.uid}
                    className="ring-background inline-block h-8 w-8 rounded-full ring-2"
                  >
                    <ProfilePhoto
                      uid={member.uid}
                      alt={member.display}
                    />
                  </div>
                ))}
              </div>
            )}
            <div className="min-w-0 text-sm">
              {members.length > 0 && (
                <p className="text-pretty">
                  {t('projects.by')}{' '}
                  {members.map((member, index) => (
                    <span key={member.uid}>
                      {index > 0 && ', '}
                      <Link
                        href={`/profile/${
                          member.slug || member.uid
                        }`}
                        className={INLINE_LINK}
                      >
                        {member.display}
                      </Link>
                    </span>
                  ))}
                </p>
              )}
              {startDate && (
                <p className="text-muted-foreground mt-0.5">
                  {t('projects.started_on')} {startDate}
                </p>
              )}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ProjectUpvoteButton
              projectId={query.id}
              count={project.upvote_count}
            />
            {signInStatus === 'success' && isMember && (
              <Button
                render={
                  <Link href={`/project/${query.id}/edit`}>
                    <Pencil
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                    {t('index_profile.edit')}
                  </Link>
                }
                variant="outline"
              />
            )}
          </div>
        </div>

        {project.abstract && (
          <p className="text-muted-foreground text-pretty mt-6 text-base leading-relaxed md:mt-7 md:text-lg">
            {project.abstract}
          </p>
        )}

        {project.project_photo && !project_photo_error && (
          <div className="border-border/60 bg-muted relative mt-8 aspect-video w-full overflow-hidden rounded-xl border">
            <Image
              src={project.project_photo}
              alt={project.title}
              fill
              sizes="(min-width: 768px) 768px, 100vw"
              className="object-contain"
              priority
              onError={() => setProjectPhotoError(true)}
            />
          </div>
        )}

        {project.fields?.length > 0 && (
          <div className="mt-8">
            <DetailLabel>
              {t('projects.topics')}
            </DetailLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.fields.map((tag) => (
                <Link
                  key={tag}
                  href={{
                    pathname: '/projects',
                    query: { field: tag },
                  }}
                  className="border-border/60 bg-card text-foreground hover:bg-muted inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors"
                >
                  {getFieldLabel(translatedFields, tag)}
                </Link>
              ))}
            </div>
          </div>
        )}

        {project.links?.length > 0 && (
          <div className="mt-8">
            <DetailLabel>{t('projects.links')}</DetailLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {project.links.map((link) => (
                <a
                  key={link}
                  href={link}
                  target="_blank"
                  rel="noreferrer noopener"
                  aria-label={t('projects.visit_link', {
                    host: linkHost(link),
                  })}
                  className="border-border/60 bg-card text-foreground hover:bg-muted inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors"
                >
                  <ExternalLink
                    className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  <span className="truncate" translate="no">
                    {linkHost(link)}
                  </span>
                </a>
              ))}
            </div>
          </div>
        )}

        <DetailSection title={t('projects.files')}>
          <div className="mt-4">
            {filesStatus === 'loading' ? (
              <FileGallerySkeleton />
            ) : fileRecords.length > 0 ? (
              <FileGallery
                files={fileRecords.map((record) => ({
                  id: record.id,
                  name: record.name,
                  type: record.contentType,
                  size: record.size,
                  url: record.url,
                  thumbnailUrl: record.thumbnailUrl,
                }))}
              />
            ) : (
              <p className="text-muted-foreground text-sm">
                {t('projects.no_files')}
              </p>
            )}
          </div>
        </DetailSection>

        <DetailSection>
          <Discussion type="projects" item_id={query.id} />
        </DetailSection>
      </DetailMain>
    </>
  )
}

export async function getServerSideProps({
  query,
  locale,
}) {
  const app = getApps().length
    ? getApp()
    : initializeApp(firebaseConfig)
  const firestore = getFirestore(app)
  const projectDoc = await getDoc(
    doc(firestore, 'projects', query.id)
  )

  if (!projectDoc.exists()) {
    return { notFound: true }
  }

  return {
    props: {
      query,
      initialProject: JSON.parse(
        JSON.stringify(normalizeProject(projectDoc.data()))
      ),
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

export default Project
