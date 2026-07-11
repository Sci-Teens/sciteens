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
import { CalendarDays, Pencil } from 'lucide-react'
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

import moment from 'moment'
import { useSigninCheck } from '../../../context/AuthContext'
import { AppContext } from '../../../context/context'
import FileGallery from '../../../components/FileGallery'
import ProjectCard from '../../../components/ProjectCard'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '../../../components/ui/skeleton'
import { normalizeProject } from '../../../lib/projects'
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

  useEffect(() => {}, [status])

  const projectsComponent = projects.map((project) => (
    <div key={project.id} className="mt-6 md:mt-8">
      <ProjectCard
        project={project}
        showMemberLinks={false}
      />
    </div>
  ))

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
      <div className="text-foreground mx-auto mt-12 w-full px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        <Card className="animate-in border-border/60 fade-in slide-in-from-bottom-4 overflow-hidden duration-300">
          <CardContent className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center md:p-8">
            <div className="ring-background size-20 md:size-28 shrink-0 self-start rounded-full shadow-sm ring-4 sm:self-center">
              <ProfilePhoto
                uid={profile.id}
                alt={profile.display}
                sizes="(min-width: 768px) 112px, 80px"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="text-2xl font-semibold md:text-3xl">
                  {profile.display}
                </h1>
                <Badge variant="secondary">
                  {profile.mentor
                    ? t('index_profile.educator')
                    : t('index_profile.student')}
                </Badge>
              </div>
              <p className="text-muted-foreground mt-2 flex items-center gap-1.5 text-sm">
                <CalendarDays
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                {t('index_profile.joined')}{' '}
                {moment(profile.joined).calendar(null, {
                  sameElse: 'MMMM DD, YYYY',
                })}
              </p>
            </div>
            {status !== 'success' ? (
              <Skeleton className="h-8 w-24 shrink-0 self-start rounded-lg sm:self-center" />
            ) : (
              signInCheckResult.signedIn &&
              current_user_profile?.slug ===
                router.query?.slug && (
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
                  className="shrink-0 self-start sm:self-center"
                />
              )
            )}
          </CardContent>
          {profile.about && (
            <>
              <Separator />
              <CardContent className="p-6 md:p-8">
                <p className="text-muted-foreground">
                  {profile.about}
                </p>
              </CardContent>
            </>
          )}
        </Card>
      </div>

      <div className="mx-auto mt-12 w-full px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        <Separator />
      </div>

      {/* Projects */}
      <div className="mx-auto mb-4 mt-8 w-full px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        <h2 className="mb-2 text-lg font-semibold md:text-2xl">
          {t('index_profile.projects')}
        </h2>
        {projectsLoading ? (
          <div className="flex flex-col gap-6 md:gap-8">
            <Skeleton className="h-24 w-full md:h-40" />
            <Skeleton className="h-24 w-full md:h-40" />
          </div>
        ) : projects?.length != 0 ? (
          projectsComponent
        ) : (
          <p className="text-muted-foreground">
            {t('index_profile.projects_empty')}
          </p>
        )}
      </div>

      <div className="mx-auto mt-12 w-full px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        <Separator />
      </div>

      {/* Files */}
      <div className="mx-auto mb-4 mt-8 w-full px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        {(filesStatus === 'loading' ||
          fileRecords.length > 0) && (
          <h2 className="mb-2 text-lg font-semibold md:text-2xl">
            {t('index_profile.files')}
          </h2>
        )}
        <div className="flex flex-col items-center space-y-2">
          {filesStatus === 'loading' ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : (
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
      </div>
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
