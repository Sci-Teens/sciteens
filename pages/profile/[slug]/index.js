import { useEffect, useState, useContext } from 'react'

import Head from 'next/head'
import Error from 'next/error'
import Link from 'next/link'
import { useRouter } from 'next/router'
import ProfilePhoto from '../../../components/ProfilePhoto'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import {
  doc,
  getDocs,
  getFirestore,
  query as firebase_query,
  collection,
  where,
  limit,
} from '@firebase/firestore'
import {
  getApp,
  getApps,
  initializeApp,
} from '@firebase/app'
import firebaseConfig from '../../../firebaseConfig'
import {
  listAll,
  ref,
  getDownloadURL,
  getMetadata,
} from '@firebase/storage'
import { useStorage, useFirestore } from 'reactfire'

import moment from 'moment'
import {
  useSpring,
  animated,
  config,
} from '@react-spring/web'
import { useSigninCheck } from 'reactfire'
import { AppContext } from '../../../context/context'
import File from '../../../components/File'
import { getTranslatedFieldsDict } from '../../../context/helpers'

function Project({ profile }) {
  const { t } = useTranslation('common')
  const router = useRouter()
  const storage = useStorage()
  const firestore = useFirestore()

  const [files, setFiles] = useState([])
  const [projects, setProjects] = useState([])
  const { status, data: signInCheckResult } =
    useSigninCheck()
  const { profile: current_user_profile } =
    useContext(AppContext)

  useEffect(async () => {
    // Load projects
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
      ps.push({
        id: p.id,
        ...p.data(),
      })
    })
    setProjects(ps)

    // Load files
    const filesRef = ref(storage, `profiles/${profile.id}`)
    try {
      const res = await listAll(filesRef)
      for (let r of res.items) {
        const url = await getDownloadURL(r)
        const metadata = await getMetadata(r)
        const xhr = new XMLHttpRequest()
        xhr.responseType = 'blob'
        xhr.onload = (e) => {
          const blob = xhr.response
          if (xhr.status == 200) {
            blob.name = metadata.name
            setFiles((fs) => [...fs, blob])
          }
        }
        xhr.open('GET', url)
        xhr.send()
      }
    } catch (e) {
      console.error(e)
    }
  }, [''])

  useEffect(() => {}, [status])

  const [project_spring, set] = useSpring(() => ({
    opacity: 1,
    transform: 'translateX(0)',
    from: {
      opacity: 0,
      transform: 'translateX(150px)',
    },
    config: config.slow,
  }))

  function checkForLongFields(fields) {
    if (
      fields
        .slice(0, 3)
        .includes('Mechanical Engineering') ||
      fields
        .slice(0, 3)
        .includes('Electrical Engineering') ||
      fields.slice(0, 3).includes('Environmental Science')
    ) {
      return 2
    } else return 3
  }

  const projectsComponent = projects.map(
    (project, index) => {
      return (
        <Link
          key={project.id}
          href={`/project/${project.id}`}
        >
          <animated.a
            style={project_spring}
            className="z-50 mt-6 flex cursor-pointer items-center overflow-hidden rounded-lg bg-white p-4 shadow md:mt-8"
          >
            <div className="relative h-full max-h-[100px] max-w-[100px] overflow-hidden rounded-lg md:max-h-[200px] md:max-w-[200px]">
              <img
                src={
                  project.project_photo
                    ? project.project_photo
                    : ''
                }
                className="rounded-lg object-cover"
              ></img>
            </div>
            <div className="ml-4 w-3/4 lg:w-11/12">
              {project.member_arr && (
                <div className="mb-3 flex flex-row items-center">
                  <div className="flex -space-x-2 overflow-hidden">
                    {project.member_arr.map(
                      (member, index) => {
                        return (
                          <div
                            key={index}
                            className="inline-block h-6 w-6 rounded-full ring-2 ring-white lg:h-8 lg:w-8"
                          >
                            <ProfilePhoto
                              uid={member.uid}
                            ></ProfilePhoto>
                          </div>
                        )
                      }
                    )}
                  </div>
                  <p className="ml-2">
                    By{' '}
                    {project.member_arr.map((member) => {
                      return member.display + ' '
                    })}
                  </p>
                </div>
              )}
              <h3 className="mb-2 text-base font-semibold line-clamp-2 md:text-xl lg:text-2xl">
                {project.title}
              </h3>
              <p className="mb-4 hidden line-clamp-none md:block md:line-clamp-2 lg:line-clamp-3">
                {project.abstract}
              </p>
              <div className="hidden flex-row lg:flex">
                {project.fields.map((field, index) => {
                  if (
                    index <
                    checkForLongFields(project.fields)
                  )
                    return (
                      <p
                        key={index}
                        className="z-30 mr-2 mb-2 whitespace-nowrap rounded-full bg-gray-100 py-1.5 px-3 text-xs shadow"
                      >
                        {getTranslatedFieldsDict(t)[field]}
                      </p>
                    )
                })}
                {project.fields.length >= 3 && (
                  <p className="mt-1.5 hidden whitespace-nowrap text-xs text-gray-600 lg:flex">
                    +{' '}
                    {project.fields.length -
                      checkForLongFields(
                        project.fields
                      )}{' '}
                    more field
                    {project.fields.length -
                      checkForLongFields(project.fields) ==
                    1
                      ? ''
                      : 's'}
                  </p>
                )}
              </div>
            </div>
          </animated.a>
        </Link>
      )
    }
  )

  return (
    <>
      <Head>
        <title>
          {profile.display}'s Profile | SciTeens
        </title>
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
      <div className="mx-auto mt-12 w-5/6 px-4 md:w-2/3 lg:w-1/2 lg:px-0">
        <div>
          <h1></h1>
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
                <p className="text-base text-gray-500">
                  {profile.mentor ? 'Educator' : 'Student'}
                </p>
              </div>
            </div>
            {status === 'success' &&
              signInCheckResult.signedIn &&
              current_user_profile?.slug ===
                router.query?.slug && (
                <Link
                  href={`/profile/${router?.query?.slug}/edit`}
                >
                  <div className="h-1/3 cursor-pointer rounded-full border-2 border-sciteensLightGreen-regular py-1.5 px-6 text-center text-xl font-semibold text-sciteensLightGreen-regular hover:border-sciteensLightGreen-dark hover:text-sciteensLightGreen-dark">
                    Edit
                  </div>
                </Link>
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
        {/* <div>
                <img src={profile.image ? profile.image : 'https://external-content.duckduckgo.com/iu/?u=http%3A%2F%2Fgetwallpapers.com%2Fwallpaper%2Ffull%2F3%2F7%2F2%2F538871.jpg&f=1&nofb=1'} className="w-full mt-0 object-contain" />
            </div> */}
      </div>

      {/* About */}
      <div className="mx-auto mb-4 mt-12 w-5/6 md:w-2/3 lg:w-1/2">
        <h2 className="mb-2 text-lg font-semibold md:text-2xl">
          About
        </h2>
        <p className="text-gray-500">
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
        {projects?.length != 0 ? (
          projectsComponent
        ) : (
          <p className="text-gray-500">
            This user hasn't created any projects yet
          </p>
        )}
      </div>

      {/* Files */}
      <div className="mx-auto mb-4 mt-12 w-5/6 md:w-2/3 lg:w-1/2">
        {files.length > 0 && (
          <h2 className="mb-2 text-lg font-semibold md:text-2xl">
            Files
          </h2>
        )}
        <div className="flex flex-col items-center space-y-2">
          {files.map((f, id) => {
            return (
              <File file={f} id={id} key={f.name}></File>
            )
          })}
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
  if (!profileRes.empty) {
    let profile
    profileRes.forEach((p) => {
      if (p.exists) {
        profile = {
          ...p.data(),
          id: p.id,
        }
      }
    })
    return { props: { profile: profile, ...translations } }
  } else {
    return {
      notFound: true,
    }
  }
}

export default Project
