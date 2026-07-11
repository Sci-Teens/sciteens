import { useState, useEffect } from 'react'

import Image from 'next/image'
import { useRouter } from 'next/router'
import SocialMeta from '@/components/SocialMeta'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

var Prismic = require('@prismicio/client')
import { RichText } from 'prismic-reactjs'
import moment from 'moment'

import { getTranslatedFieldsDict } from '../context/helpers'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import PageHeading from '@/components/PageHeading'

function Courses({ cached_courses }) {
  const router = useRouter()
  const [courses, setCourses] = useState(cached_courses)

  useEffect(() => {
    async function loadCourses() {
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
    }
    loadCourses()
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

  const coursesComponent = courses.results.map((course) => {
    let courseStart = moment(course.data.start).format('ll')
    let dateDisplay = <p></p>
    if (courseStart == 'Invalid date') {
      dateDisplay = (
        <p className="flex text-xs">Asynchronous Course</p>
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
      <Card
        key={course.uid}
        className="animate-in border-border/60 fade-in slide-in-from-right-8 relative isolate mt-6 overflow-hidden transition duration-300 hover:-translate-y-0.5 hover:shadow-md md:mt-8"
      >
        <a
          href={`/course/${course.uid}`}
          aria-label={RichText.asText(course.data.name)}
          className="focus-visible:ring-3 focus-visible:ring-ring/50 absolute inset-0 z-10 rounded-xl"
        />
        <CardContent className="flex items-center">
          <div className="bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-lg md:h-40 md:w-40">
            <Image
              alt={RichText.asText(course.data.name)}
              fill
              sizes="(min-width: 768px) 160px, 96px"
              className="object-cover"
              loader={imageLoader}
              src={course.data.image_main.url}
            />
          </div>
          <div className="ml-4 min-w-0 flex-1">
            <h3 className="line-clamp-2 mb-2 text-base font-semibold md:text-xl lg:text-2xl">
              {RichText.asText(course.data.name)}
            </h3>
            <p className="line-clamp-none md:line-clamp-2 lg:line-clamp-3 mb-2 hidden md:block">
              {RichText.asText(course.data.description)}
            </p>
            {dateDisplay}
          </div>
        </CardContent>
      </Card>
    )
  })
  return (
    <>
      <SocialMeta
        title={`${
          field && field !== 'All' ? field + ' ' : ''
        }Courses${
          search ? ` related to ${search}` : ''
        } | SciTeens`}
        description="Free, project-based science courses taught by and for teens — biology, physics, data science, and more."
        eyebrow="Courses"
        badge={field && field !== 'All' ? field : undefined}
        path="/courses"
      />
      <div className="text-foreground mx-auto mb-24 mt-8 flex min-h-screen flex-row overflow-x-hidden md:overflow-visible lg:mx-16 xl:mx-32">
        <div className="w-full px-4 md:mx-auto md:w-[85%] md:px-0 lg:mx-0 lg:w-[60%]">
          <PageHeading className="ml-4 py-4 text-left">
            {t('courses.courses')} 📖
          </PageHeading>
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
            <h2 className="text-muted-foreground mb-2 text-xl">
              {t('courses.search_courses')}
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
                {t('courses.search')}
              </Button>
            </form>

            <Separator className="my-8" />

            <h2 className="text-muted-foreground mb-2 text-xl">
              {t('courses.topics')}
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
                        : 'bg-card hover:bg-muted border-border mb-4 mr-4 rounded-full border shadow-sm'
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
