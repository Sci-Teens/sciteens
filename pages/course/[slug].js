import { RichText } from 'prismic-reactjs'
var Prismic = require('@prismicio/client')
import moment from 'moment'
import Image from 'next/image'
import SocialMeta from '../../components/SocialMeta'
import htmlSerializer from '../../htmlserializer'
import { useState, useEffect } from 'react'
import FileGallery from '../../components/FileGallery'
import Discussion from '../../components/Discussion'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { createCropImageLoader } from '../../lib/prismicImageLoader'

function Course({ course }) {
  const [files, setFiles] = useState([])
  const { t } = useTranslation('common')

  const imageLoader = createCropImageLoader(582, 386)

  useEffect(() => {
    async function loadFiles() {
      try {
        for (const r of course.data.files) {
          const url = r.file?.url
          if (!url) continue
          const xhr = new XMLHttpRequest()
          xhr.responseType = 'blob'
          xhr.onload = () => {
            const blob = xhr.response
            if (xhr.status == 200) {
              blob.name = r.file.name
              setFiles((fs) => [...fs, blob])
            }
          }
          xhr.open('GET', url)
          xhr.send()
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadFiles()
  }, [])

  const lessonComponent = course.data.body.map(
    (slice, index) => {
      let lessonDate = moment(slice.primary.date).calendar(
        null,
        { sameElse: 'MMMM DD, YYYY' }
      )
      let lessonDateDisplay = <p></p>
      if (lessonDate == 'Invalid date') {
        lessonDateDisplay = <td className="p-2">N/A</td>
      } else {
        lessonDateDisplay = (
          <td className="p-2">{lessonDate}</td>
        )
      }

      if (slice.slice_type == 'lesson') {
        return (
          <tr key={index}>
            {lessonDateDisplay}
            <td className="p-2">
              {RichText.asText(slice.primary.title)}
            </td>
            <td className="p-2">
              <a
                href={slice.primary.lesson_link.url}
                target="_blank"
                rel="noreferrer"
              >
                View
              </a>
            </td>
          </tr>
        )
      }
    }
  )
  const router = useRouter()
  let courseStart = moment(course.data.start).calendar(
    null,
    { sameElse: 'MMMM DD, YYYY' }
  )
  let courseDateDisplay = <p></p>
  if (courseStart == 'Invalid date') {
    courseDateDisplay = (
      <p className="font-semibold">
        Asynchronous course - no start or end dates
      </p>
    )
  } else {
    courseDateDisplay = (
      <p className="font-semibold">
        {t('course.starts')} {courseStart}, Ends{' '}
        {moment(course.data.end).calendar(null, {
          sameElse: 'MMMM DD, YYYY',
        })}{' '}
        <br />
        {t('course.enroll_by')}{' '}
        {moment(course.data.enroll_by).calendar(null, {
          sameElse: 'MMMM DD, YYYY',
        })}
      </p>
    )
  }

  return (
    <>
      <SocialMeta
        title={`${RichText.asText(
          course.data.name
        )} | SciTeens`}
        description={RichText.asText(
          course.data.description
        )}
        eyebrow="Course"
        path={router.asPath}
      />
      <article className="prose-sm wrap-break-word lg:prose mx-auto mt-8 overflow-hidden px-4">
        <div>
          <h1>{RichText.asText(course.data.name)}</h1>
          {courseDateDisplay}
          <i>{RichText.asText(course.data.description)}</i>
          <div className="mt-2 border-b-2"></div>
          {/* <div className="flex items-center">
                                    {author_image}
                                    <p className="font-semibold ml-4">
                                        Written by {article.data.author} <br /> {moment(article.data.date).format('MMMM DD, YYYY')}
                                    </p>
                                </div> */}
        </div>
        <div>
          {/* Image Slider */}
          <Image
            loader={imageLoader}
            src={course.data.image_main.url}
            width="582"
            height="250"
            className="mt-0 w-full object-contain"
          />

          <div>
            <RichText
              render={course.data.about}
              htmlSerializer={htmlSerializer}
            />
          </div>
        </div>
      </article>
      <div className="mx-auto w-full max-w-prose">
        <h2 className="mb-2 text-lg font-semibold">
          {t('course.lessons')}
        </h2>
        <table className="mb-4 w-full table-auto rounded-sm shadow-sm">
          <tr className="border-border bg-muted rounded-t-md border-b text-center">
            <th className="p-2">{t('course.date')}</th>
            <th className="p-2">{t('course.lesson')}</th>
            <th className="p-2">{t('course.notebook')}</th>
          </tr>
          {lessonComponent}
        </table>
        {files?.length > 0 && (
          <>
            <h2 className="mb-2 text-lg font-semibold">
              {t('course.files')}
            </h2>
            <FileGallery files={files} />
          </>
        )}
        {typeof window !== 'undefined' && (
          <Discussion
            type={'course'}
            item_id={router.query.slug}
          />
        )}
      </div>
    </>
  )
}

export async function getStaticPaths() {
  const apiEndpoint =
    'https://sciteens.cdn.prismic.io/api/v2'
  const client = Prismic.client(apiEndpoint)
  const res = await client.query(
    Prismic.Predicates.at('document.type', 'course')
  )
  const pages = await Promise.all(
    Array.from({ length: res.total_pages }, (_, i) =>
      client.query(
        Prismic.Predicates.at('document.type', 'course'),
        { pageSize: 20, page: i + 1 }
      )
    )
  )
  const paths = pages.flatMap((page) =>
    page.results.map((course) => ({
      params: { slug: course.uid },
    }))
  )
  return { paths, fallback: false }
}

export async function getStaticProps({ params, locale }) {
  try {
    const apiEndpoint =
      'https://sciteens.cdn.prismic.io/api/v2'
    const client = Prismic.client(apiEndpoint)
    const [translations, course] = await Promise.all([
      serverSideTranslations(locale, ['common']),
      client.getByUID('course', params?.slug),
    ])
    return {
      props: { course, ...translations },
    }
  } catch (e) {
    console.log(e)
    return {
      notFound: true,
    }
  }
}

export default Course
