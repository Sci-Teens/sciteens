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
import Head from 'next/head'
import Image from 'next/image'
import Error from 'next/error'
import Link from 'next/link'
import FileGallery from '../../../components/FileGallery'
import { ExternalLink } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'next-i18next'
import dynamic from 'next/dynamic'
import ProfilePhoto from '../../../components/ProfilePhoto'
import { Button } from '@/components/ui/button'
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
      <div className="prose-sm lg:prose mx-auto mb-24 mt-4 animate-pulse">
        <div className="bg-muted h-12 w-full rounded-lg" />
        <div className="bg-muted mt-8 h-8 w-full rounded-lg" />
        <div className="bg-muted mt-8 h-8 w-full rounded-lg" />
        <div className="bg-muted mt-8 h-64 w-full rounded-lg" />
        <div className="bg-muted mt-8 h-8 w-full rounded-lg" />
        <div className="bg-muted mt-8 h-24 w-full rounded-lg" />
      </div>
    )
  } else if (status === 'error' || !project) {
    return <Error statusCode={404} />
  }

  const startDate = formatProjectDate(
    project.start,
    router?.locale
  )

  return (
    <>
      <Head>
        <title>{`${project.title} | SciTeens`}</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content={
            project?.abstract
              ? project.abstract
              : `${project.title} on SciTeens`
          }
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, project, teen science"
        />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
      </Head>
      <article className="prose-sm lg:prose text-foreground mx-auto mt-8 px-4 lg:px-0">
        <div>
          <div className="m-0 flex flex-row justify-between p-0 leading-none">
            <h1>{project.title}</h1>
            {project.member_uids?.includes(
              signInCheckResult?.user?.uid
            ) && (
              <Link
                href={`/project/${router?.query?.id}/edit`}
                className="border-sciteensLightGreen-regular text-sciteensLightGreen-regular hover:border-sciteensLightGreen-dark hover:text-sciteensLightGreen-dark not-prose h-1/3 cursor-pointer rounded-lg border-2 px-6 py-1.5 text-center text-xl font-semibold no-underline shadow-sm"
              >
                Edit
              </Link>
            )}
          </div>
          {project.member_arr?.length > 0 && (
            <div className="not-prose mb-3 flex flex-row items-center">
              <div className="flex -space-x-2 overflow-hidden">
                {project.member_arr.map((member) => {
                  return (
                    <div
                      key={member.uid}
                      className="not-prose inline-block h-6 w-6 rounded-full ring-2 ring-white lg:h-8 lg:w-8"
                    >
                      <ProfilePhoto
                        uid={member.uid}
                      ></ProfilePhoto>
                    </div>
                  )
                })}
              </div>
              <p className="ml-2">
                By&nbsp;
                {project.member_arr.map((member) => {
                  return (
                    <a
                      key={member.uid}
                      href={`/profile/${
                        member.slug || member.uid
                      }`}
                      className="text-sciteensGreen-regular hover:text-sciteensGreen-dark font-bold no-underline"
                    >
                      {member.display + ' '}
                    </a>
                  )
                })}
              </p>
            </div>
          )}
          {startDate && (
            <p className="text-muted-foreground">
              {t('projects.started_on')} {startDate}
            </p>
          )}
          {project.project_photo &&
            !project_photo_error && (
              <div className="bg-muted not-prose relative my-8 aspect-video w-full overflow-hidden rounded-xl">
                <Image
                  src={project.project_photo}
                  alt={project.title}
                  fill
                  sizes="(min-width: 1024px) 768px, 100vw"
                  className="object-contain"
                  onError={() => setProjectPhotoError(true)}
                />
              </div>
            )}
          <p>{project.abstract}</p>
          <div className="not-prose flex flex-row flex-wrap">
            {(project.fields || []).map((tag) => {
              return (
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
                      {getFieldLabel(translatedFields, tag)}
                    </Link>
                  }
                />
              )
            })}
          </div>
          {project.links?.length > 0 && (
            <div className="not-prose mb-2 flex flex-row flex-wrap gap-2">
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
          )}
          <div className="mt-2 border-b-2"></div>
        </div>
      </article>
      <div className="mx-auto mb-4 max-w-prose px-4 lg:px-0">
        {filesStatus === 'success' &&
          fileRecords.length > 0 && (
            <h2 className="mb-2 text-lg font-semibold">
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
