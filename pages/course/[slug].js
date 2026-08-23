import { useState, useEffect } from 'react'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import SocialMeta from '../../components/SocialMeta'
import FileGallery from '../../components/FileGallery'
import Discussion from '../../components/Discussion'
import MarkdownContent from '../../components/MarkdownContent'
import { formatMediumDate } from '../../lib/formatDate'
import { isSafeContentUrl } from '../../lib/contentUrls.mjs'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Button } from '@/components/ui/button'

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
      <main>
        <article className="prose wrap-break-word lg:prose-lg mx-auto mt-8 overflow-hidden px-4">
          <h1>{course.title}</h1>
          {startDate ? (
            <p className="font-semibold">
              {t('course.starts')} {startDate}, Ends{' '}
              {endDate}
              <br />
              {t('course.enroll_by')} {enrollByDate}
            </p>
          ) : (
            <p className="font-semibold">
              Asynchronous course - no start or end dates
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
              <h2 className="mb-2 text-lg font-semibold">
                {t('course.lessons')}
              </h2>
              <Card className="border-border/60 mb-8 overflow-hidden">
                <CardContent className="p-0">
                  <table className="w-full table-auto text-sm">
                    <thead>
                      <tr className="border-border bg-muted text-muted-foreground border-b text-center text-xs font-semibold uppercase tracking-wide">
                        <th className="p-3">
                          {t('course.date')}
                        </th>
                        <th className="p-3">
                          {t('course.lesson')}
                        </th>
                        <th className="p-3">
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
                            <td className="p-3 text-center">
                              {formatMediumDate(
                                lesson.date,
                                router?.locale
                              ) || 'N/A'}
                            </td>
                            <td className="p-3 font-medium">
                              {lesson.title}
                            </td>
                            <td className="p-3 text-center">
                              {isSafeContentUrl(
                                lesson.link
                              ) && (
                                <Button
                                  variant="link"
                                  size="sm"
                                  render={
                                    <a
                                      href={lesson.link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      aria-label="View"
                                    />
                                  }
                                >
                                  View
                                </Button>
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
          {/* Discussion no longer carries its own outer margins;
              this page keeps the spacing it used to supply. */}
          {typeof window !== 'undefined' && (
            <div className="mb-12 mt-6">
              <Discussion
                type={'course'}
                item_id={router.query.slug}
              />
            </div>
          )}
        </div>
      </main>
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
