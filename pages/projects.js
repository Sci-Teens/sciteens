import { useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'
import SocialMeta from '@/components/SocialMeta'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useIntersectionObserver } from '../context/helpers'
import { getTranslatedFieldsDict } from '../context/helpers'
import PageHeading from '@/components/PageHeading'

import { db as firestore } from '../lib/firebase'
import firebaseConfig from '../firebaseConfig'
import {
  getApp,
  getApps,
  initializeApp,
} from 'firebase/app'
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
} from 'firebase/firestore'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'

import algoliasearch from 'algoliasearch/lite'
import { PlusCircle } from 'lucide-react'
import ProjectCard from '../components/ProjectCard'
import {
  normalizeProject,
  formatProjectDate,
} from '../lib/projects'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const PROJECTS_PAGE_SIZE = 10

function mapProjectSnapshot(snapshot) {
  const projects = []
  snapshot.forEach((project) => {
    projects.push(
      normalizeProject({
        id: project.id,
        ...project.data(),
      })
    )
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
    // Legacy project docs store `fields` lowercase (pre-dates the
    // Title Case FIELD_NAMES dict); array-contains can't do a
    // case-insensitive match, so match both casings instead of
    // requiring a Firestore data backfill.
    constraints.push(
      firebase_where('fields', 'array-contains-any', [
        field,
        field.toLowerCase(),
      ])
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
              <ProjectCard
                project={project}
                date={formatProjectDate(
                  project.date,
                  router?.locale
                )}
              />
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
          className="bg-muted z-50 mt-4 h-16 rounded-xl p-4 shadow-sm"
        ></div>
      )
    })

  return (
    <>
      <SocialMeta
        title={`${
          field && field !== 'All' ? field + ' ' : ''
        }Projects${
          search ? ` related to ${search}` : ''
        } | SciTeens`}
        description="Real research projects built by teen scientists — get inspired, give feedback, or start your own."
        eyebrow="Projects"
        badge={field && field !== 'All' ? field : undefined}
        path="/projects"
      />
      <div className="text-foreground mx-auto mb-24 mt-8 flex min-h-screen flex-row overflow-x-hidden md:overflow-visible lg:mx-16 xl:mx-32">
        <div className="mx-auto w-11/12 md:w-[85%] lg:mx-0 lg:w-[60%]">
          <div className="flex flex-row justify-between">
            <PageHeading className="ml-0 py-4 text-left md:ml-4">
              {t('projects.projects')} 🔬
            </PageHeading>
            <Link
              href="/project/create"
              className="border-sciteensLightGreen-regular text-sciteensLightGreen-regular hover:border-sciteensLightGreen-dark hover:text-sciteensLightGreen-dark my-auto inline-flex items-center rounded-lg border-2 px-3 py-1.5 no-underline shadow-sm transition md:px-5 md:text-lg"
              aria-label="Create Project"
            >
              <span className="hidden md:inline">
                Create Project
              </span>
              <PlusCircle className="h-6 w-6 md:hidden" />
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
            <h2 className="text-muted-foreground mb-2 text-xl">
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
                className="bg-card mr-3 shadow-sm"
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

            <hr className="bg-border my-8" />

            <h2 className="text-muted-foreground mb-2 text-xl">
              {t('projects.topics')}
            </h2>
            <div className="flex flex-row flex-wrap">
              {Object.entries(
                getTranslatedFieldsDict(t)
              ).map(([key, value]) => {
                return (
                  <Button
                    key={value}
                    type="button"
                    variant={
                      key == field ? 'default' : 'secondary'
                    }
                    onClick={() => handleFieldSearch(key)}
                    className={
                      key == field
                        ? 'mb-4 mr-4 rounded-full'
                        : 'bg-card hover:bg-muted mb-4 mr-4 rounded-full border shadow-sm'
                    }
                  >
                    {value}
                  </Button>
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
  const translationsPromise = serverSideTranslations(
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
  const [translations, projectsRef] = await Promise.all([
    translationsPromise,
    getDocs(projectsQuery),
  ])
  projectsRef.forEach((p) => {
    projects.push(
      normalizeProject({
        id: p.id,
        ...p.data(),
      })
    )
  })
  return {
    props: { cached_projects: projects, ...translations },
  }
}

export default Projects
