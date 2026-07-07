import { useEffect, useMemo, useRef, useState } from 'react'

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
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'

import algoliasearch from 'algoliasearch/lite'
import {
  useSpring,
  animated,
  config,
} from '@react-spring/web'
import ProfilePhoto from '../components/ProfilePhoto'
import { getTranslatedFieldsDict } from '../context/helpers'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PROJECTS_PAGE_SIZE = 10

function mapProjectSnapshot(snapshot) {
  const projects = []
  snapshot.forEach((project) => {
    projects.push({
      id: project.id,
      ...project.data(),
    })
  })
  return projects
}

async function fetchProjectsPage({
  search,
  field,
  pageParam,
}) {
  const projectsCollection = collection(
    firestore,
    'projects'
  )

  if (search) {
    const searchClient = algoliasearch(
      process.env.NEXT_PUBLIC_AL_APP_ID,
      process.env.NEXT_PUBLIC_AL_SEARCH_KEY
    )
    const projectIndex =
      searchClient.initIndex('prod_PROJECTS')
    const results = await projectIndex.search(
      search,
      field
        ? { filters: 'data.fields:' + field }
        : undefined
    )
    const ids = results.hits.map(
      (project) => project.objectID
    )

    if (ids.length === 0) {
      return { projects: [], nextCursor: null }
    }

    const projectsQuery = firebase_query(
      projectsCollection,
      firebase_where(documentId(), 'in', ids.slice(0, 10))
    )
    const projectsRef = await getDocs(projectsQuery)
    return {
      projects: mapProjectSnapshot(projectsRef),
      nextCursor: null,
    }
  }

  const constraints = []
  if (field) {
    constraints.push(
      firebase_where('fields', 'array-contains', field)
    )
  }
  constraints.push(orderBy('date', 'desc'))
  if (pageParam) {
    constraints.push(startAfter(pageParam))
  }
  constraints.push(limit(PROJECTS_PAGE_SIZE))

  const projectsQuery = firebase_query(
    projectsCollection,
    ...constraints
  )
  const projectsRef = await getDocs(projectsQuery)
  const projects = mapProjectSnapshot(projectsRef)

  return {
    projects,
    nextCursor:
      projects.length === PROJECTS_PAGE_SIZE
        ? projects[projects.length - 1].date
        : null,
  }
}

function Projects({ cached_projects }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [field, setField] = useState('All')

  const searchParam = router.query?.search || ''
  const fieldParam =
    router.query?.field && router.query.field !== 'All'
      ? router.query.field
      : ''

  moment.locale(router?.locale ? router.locale : 'en')

  const initialData = useMemo(() => {
    if (
      !router.isReady ||
      searchParam ||
      fieldParam ||
      cached_projects.length === 0
    ) {
      return undefined
    }

    return {
      pages: [
        {
          projects: cached_projects,
          nextCursor:
            cached_projects.length === PROJECTS_PAGE_SIZE
              ? cached_projects[cached_projects.length - 1]
                  .date
              : null,
        },
      ],
      pageParams: [null],
    }
  }, [
    router.isReady,
    searchParam,
    fieldParam,
    cached_projects,
  ])

  const projectsQuery = useInfiniteQuery({
    queryKey: ['projects', searchParam, fieldParam],
    enabled: router.isReady,
    initialPageParam: null,
    initialData,
    queryFn: ({ pageParam }) =>
      fetchProjectsPage({
        search: searchParam,
        field: fieldParam,
        pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  })

  const projects = useMemo(
    () =>
      projectsQuery.data?.pages.flatMap(
        (page) => page.projects
      ) || [],
    [projectsQuery.data]
  )
  const loading =
    projectsQuery.isLoading && projects.length === 0
  const { hasNextPage, isFetchingNextPage, fetchNextPage } =
    projectsQuery

  useEffect(() => {
    if (projectsQuery.isError) {
      console.error(
        'Failed to load projects:',
        projectsQuery.error
      )
    }
  }, [projectsQuery.isError, projectsQuery.error])

  useEffect(() => {
    if (router?.isReady) {
      setSearch(
        router.query?.search ? router.query.search : ''
      )
      setField(
        router.query?.field ? router.query.field : ''
      )
    }
  }, [
    router.isReady,
    router.query.search,
    router.query.field,
  ])

  const ref = useRef(null)
  const isBottomVisible = useIntersectionObserver(
    ref,
    { threshold: 0 },
    false
  )

  useEffect(() => {
    if (
      isBottomVisible &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      fetchNextPage()
    }
  }, [
    isBottomVisible,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  ])

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

  const [project_spring, set] = useSpring(() => ({
    opacity: 1,
    transform: 'translateX(0)',
    from: {
      opacity: 0,
      transform: 'translateX(150px)',
    },
    config: config.slow,
  }))

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
  }, [projects.length, set])
  const { t } = useTranslation('common')

  const projectVirtualizer = useWindowVirtualizer({
    count: projects.length,
    estimateSize: () => 320,
    overscan: 5,
  })

  const projectsComponent = (
    <div
      className="relative w-full"
      style={{
        height: `${projectVirtualizer.getTotalSize()}px`,
      }}
    >
      {projectVirtualizer
        .getVirtualItems()
        .map((virtualRow) => {
          const project = projects[virtualRow.index]
          if (!project) return null

          return (
            <div
              key={project.id}
              ref={projectVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute left-0 top-0 w-full pt-6 md:pt-8"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <Link
                href={`/project/${project.id}`}
                legacyBehavior
              >
                <animated.a
                  style={project_spring}
                  className="z-50 flex cursor-pointer items-center overflow-hidden rounded-lg bg-white p-4 shadow-sm"
                >
                  <div className="relative h-full max-h-[100px] max-w-[100px] overflow-hidden rounded-lg md:max-h-[200px] md:max-w-[200px]">
                    <img
                      src={
                        project.project_photo
                          ? project.project_photo
                          : ''
                      }
                      alt=""
                      className="shrink-0 rounded-lg object-cover"
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
                          {project.member_arr.map(
                            (member) => {
                              return (
                                <Link
                                  key={member.uid}
                                  href={`/profile/${
                                    member.slug
                                      ? member.slug
                                      : ''
                                  }`}
                                  className="text-sciteensGreen-regular hover:text-sciteensGreen-dark font-bold no-underline"
                                >
                                  {member.display + ' '}
                                </Link>
                              )
                            }
                          )}
                        </p>
                      </div>
                    )}
                    <div className="mb-2 ml-10 text-gray-500">
                      {moment(project.date).format('ll')}
                    </div>
                    <h3 className="line-clamp-2 mb-2 text-base font-semibold md:text-xl lg:text-2xl">
                      {project.title}
                    </h3>
                    <p className="line-clamp-none md:line-clamp-2 lg:line-clamp-3 mb-4 hidden md:block">
                      {project.abstract}
                    </p>
                    <div className="hidden flex-row lg:flex">
                      {project.fields.map(
                        (field, index) => {
                          if (
                            index <
                            checkForLongFields(
                              project.fields
                            )
                          )
                            return (
                              <p
                                key={index}
                                className="z-30 mb-2 mr-2 whitespace-nowrap rounded-full bg-gray-100 px-3 py-1.5 text-xs shadow-sm"
                              >
                                {
                                  getTranslatedFieldsDict(
                                    t
                                  )[field]
                                }
                              </p>
                            )
                        }
                      )}
                      {project.fields.length >= 3 && (
                        <p className="mt-1.5 hidden whitespace-nowrap text-xs text-gray-600 lg:flex">
                          +{' '}
                          {project.fields.length -
                            checkForLongFields(
                              project.fields
                            )}{' '}
                          more field
                          {project.fields.length -
                            checkForLongFields(
                              project.fields
                            ) ==
                          1
                            ? ''
                            : 's'}
                        </p>
                      )}
                    </div>
                  </div>
                </animated.a>
              </Link>
            </div>
          )
        })}
    </div>
  )

  const loadingComponent = new Array(10)
    .fill(1)
    .map((index) => {
      return (
        <div
          key={index}
          className="z-50 mt-4 h-16 rounded-lg bg-gray-100 p-4 shadow-sm"
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
      <div className="mx-auto mb-24 mt-8 flex min-h-screen flex-row overflow-x-hidden md:overflow-visible lg:mx-16 xl:mx-32">
        <div className="mx-auto w-11/12 md:w-[85%] lg:mx-0 lg:w-[60%]">
          <div className="flex flex-row justify-between">
            <h1 className="ml-0 py-4 text-left text-3xl font-semibold md:ml-4 md:text-4xl">
              {t('projects.projects')} 🔬
            </h1>
            <Link href="/project/create" legacyBehavior>
              {typeof window !== 'undefined' &&
              window.innerWidth >= 812 ? (
                <a className="border-sciteensLightGreen-regular text-sciteensLightGreen-regular hover:border-sciteensLightGreen-dark hover:text-sciteensLightGreen-dark my-auto rounded-full border-2 px-5 py-1.5 text-lg font-semibold">
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
          {projectsQuery.isFetchingNextPage &&
            loadingComponent.slice(0, 2)}
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
              <Input
                onChange={(e) =>
                  handleChange(e, 'searchbar')
                }
                value={search}
                name="search"
                required
                className="mr-3"
                type="text"
                aria-label="search"
                maxLength="100"
              />
              <Button
                type="submit"
                onClick={(e) => handleSearch(e)}
              >
                {t('projects.search')}
              </Button>
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
                    className={`mb-4 mr-4 rounded-full px-3 py-2 text-sm shadow
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
