import { useState, useEffect } from 'react'

import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

var Prismic = require('@prismicio/client')
import { RichText } from 'prismic-reactjs'
import {
  useSpring,
  animated,
  config,
} from '@react-spring/web'
import moment from 'moment'

import { getTranslatedFieldsDict } from '../context/helpers'

function Courses({ cached_courses }) {
  const router = useRouter()
  const [courses, setCourses] = useState(cached_courses)

  useEffect(async () => {
    if (router.asPath !== '/courses') {
      const apiEndpoint =
        'https://sciteens.cdn.prismic.io/api/v2'
      const client = Prismic.default.client(apiEndpoint)
      let predicates = []
      if (router.query.search) {
        predicates.push(
          Prismic.default.Predicates.fulltext(
            'document',
            router.query.search
          )
        )
      }
      if (
        router.query.field &&
        router.query.field != 'All'
      ) {
        predicates.push(
          Prismic.default.Predicates.at('document.tags', [
            router.query.field,
          ])
        )
      }
      const cs = await client.query(
        [
          Prismic.default.Predicates.at(
            'document.type',
            'course'
          ),
          ...predicates,
        ],
        {
          orderings: `[document.first_publication_date desc]`,
          pageSize: 10,
        }
      )
      setCourses(cs)
    }
  }, [router])

  const [search, setSearch] = useState('')
  const [field, setField] = useState('All')

  const { t } = useTranslation('common')
  const imageLoader = ({ src, width, height }) => {
    return `${src}?fit=crop&crop=faces&w=${
      width || 256
    }&h=${height || 256}`
  }

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
    q.search = search
    router.push({
      pathname: '/courses',
      query: q,
    })
  }

  async function handleFieldSearch(field) {
    let q = {}
    q.field = field
    router.push({
      pathname: '/courses',
      query: q,
    })
    setField(field)
  }

  // REACT SPRING ANIMATIONS
  useEffect(() => {
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
  }, [courses])

  const [courses_spring, set] = useSpring(() => ({
    opacity: 1,
    transform: 'translateX(0)',
    from: {
      opacity: 0,
      transform: 'translateX(150px)',
    },
    config: config.slow,
  }))

  const coursesComponent = courses.results.map(
    (course, index) => {
      let courseStart = moment(course.data.start).format(
        'll'
      )
      let dateDisplay = <p></p>
      if (courseStart == 'Invalid date') {
        dateDisplay = (
          <p className="flex text-xs">
            Asynchronous Course
          </p>
        )
      } else {
        dateDisplay = (
          <p className="flex text-xs">
            {courseStart +
              ' - ' +
              moment(course.data.end).format('ll')}
          </p>
        )
      }

      return (
        <Link
          key={course.uid}
          href={`/course/${course.uid}`}
        >
          <animated.div
            style={courses_spring}
            className="z-50 mt-6 flex cursor-pointer items-center rounded-lg bg-white p-4 shadow md:mt-8"
          >
            <div className="relative h-full max-w-[100px] md:max-w-[200px]">
              <Image
                className="flex-shrink-0 rounded-lg object-cover"
                loader={imageLoader}
                src={course.data.image_main.url}
                width={256}
                height={256}
              />
            </div>
            <div className="ml-4 w-3/4 lg:w-11/12">
              <h3 className="mb-2 text-base font-semibold line-clamp-2 md:text-xl lg:text-2xl">
                {RichText.asText(course.data.name)}
              </h3>
              <p className="mb-2 hidden line-clamp-none md:block md:line-clamp-2 lg:line-clamp-3">
                {RichText.asText(course.data.description)}
              </p>
              {dateDisplay}
            </div>
          </animated.div>
        </Link>
      )
    }
  )
  return (
    <>
      <Head>
        <title>
          {field ? field + ' ' : ''}Courses{' '}
          {search ? 'related to ' + search : ''} | SciTeens
        </title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="SciTeens Courses Page"
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, courses, teen science"
        />
        <meta property="og:type" content="website" />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
      </Head>
      <div className="mx-auto mt-8 mb-24 flex min-h-screen flex-row overflow-x-hidden md:overflow-visible lg:mx-16 xl:mx-32">
        <div className="mx-auto w-11/12 md:w-[85%] lg:mx-0 lg:w-[60%]">
          <h1 className="ml-4 py-4 text-left text-4xl font-semibold">
            {t('courses.courses')} 📖
          </h1>
          {coursesComponent}
          {courses.results.length == 0 && (
            <div className="mx-auto mt-20 text-center">
              <i className="text-xl font-semibold">
                {t('courses.sorry')}{' '}
                {router?.query.search == undefined
                  ? router?.query.field
                  : router?.query.search}
              </i>
            </div>
          )}
        </div>

        <div className="hidden w-0 lg:ml-32 lg:block lg:w-[30%]">
          <div className="sticky top-1/2 w-full -translate-y-1/2 transform">
            <h2 className="mb-2 text-xl text-gray-700">
              {t('courses.search_courses')}
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
                {t('courses.search')}
              </button>
            </form>

            <hr className="my-8 bg-gray-300" />

            <h2 className="mb-2 text-xl text-gray-700">
              {t('courses.topics')}
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
  // Fetch data from external API
  const translations = await serverSideTranslations(
    locale,
    ['common']
  )
  try {
    const apiEndpoint =
      'https://sciteens.cdn.prismic.io/api/v2'
    const client = Prismic.client(apiEndpoint)
    const courses = await client.query(
      [Prismic.Predicates.at('document.type', 'course')],
      {
        orderings: `[document.first_publication_date desc]`,
        pageSize: 10,
      }
    )

    return {
      props: { cached_courses: courses, ...translations },
    }
  } catch (e) {
    console.error(e)
    return {
      notFound: true,
    }
  }
}

export default Courses
