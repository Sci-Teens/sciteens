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
import FileGallery from '../../../components/FileGallery'
import { ExternalLink, Pencil } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'next-i18next'
import dynamic from 'next/dynamic'
import ProfilePhoto from '../../../components/ProfilePhoto'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  getTranslatedFieldsDict,
  getFieldLabel,
} from '../../../context/helpers'
import firebaseConfig from '../../../firebaseConfig'
import {
  normalizeProject,
  formatProjectDate,
} from '../../../lib/projects'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

const Discussion = dynamic(
  () => import('../../../components/Discussion'),
  { ssr: false }
)

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

  // const { profile } = useContext(AppContext)

  const { data: signInCheckResult } = useSigninCheck()

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

  if (status === 'loading' && !project) {
    return (
      <div className="mx-auto mt-12 w-5/6 animate-pulse px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        <div className="bg-muted h-40 w-full rounded-xl" />
        <div className="bg-muted mt-12 h-24 w-full rounded-xl" />
        <div className="bg-muted mt-12 h-24 w-full rounded-xl" />
      </div>
    )
  } else if (status === 'error' || !project) {
    return <Error statusCode={404} />
  }

  const startDate = formatProjectDate(
    project.start,
    router?.locale
  )

  const hasTopicsOrLinks =
    project.fields?.length > 0 || project.links?.length > 0

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
      <div className="text-foreground mx-auto mt-12 w-5/6 px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        <Card className="border-border/60 overflow-hidden">
          <CardContent className="flex flex-col gap-4 p-6 md:p-8">
            <div className="flex flex-row items-start justify-between gap-4">
              <h1 className="text-2xl font-semibold md:text-3xl">
                {project.title}
              </h1>
              {project.member_uids?.includes(
                signInCheckResult?.user?.uid
              ) && (
                <Button
                  render={
                    <Link
                      href={`/project/${router?.query?.id}/edit`}
                    >
                      <Pencil
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      {t('index_profile.edit')}
                    </Link>
                  }
                  variant="outline"
                  className="shrink-0"
                />
              )}
            </div>
            {project.member_arr?.length > 0 && (
              <div className="flex flex-row items-center">
                <div className="flex -space-x-2 overflow-hidden">
                  {project.member_arr.map((member) => {
                    return (
                      <div
                        key={member.uid}
                        className="ring-background inline-block h-6 w-6 rounded-full ring-2 lg:h-8 lg:w-8"
                      >
                        <ProfilePhoto
                          uid={member.uid}
                        ></ProfilePhoto>
                      </div>
                    )
                  })}
                </div>
                <p className="ml-2 text-sm">
                  {t('projects.by')}&nbsp;
                  {project.member_arr.map((member) => {
                    return (
                      <a
                        key={member.uid}
                        href={`/profile/${
                          member.slug || member.uid
                        }`}
                        className="text-sciteensGreen-regular hover:text-sciteensGreen-dark font-bold"
                      >
                        {member.display + ' '}
                      </a>
                    )
                  })}
                </p>
              </div>
            )}
            {startDate && (
              <p className="text-muted-foreground text-sm">
                {t('projects.started_on')} {startDate}
              </p>
            )}
            {project.project_photo &&
              !project_photo_error && (
                <div className="bg-muted relative aspect-video w-full overflow-hidden rounded-xl">
                  <Image
                    src={project.project_photo}
                    alt={project.title}
                    fill
                    sizes="(min-width: 1024px) 768px, 100vw"
                    className="object-contain"
                    onError={() =>
                      setProjectPhotoError(true)
                    }
                  />
                </div>
              )}
          </CardContent>
        </Card>
      </div>

      <div className="mx-auto mt-12 w-5/6 px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        <Separator />
      </div>

      {/* Abstract */}
      <div className="mx-auto mb-4 mt-8 w-5/6 px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        <h2 className="mb-2 text-lg font-semibold md:text-2xl">
          {t('project_create_edit.summary')}
        </h2>
        <Card className="border-border/60">
          <CardContent>
            <p className="text-muted-foreground">
              {project.abstract}
            </p>
          </CardContent>
        </Card>
      </div>

      {hasTopicsOrLinks && (
        <>
          <div className="mx-auto mt-12 w-5/6 px-4 md:w-2/3 lg:w-1/2 lg:px-0">
            <Separator />
          </div>
          <div className="mx-auto mb-4 mt-8 w-5/6 px-4 md:w-2/3 lg:w-1/2 lg:px-0">
            {project.fields?.length > 0 && (
              <>
                <h2 className="mb-2 text-lg font-semibold md:text-2xl">
                  {t('projects.topics')}
                </h2>
                <div className="mb-4 flex flex-row flex-wrap">
                  {project.fields.map((tag) => (
                    <Button
                      key={tag}
                      variant="secondary"
                      className="bg-card ring-border/60 my-1 mr-4 rounded-full px-5 py-1.5 text-base shadow-sm ring-1 hover:shadow-md"
                      render={
                        <Link
                          href={{
                            pathname: '/projects',
                            query: { field: tag },
                          }}
                        >
                          {getFieldLabel(
                            translatedFields,
                            tag
                          )}
                        </Link>
                      }
                    />
                  ))}
                </div>
              </>
            )}
            {project.links?.length > 0 && (
              <>
                <h2 className="mb-2 text-lg font-semibold md:text-2xl">
                  {t('project_create_edit.links')}
                </h2>
                <div className="flex flex-row flex-wrap gap-2">
                  {project.links.map((link) => (
                    <a
                      key={link}
                      href={link}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="border-border/60 bg-card ring-border/60 text-foreground flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium shadow-sm ring-1 hover:shadow-md"
                    >
                      <ExternalLink className="h-4 w-4" />
                      {new URL(link).hostname.replace(
                        /^www\./,
                        ''
                      )}
                    </a>
                  ))}
                </div>
              </>
            )}
          </div>
        </>
      )}

      <div className="mx-auto mt-12 w-5/6 px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        <Separator />
      </div>

      {/* Files */}
      <div className="mx-auto mb-4 mt-8 w-5/6 px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        {filesStatus === 'success' &&
          fileRecords.length > 0 && (
            <h2 className="mb-2 text-lg font-semibold md:text-2xl">
              {t('course.files')}
            </h2>
          )}
        {filesStatus !== 'loading' && (
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
        )}
      </div>

      <div className="mx-auto mt-12 w-5/6 px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        <Separator />
      </div>

      {/* Discussion */}
      <div className="mx-auto mb-4 mt-8 w-5/6 px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        <Discussion type="projects" item_id={query.id} />
      </div>
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
