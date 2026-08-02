import {
  useEffect,
  useMemo,
  useState,
  useContext,
} from 'react'

import SocialMeta from '../../../components/SocialMeta'
import Link from 'next/link'
import { useRouter } from 'next/router'
import ProfilePhoto from '../../../components/ProfilePhoto'
import {
  CalendarDays,
  FileText,
  Link2,
  Pencil,
} from 'lucide-react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import {
  getDoc,
  getDocs,
  getFirestore,
  query as firebase_query,
  collection,
  doc,
  where,
  limit,
  orderBy,
} from 'firebase/firestore'
import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app'
import firebaseConfig from '../../../firebaseConfig'
import { db as firestore } from '../../../lib/firebase'

import { useSigninCheck } from '../../../context/AuthContext'
import { AppContext } from '../../../context/context'
import {
  getLinkPlatformLabel,
  isAllowedLink,
  isSafeFileUrl,
} from '../../../context/helpers'
import FileGallery, {
  FileGallerySkeleton,
} from '../../../components/FileGallery'
import ProjectCard from '../../../components/ProjectCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import HeadingRule from '../../../components/HeadingRule'
import PageHeading from '../../../components/PageHeading'
import {
  DetailLabel,
  DetailMain,
  DetailSection,
} from '../../../components/DetailLayout'
import { normalizeProject } from '../../../lib/projects'
import { formatMediumDate } from '../../../lib/formatDate'
import { useFirestoreCollectionData } from '../../../lib/firestoreData'

function Project({ profile }) {
  const { t } = useTranslation('common')
  const router = useRouter()

  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] =
    useState(true)
  const { status, data: signInCheckResult } =
    useSigninCheck()
  const { profile: current_user_profile } =
    useContext(AppContext)

  const filesQuery = useMemo(
    () =>
      firebase_query(
        collection(
          firestore,
          'profiles',
          profile.id,
          'files'
        ),
        orderBy('createdAt', 'asc')
      ),
    [profile.id]
  )
  const { status: filesStatus, data: fileRecords } =
    useFirestoreCollectionData(filesQuery, {
      idField: 'id',
    })

  // Resume is a single-slot file record (isResume: true) — kept out
  // of the gallery below and surfaced as its own CTA instead. The
  // record's `url` is client-written, so it only becomes an href once
  // it checks out as a Storage url.
  const resumeRecord = useMemo(
    () =>
      fileRecords.find(
        (record) =>
          record.isResume && isSafeFileUrl(record.url)
      ) || null,
    [fileRecords]
  )
  const galleryFiles = useMemo(
    () => fileRecords.filter((record) => !record.isResume),
    [fileRecords]
  )
  // Re-validated at render, not just trusted from Firestore — same
  // reasoning as isAllowedLink's other call sites.
  const profileLinks = useMemo(
    () =>
      (Array.isArray(profile.links) ? profile.links : [])
        .filter(isAllowedLink)
        .map((url) => ({
          url,
          label: getLinkPlatformLabel(url),
        })),
    [profile.links]
  )

  useEffect(() => {
    async function loadProfileData() {
      let ps = []
      const projectsCollection = collection(
        firestore,
        'projects'
      )
      const projectsQuery = firebase_query(
        projectsCollection,
        where('member_uids', 'array-contains', profile.id)
      )
      const projectsRef = await getDocs(projectsQuery)
      projectsRef.forEach((p) => {
        ps.push(
          normalizeProject({
            id: p.id,
            ...p.data(),
          })
        )
      })
      setProjects(ps)
      setProjectsLoading(false)
    }

    loadProfileData()
  }, [profile.id])

  const joinedDate = formatMediumDate(
    profile.joined,
    router?.locale
  )
  const isOwnProfile =
    signInCheckResult?.signedIn &&
    current_user_profile?.slug === router.query?.slug

  return (
    <>
      <SocialMeta
        title={`${profile.display}'s Profile | SciTeens`}
        description={
          profile?.about
            ? profile.about
            : `${profile.display}'s Profile on SciTeens`
        }
        eyebrow="Profile"
        path={router.asPath}
      />
      <DetailMain className="text-foreground">
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-5">
          <div className="flex min-w-0 flex-auto items-center gap-4">
            <div className="ring-background size-16 md:size-20 shrink-0 rounded-full shadow-sm ring-4">
              <ProfilePhoto
                uid={profile.id}
                alt={profile.display}
                sizes="(min-width: 768px) 80px, 64px"
              />
            </div>
            <div className="min-w-0">
              <PageHeading className="wrap-break-word lg:text-4xl">
                {profile.display}
              </PageHeading>
              <HeadingRule className="w-28 md:w-40" />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {resumeRecord && (
              <Button
                render={
                  <a
                    href={resumeRecord.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <FileText
                      className="h-4 w-4"
                      aria-hidden="true"
                    />
                    {t('index_profile.view_resume')}
                  </a>
                }
                variant="outline"
              />
            )}
            {status !== 'success' ? (
              <Skeleton className="h-8 w-20 rounded-lg" />
            ) : (
              isOwnProfile && (
                <Button
                  render={
                    <Link
                      href={`/profile/${router?.query?.slug}/edit`}
                    >
                      <Pencil
                        className="h-4 w-4"
                        aria-hidden="true"
                      />
                      {t('index_profile.edit')}
                    </Link>
                  }
                  variant="outline"
                />
              )
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm md:mt-7">
          <Badge variant="secondary">
            {profile.mentor
              ? t('index_profile.educator')
              : t('index_profile.student')}
          </Badge>
          {joinedDate && (
            <p className="text-muted-foreground flex items-center gap-1.5">
              <CalendarDays
                className="h-4 w-4"
                aria-hidden="true"
              />
              {t('index_profile.joined')} {joinedDate}
            </p>
          )}
        </div>

        <p className="text-muted-foreground text-pretty mt-6 text-base leading-relaxed md:mt-7 md:text-lg">
          {profile.about || t('index_profile.about_empty')}
        </p>

        {profileLinks.length > 0 && (
          <div className="mt-8">
            <DetailLabel>
              {t('index_profile.links')}
            </DetailLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {profileLinks.map(({ url, label }) => (
                <a
                  key={url}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={t(
                    'index_profile.visit_platform',
                    { platform: label }
                  )}
                  className="border-border/60 bg-card text-foreground hover:bg-muted inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors"
                >
                  <Link2
                    className="text-muted-foreground h-3.5 w-3.5 shrink-0"
                    aria-hidden="true"
                  />
                  {label}
                </a>
              ))}
            </div>
          </div>
        )}

        <DetailSection title={t('index_profile.projects')}>
          {projectsLoading ? (
            <div className="mt-4 flex flex-col gap-4">
              <Skeleton className="h-28 w-full rounded-xl md:h-44" />
              <Skeleton className="h-28 w-full rounded-xl md:h-44" />
            </div>
          ) : projects.length > 0 ? (
            <ul className="mt-4 flex flex-col gap-4">
              {projects.map((project) => (
                <li key={project.id}>
                  <ProjectCard
                    project={project}
                    showMemberLinks={false}
                  />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground mt-4 text-sm">
              {t('index_profile.projects_empty')}
            </p>
          )}
        </DetailSection>

        <DetailSection title={t('index_profile.files')}>
          <div className="mt-4">
            {filesStatus === 'loading' ? (
              <FileGallerySkeleton />
            ) : galleryFiles.length > 0 ? (
              <FileGallery
                files={galleryFiles.map((record) => ({
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
                {t('index_profile.files_empty')}
              </p>
            )}
          </div>
        </DetailSection>
      </DetailMain>
    </>
  )
}

export async function getServerSideProps({
  query,
  locale,
}) {
  const translations = await serverSideTranslations(
    locale,
    ['common']
  )
  const app =
    getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApp()
  const firestore = getFirestore(app)
  const profilesRef = collection(firestore, 'profiles')
  const profileQuery = firebase_query(
    profilesRef,
    where('slug', '==', query.slug),
    limit(1)
  )
  const profileRes = await getDocs(profileQuery)
  let profile

  profileRes.forEach((p) => {
    if (p.exists()) {
      profile = {
        ...p.data(),
        id: p.id,
      }
    }
  })

  if (!profile) {
    const profileDoc = await getDoc(
      doc(firestore, 'profiles', query.slug)
    )
    if (profileDoc.exists()) {
      profile = {
        ...profileDoc.data(),
        id: profileDoc.id,
      }
    }
  }

  if (!profile) {
    return {
      notFound: true,
    }
  }

  return { props: { profile: profile, ...translations } }
}

export default Project
