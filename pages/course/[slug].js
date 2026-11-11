import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import SocialMeta from '../../components/SocialMeta'
import StructuredData from '@/components/StructuredData'
import { breadcrumbStructuredData } from '@/lib/structuredData'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import FileGallery from '../../components/FileGallery'
import Discussion from '../../components/Discussion'
import MarkdownContent from '../../components/MarkdownContent'
import { formatMediumDate } from '../../lib/formatDate'
import { isSafeContentUrl } from '../../lib/contentUrls.mjs'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { buttonVariants } from '@/components/ui/button'

function Course({ course }) {
  const [files, setFiles] = useState([])
  const { t } = useTranslation('common')
  const router = useRouter()

  // Fetched into blobs because FileGallery classifies on a Blob or a Cloud
  // Storage url, and widening that allowlist for three PDFs is not worth it.
  useEffect(() => {
    let cancelled = false
    async function loadFile(record) {
      try {
        const res = await fetch(record.path)
        if (!res.ok) return null
        const blob = await res.blob()
        blob.name = record.name
        return blob
      } catch (error) {
        console.error(
          `Failed to load course file ${record.name}:`,
          error
        )
        return null
      }
    }
    async function loadFiles() {
      const loaded = await Promise.all(
        course.files
          .filter((record) => record.path)
          .map(loadFile)
      )
      // Assigned once rather than appended per file, so navigating between
      // two courses cannot leave the previous one's files on screen.
      if (!cancelled) setFiles(loaded.filter(Boolean))
    }
    loadFiles()
    return () => {
      cancelled = true
    }
  }, [course.files])

  const startDate = formatMediumDate(
    course.start,
    router?.locale
  )
  const endDate = formatMediumDate(
    course.end,
    router?.locale
  )
  const enrollByDate = formatMediumDate(
    course.enrollBy,
    router?.locale
  )

  return (
    <>
      <SocialMeta
        title={`${course.title} | SciTeens`}
        description={course.description}
        eyebrow="Course"
        path={router.asPath}
      />
      <StructuredData
        id="course-breadcrumbs"
        data={breadcrumbStructuredData([
          { name: t('navigation.home'), path: '/' },
          { name: t('courses.courses'), path: '/courses' },
          {
            name: course.title,
            path: `/course/${course.slug}`,
          },
        ])}
      />
      <div>
        <article className="prose wrap-break-word lg:prose-lg mx-auto mt-8 overflow-hidden px-4">
          <Link href="/courses" locale="en">
            {t('seo.back_to_courses')}
          </Link>
          <h1>{course.title}</h1>
          {course.status === 'archived' ? (
            <div className="not-prose mb-5">
              <Badge variant="outline">
                {t('seo.course_archive')}
              </Badge>
              <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                {t('seo.course_archive_description')}
              </p>
              {course.updateNote && (
                <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
                  {course.updateNote}
                </p>
              )}
            </div>
          ) : startDate ? (
            <p className="font-semibold">
              {t('course.starts')} {startDate}
              {endDate && (
                <>
                  {' '}
                  · {t('seo.ends_on', { date: endDate })}
                </>
              )}
              {enrollByDate && (
                <>
                  <br />
                  {t('course.enroll_by')} {enrollByDate}
                </>
              )}
            </p>
          ) : (
            <p className="font-semibold">
              {t('courses.self_paced')}
            </p>
          )}
          {course.description && (
            <i>{course.description}</i>
          )}
          <Separator className="mt-2" />
          {/* Pre-converted WebP at the width this column renders, served
              straight from public/. See components/MarkdownContent.js for
              why article and course media skips /_next/image. */}
          <img
            src={course.cover.src}
            alt={course.title}
            width={course.cover.width}
            height={course.cover.height}
            loading="eager"
            fetchPriority="high"
            decoding="async"
            className="mt-6 h-auto w-full rounded-lg object-cover"
          />
          <MarkdownContent hast={course.body} />
        </article>
        <div className="mx-auto w-full max-w-prose px-4">
          {course.lessons.length > 0 && (
            <>
              <h2
                id="course-lessons"
                className="mb-2 text-lg font-semibold"
              >
                {t('course.lessons')}
              </h2>
              <Card className="border-border/60 mb-8 overflow-hidden">
                <CardContent className="p-0">
                  <table
                    aria-labelledby="course-lessons"
                    className="w-full table-auto text-sm"
                  >
                    <thead>
                      <tr className="border-border bg-muted text-foreground border-b text-center text-xs font-semibold uppercase tracking-wide">
                        <th
                          scope="col"
                          className="px-1 py-3 sm:px-3"
                        >
                          {t('course.date')}
                        </th>
                        <th
                          scope="col"
                          className="px-1 py-3 sm:px-3"
                        >
                          {t('course.lesson')}
                        </th>
                        <th
                          scope="col"
                          className="px-1 py-3 sm:px-3"
                        >
                          {t('course.notebook')}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-border divide-y">
                      {course.lessons.map(
                        (lesson, index) => (
                          <tr
                            key={`${lesson.title}-${index}`}
                            className="hover:bg-muted/50 transition-colors"
                          >
                            <td className="px-1 py-3 text-center sm:px-3">
                              {formatMediumDate(
                                lesson.date,
                                router?.locale
                              ) || 'N/A'}
                            </td>
                            <th
                              scope="row"
                              className="wrap-anywhere px-1 py-3 text-left font-medium sm:px-3"
                            >
                              {lesson.title}
                            </th>
                            <td className="px-1 py-3 text-center sm:px-3">
                              {isSafeContentUrl(
                                lesson.link
                              ) && (
                                <a
                                  href={lesson.link}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  aria-label={t(
                                    'course.open_lesson_notebook',
                                    {
                                      lesson: lesson.title,
                                    }
                                  )}
                                  className={buttonVariants(
                                    {
                                      variant: 'link',
                                      size: 'sm',
                                      className:
                                        'h-auto whitespace-normal py-1',
                                    }
                                  )}
                                >
                                  {t(
                                    'course.open_notebook'
                                  )}
                                </a>
                              )}
                            </td>
                          </tr>
                        )
                      )}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </>
          )}
          {files?.length > 0 && (
            <>
              <h2 className="mb-2 text-lg font-semibold">
                {t('course.files')}
              </h2>
              <FileGallery files={files} />
            </>
          )}
          <div className="mb-12 mt-6">
            <Discussion
              type="course"
              item_id={course.slug}
            />
          </div>
        </div>
      </div>
    </>
  )
}

export async function getStaticPaths() {
  const { getCourseSlugs } = await import(
    '../../lib/content'
  )
  return {
    paths: getCourseSlugs().map((slug) => ({
      params: { slug },
    })),
    fallback: false,
  }
}

export async function getStaticProps({ params, locale }) {
  const { getCourse } = await import('../../lib/content')
  const course = getCourse(params?.slug)
  if (!course) return { notFound: true }

  return {
    props: {
      course,
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

export default Course
