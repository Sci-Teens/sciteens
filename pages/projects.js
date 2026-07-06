import { useEffect, useState, useRef } from 'react'

import Link from 'next/link'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useIntersectionObserver } from '../context/helpers'
import moment from 'moment'

import { db as firestore } from '../lib/firebase'
import firebaseConfig from '../firebaseConfig'
import {
  getApp,
  getApps,
  initializeApp,
} from '@firebase/app'
import {
  collection,
  query as firebase_query,
  orderBy,
  getDocs,
  limit,
  getFirestore,
  where as firebase_where,
  startAfter,
  documentId,
} from '@firebase/firestore'

import algoliasearch from 'algoliasearch/lite'
import {
  useSpring,
  animated,
  config,
} from '@react-spring/web'
import ProfilePhoto from '../components/ProfilePhoto'
import { getTranslatedFieldsDict } from '../context/helpers'

function Projects({ cached_projects }) {
  const router = useRouter()
  const [projects, setProjects] = useState(cached_projects)
  // `loading` is only true while an initial fetch is in flight AND we
  // have nothing to show yet. It gates the skeleton so the page never
  // gets pinned to the loading state when the build-time cache is empty
  // (the production /projects page ships with cached_projects === [])
  // or when the client-side Firestore fallback fails.
  const [loading, setLoading] = useState(
    cached_projects.length === 0
  )

  moment.locale(router?.locale ? router.locale : 'en')

  useEffect(async () => {
    const hasSearch = !!router.query.search
    const hasField =
      !!router.query.field && router.query.field !== 'All'
    // On the bare /projects route (or when the field filter is
    // cleared back to "All"), rely on the statically cached projects
    // fetched at build time in getStaticProps — but always re-sync
    // state so a stale filtered/searched result set is reset. Only
    // fall back to a client-side Firestore query when the cache is
    // empty, so a failed/stale build doesn't leave the page blank.
    if (!hasSearch && !hasField) {
      if (cached_projects.length > 0) {
        setProjects(cached_projects)
        setLoading(false)
        return
      }
    }
    // Show the skeleton only when we have nothing to display yet; once
    // projects are loaded, keep the previous result set visible while
    // a follow-up search/field query is in flight (no flashing).
    if (projects.length === 0) setLoading(true)
    let ps = []
    try {
      // Search path: resolve IDs via Algolia, then hydrate from Firestore.
      if (hasSearch) {
        let ids = []
        const searchClient = algoliasearch(
          process.env.NEXT_PUBLIC_AL_APP_ID,
          process.env.NEXT_PUBLIC_AL_SEARCH_KEY
        )
        const projectIndex =
          searchClient.initIndex('prod_PROJECTS')
        let results
        if (hasField) {
          results = await projectIndex.search(
            router.query.search,
            {
              filters: 'data.fields:' + router.query.field,
            }
          )
        } else {
          results = await projectIndex.search(
            router.query.search
          )
        }
        results.hits.forEach((p) => {
          ids.push(p.objectID)
        })
        // Firebase's `in` filter rejects an empty list, so short-circuit.
        if (ids.length === 0) {
          setProjects([])
          return
        }
        const projectsCollection = collection(
          firestore,
          'projects'
        )
        const projectsQuery = firebase_query(
          projectsCollection,
          firebase_where(
            documentId(),
            'in',
            ids.slice(0, 10)
          )
        )
        const projectsRef = await getDocs(projectsQuery)
        projectsRef.forEach((p) => {
          ps.push({
            id: p.id,
            ...p.data(),
          })
        })
        setProjects(ps)
      }
      // Firebase path: field filter, or bare route with empty cache.
      else {
        const projectsCollection = collection(
          firestore,
          'projects'
        )
        let projectsQuery
        if (hasField) {
          projectsQuery = firebase_query(
            projectsCollection,
            firebase_where(
              'fields',
              'array-contains',
              router.query.field
            ),
            orderBy('date', 'desc'),
            limit(10)
          )
        } else {
          projectsQuery = firebase_query(
            projectsCollection,
            orderBy('date', 'desc'),
            limit(10)
          )
        }
        const projectsRef = await getDocs(projectsQuery)
        projectsRef.forEach((p) => {
          ps.push({
            id: p.id,
            ...p.data(),
          })
        })
        setProjects(ps)
      }
    } catch (err) {
      // A failed client fetch must not leave the page pinned to the
      // loading skeleton forever — clear loading and let the empty
      // state render instead.
      console.error('Failed to load projects:', err)
      setProjects([])
    } finally {
      setLoading(false)
    }
  }, [router])

  const [search, setSearch] = useState('')
  const [field, setField] = useState('All')

  useEffect(() => {
    if (router?.isReady) {
      setSearch(
        router.query?.search ? router.query.search : ''
      )
      setField(
        router.query?.field ? router.query.field : ''
      )
    }
  }, [router])

  const ref = useRef(null)
  const isBottomVisible = useIntersectionObserver(
    ref,
    { threshold: 0 },
    false
  )

  async function load_more_projects() {
    // Never paginate before the first page has arrived (projects is
    // empty) or while a fetch is in flight — startAfter would otherwise
    // read projects[-1].date and throw.
    if (loading) return
    if (!router?.query?.search) {
      if (projects.length === 0) return
      let ps = []
      const projectsCollection = collection(
        firestore,
        'projects'
      )
      let projectsQuery
      if (
        !router.query?.field ||
        router.query?.field == 'All'
      ) {
        projectsQuery = firebase_query(
          projectsCollection,
          orderBy('date', 'desc'),
          startAfter(projects[projects.length - 1].date),
          limit(10)
        )
      } else {
        projectsQuery = firebase_query(
          projectsCollection,
          firebase_where(
            'fields',
            'array-contains',
            router.query.field
          ),
          orderBy('date', 'desc'),
          startAfter(projects[projects.length - 1].date),
          limit(10)
        )
      }
      const projectsRef = await getDocs(projectsQuery)
      projectsRef.forEach((p) => {
        ps.push({
          id: p.id,
          ...p.data(),
        })
      })
      setProjects((old_ps) => [...old_ps, ...ps])
    }
  }
  useEffect(() => {
    //load next page when bottom is visible
    isBottomVisible && load_more_projects()
  }, [isBottomVisible])

  async function handleChange(e, target) {
    e.preventDefault()
    switch (target) {
      case 'searchbar':
        setSearch(e.target.value)
    }
  }

  async function handleSearch(e) {
    e.preventDefault()
    let q = {}
    if (search) {
      q.search = search
    }
    if (field) {
      q.field = field
    }
    router.push({
      pathname: '/projects',
      query: q,
    })
  }

  async function handleFieldSearch(field) {
    let q = {}
    q.field = field
    router.push({
      pathname: '/projects',
      query: q,
    })
    setField(field)
  }

  function checkForLongFields(fields) {
    if (
      fields
        .slice(0, 3)
        .includes('Mechanical Engineering') ||
      fields
        .slice(0, 3)
        .includes('Electrical Engineering') ||
      fields
        .slice(0, 3)
        .includes('Environmental Science') ||
      fields.slice(0, 3).includes('Fall 2022 Science Fair')
    ) {
      return 2
    } else return 3
  }

  // REACT SPRING ANIMATIONS
  useEffect(() => {
    if (projects.length <= 10) {
      set({
        opacity: 0,
        transform: 'translateX(150px)',
        config: { tension: 10000, clamp: true },
      })
      window.setTimeout(function () {
        set({
          opacity: 1,
          transform: 'translateX(0)',
          config: config.slow,
        })
      }, 10)
    }
  }, [projects])

  const [project_spring, set] = useSpring(() => ({
    opacity: 1,
    transform: 'translateX(0)',
    from: {
      opacity: 0,
      transform: 'translateX(150px)',
    },
    config: config.slow,
  }))
  const { t } = useTranslation('common')

  const projectsComponent = projects.map((project) => {
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
              alt=""
              className="flex-shrink-0 rounded-lg object-cover"
            ></img>
          </div>
          <div className="ml-4 w-3/4 lg:w-11/12">
            {project.member_arr && (
              <div className="mb-1 flex flex-row items-center">
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
                  By&nbsp;
                  {project.member_arr.map((member) => {
                    return (
                      <Link
                        key={member.uid}
                        href={`/profile/${
                          member.slug ? member.slug : ''
                        }`}
                      >
                        <a className="font-bold text-sciteensGreen-regular no-underline hover:text-sciteensGreen-dark">
                          {member.display + ' '}
                        </a>
                      </Link>
                    )
                  })}
                </p>
              </div>
            )}
            <div className="mb-2 ml-10 text-gray-500">
              {moment(project.date).format('ll')}
            </div>
            <h3 className="mb-2 text-base font-semibold line-clamp-2 md:text-xl lg:text-2xl">
              {project.title}
            </h3>
            <p className="mb-4 hidden line-clamp-none md:block md:line-clamp-2 lg:line-clamp-3">
              {project.abstract}
            </p>
            <div className="hidden flex-row lg:flex">
              {project.fields.map((field, index) => {
                if (
                  index < checkForLongFields(project.fields)
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
                    checkForLongFields(project.fields)}{' '}
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
  })

  const loadingComponent = new Array(10)
    .fill(1)
    .map((index) => {
      return (
        <div
          key={index}
          className="z-50 mt-4 h-16 rounded-lg bg-gray-100 p-4 shadow"
        ></div>
      )
    })

  return (
    <>
      <Head>
        <title>
          {field ? field + ' ' : ''}Projects{' '}
          {search ? 'related to ' + search : ''} | SciTeens
        </title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="SciTeens Projects Page"
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, projects, teen science"
        />
        <meta property="og:type" content="website" />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
      </Head>
      <div className="mx-auto mt-8 mb-24 flex min-h-screen flex-row overflow-x-hidden md:overflow-visible lg:mx-16 xl:mx-32">
        <div className="mx-auto w-11/12 md:w-[85%] lg:mx-0 lg:w-[60%]">
          <div className="flex flex-row justify-between">
            <h1 className="ml-0 py-4 text-left text-3xl font-semibold md:ml-4 md:text-4xl">
              {t('projects.projects')} 🔬
            </h1>
            <Link href="/project/create">
              {typeof window !== 'undefined' &&
              window.innerWidth >= 812 ? (
                <a className="my-auto rounded-full border-2 border-sciteensLightGreen-regular py-1.5 px-5 text-lg font-semibold text-sciteensLightGreen-regular hover:border-sciteensLightGreen-dark hover:text-sciteensLightGreen-dark">
                  Create Project
                </a>
              ) : (
                <img
                  src={'assets/zondicons/add-outline.svg'}
                  alt="Share Project"
                  className="my-auto h-8"
                />
              )}
            </Link>
          </div>
          {loading && projects.length === 0
            ? loadingComponent
            : projectsComponent}
          {!loading &&
            projects.length === 0 &&
            (router?.query?.search ||
              router?.query?.field) && (
              <div className="mx-auto mt-20 text-center">
                <i className="text-xl font-semibold">
                  {router?.query?.search
                    ? `${t('projects.sorry')} ${
                        router.query.search
                      }`
                    : t('projects.sorry')}
                </i>
              </div>
            )}
          <div
            ref={ref}
            style={{ width: '100%', height: '20px' }}
          ></div>
        </div>

        <div className="hidden w-0 lg:ml-32 lg:block lg:w-[30%]">
          <div className="sticky top-1/2 w-full -translate-y-1/2 transform">
            <h2 className="mb-2 text-xl text-gray-700">
              {t('projects.search_projects')}
            </h2>
            <form
              onSubmit={(e) => handleSearch(e)}
              className="flex flex-row"
            >
              <input
                onChange={(e) =>
                  handleChange(e, 'searchbar')
                }
                value={search}
                name="search"
                required
                className={`focus:outline-none mr-3 w-full appearance-none rounded border-2 border-transparent bg-white p-2 leading-tight text-gray-700 shadow focus:border-sciteensLightGreen-regular focus:bg-white focus:placeholder-gray-700`}
                type="text"
                aria-label="search"
                maxLength="100"
              />
              <button
                type="submit"
                className="outline-none rounded-lg bg-sciteensLightGreen-regular px-4 py-2 font-semibold text-white shadow hover:bg-sciteensLightGreen-dark disabled:opacity-50"
                onClick={(e) => handleSearch(e)}
              >
                {t('projects.search')}
              </button>
            </form>

            <hr className="my-8 bg-gray-300" />

            <h2 className="mb-2 text-xl text-gray-700">
              {t('projects.topics')}
            </h2>
            <div className="flex flex-row flex-wrap">
              {Object.entries(
                getTranslatedFieldsDict(t)
              ).map(([key, value]) => {
                return (
                  <button
                    key={value}
                    onClick={() => handleFieldSearch(key)}
                    className={`mr-4 mb-4 rounded-full px-3 py-2 text-sm shadow
                                        ${
                                          key == field
                                            ? 'bg-sciteensLightGreen-regular text-white'
                                            : 'bg-white'
                                        }`}
                  >
                    {value}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export async function getStaticProps({ locale }) {
  let projects = []
  const translations = await serverSideTranslations(
    locale,
    ['common']
  )
  const app =
    getApps().length === 0
      ? initializeApp(firebaseConfig)
      : getApp()
  const firestore = getFirestore(app)
  const projectsCollection = collection(
    firestore,
    'projects'
  )
  const projectsQuery = firebase_query(
    projectsCollection,
    orderBy('date', 'desc'),
    limit(10)
  )
  const projectsRef = await getDocs(projectsQuery)
  projectsRef.forEach((p) => {
    projects.push({
      id: p.id,
      ...p.data(),
    })
  })
  return {
    props: { cached_projects: projects, ...translations },
  }
}

export default Projects
