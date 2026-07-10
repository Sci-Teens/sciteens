import { useEffect, useState, useContext } from 'react'

import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import ProfilePhoto from '../../../components/ProfilePhoto'
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
} from 'firebase/firestore'
import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app'
import firebaseConfig from '../../../firebaseConfig'
import {
  listAll,
  ref,
  getDownloadURL,
  getMetadata,
} from '@firebase/storage'
import {
  db as firestore,
  storage,
} from '../../../lib/firebase'

import moment from 'moment'
import { useSigninCheck } from '../../../context/AuthContext'
import { AppContext } from '../../../context/context'
import File from '../../../components/File'
import ProjectCard from '../../../components/ProjectCard'
import { Skeleton } from '../../../components/ui/skeleton'
import { normalizeProject } from '../../../lib/projects'

function Project({ profile }) {
  const { t } = useTranslation('common')
  const router = useRouter()

  const [files, setFiles] = useState([])
  const [filesLoading, setFilesLoading] = useState(true)
  const [projects, setProjects] = useState([])
  const [projectsLoading, setProjectsLoading] =
    useState(true)
  const { status, data: signInCheckResult } =
    useSigninCheck()
  const { profile: current_user_profile } =
    useContext(AppContext)

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

      const filesRef = ref(
        storage,
        `profiles/${profile.id}`
      )
      try {
        const res = await listAll(filesRef)
        const fetchFileBlob = async (r) => {
          const url = await getDownloadURL(r)
          const metadata = await getMetadata(r)
          return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest()
            xhr.responseType = 'blob'
            xhr.onload = () => {
              if (xhr.status == 200) {
                const blob = xhr.response
                blob.name = metadata.name
                resolve(blob)
              } else {
                reject(
                  new Error(
                    `Failed to fetch file: ${xhr.status}`
                  )
                )
              }
            }
            xhr.onerror = () =>
              reject(
                new Error('Network error fetching file')
              )
            xhr.open('GET', url)
            xhr.send()
          })
        }
        const results = await Promise.allSettled(
          res.items.map(fetchFileBlob)
        )
        setFiles(
          results
            .filter((r) => r.status === 'fulfilled')
            .map((r) => r.value)
        )
      } catch (e) {
        console.error(e)
      } finally {
        setFilesLoading(false)
      }
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
      <Head>
        <title>{`${profile.display}'s Profile | SciTeens`}</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content={
            profile?.about
              ? profile.about
              : `${profile.display}'s Profile on SciTeens`
          }
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, profile, teen science"
        />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
        <meta property="og:type" content="website" />
        <meta
          property="og:title"
          content={`${profile.display}'s Profile | SciTeens`}
        />
        <meta
          property="og:description"
          content="Check out "
        />
      </Head>
      <div className="text-foreground mx-auto mt-12 w-5/6 px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        <div>
          <div className="m-0 flex flex-row justify-between p-0 leading-none">
            <div className="mb-8 flex flex-row items-center">
              <div className="h-18 w-18 mr-5">
                <ProfilePhoto
                  uid={profile.id}
                ></ProfilePhoto>
              </div>
              <div>
                <h1 className="text-3xl">
                  {profile.display}
                </h1>
                <p className="text-muted-foreground text-base">
                  {profile.mentor ? 'Educator' : 'Student'}
                </p>
              </div>
            </div>
            {status !== 'success' ? (
              <Skeleton className="h-1/3 w-20 rounded-lg" />
            ) : (
              signInCheckResult.signedIn &&
              current_user_profile?.slug ===
                router.query?.slug && (
                <Link
                  href={`/profile/${router?.query?.slug}/edit`}
                  className="border-sciteensLightGreen-regular text-sciteensLightGreen-regular hover:border-sciteensLightGreen-dark hover:text-sciteensLightGreen-dark h-1/3 cursor-pointer rounded-lg border-2 px-6 py-1.5 text-center text-xl font-semibold shadow-sm"
                >
                  Edit
                </Link>
              )
            )}
          </div>
          <h4>
            {t('index_profile.joined')}{' '}
            {moment(profile.joined).calendar(null, {
              sameElse: 'MMMM DD, YYYY',
            })}
          </h4>
          <p></p>
          <hr className="py-1" />
        </div>
      </div>

      {/* About */}
      <div className="mx-auto mb-4 mt-12 w-5/6 md:w-2/3 lg:w-1/2">
        <h2 className="mb-2 text-lg font-semibold md:text-2xl">
          About
        </h2>
        <p className="text-muted-foreground">
          {profile.about == ''
            ? "This user hasn't written about themselves yet"
            : profile.about}
        </p>
      </div>

      {/* Projects */}
      <div className="mx-auto mb-4 mt-12 w-5/6 md:w-2/3 lg:w-1/2">
        <h2 className="mb-2 text-lg font-semibold md:text-2xl">
          Projects
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
            This user hasn&apos;t created any projects yet
          </p>
        )}
      </div>

      {/* Files */}
      <div className="mx-auto mb-4 mt-12 w-5/6 md:w-2/3 lg:w-1/2">
        {(filesLoading || files.length > 0) && (
          <h2 className="mb-2 text-lg font-semibold md:text-2xl">
            Files
          </h2>
        )}
        <div className="flex flex-col items-center space-y-2">
          {filesLoading ? (
            <>
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </>
          ) : (
            files.map((f, id) => (
              <File file={f} id={id} key={f.name}></File>
            ))
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
