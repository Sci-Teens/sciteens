import { RichText } from 'prismic-reactjs'
import { useState } from 'react'
var Prismic = require('@prismicio/client')
import Link from 'next/link'
import moment from 'moment'
import Image from 'next/image'
import SocialMeta from '../../components/SocialMeta'
import htmlSerializer from '../../htmlserializer'
import Discussion from '../../components/Discussion'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { logEvent, getAnalytics } from 'firebase/analytics'
import { hasAnalyticsConsent } from '../../lib/consent'
import { createCropImageLoader } from '../../lib/prismicImageLoader'
import { getTranslatedFieldsDict } from '../../context/helpers'
import { Button } from '@/components/ui/button'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

function Article({ article, recommendations }) {
  const [vote, setVote] = useState(null)
  const isAmp = false
  const { t } = useTranslation('common')
  // Lazily fetched inside handleRate, never at module render — calling
  // getAnalytics() initializes GA4 and sets its cookies immediately, so it
  // must stay behind the same consent gate as page-view logging
  // (components/Analytics.js).

  async function handleRate(type) {
    if (
      typeof window !== 'undefined' &&
      hasAnalyticsConsent()
    ) {
      const analytics = getAnalytics()
      if (type == 'positive') {
        setVote('positive')
        return logEvent(analytics, 'rate_positive', {
          page_location: window.location.href
            ? window.location.href
            : RichText.asText(article.data.title),
        })
      } else {
        setVote('negative')
        return logEvent(analytics, 'rage_negative', {
          page_location: window.location.href
            ? window.location.href
            : RichText.asText(article.data.title),
        })
      }
    }
    setVote(type)
  }

  // Each usage below gets its own loader tuned to its own display
  // aspect ratio (cover, square avatars, 16:9 recommendation
  // thumbnails) — sharing one loader across mismatched shapes is
  // what previously stretched avatars and thumbnails out of shape.
  const coverImageLoader = createCropImageLoader(670, 400)
  const avatarImageLoader = createCropImageLoader(256, 256)
  const recommendationImageLoader = createCropImageLoader(
    1280,
    720
  )
  const translatedFields = getTranslatedFieldsDict(t)

  function readingTime(article) {
    let article_length = 0
    article?.map((text) => {
      if (text.type == 'paragraph' && text.text) {
        article_length += text.text?.split(' ').length
      }
    })
    let time_to_read = Math.max(
      1,
      Math.round(article_length / 200)
    )

    return `${time_to_read} minute read`
  }

  const about_the_author = article.data.body.map(
    (slice, index) => {
      if (slice.slice_type == 'about_the_author') {
        return (
          <div key={index} className="inline-block">
            <h3>{t('article.about_the_author')}</h3>
            <div className="flex flex-col items-center gap-4 lg:flex-row">
              <div className="not-prose relative h-20 w-20 shrink-0 overflow-hidden rounded-full">
                <Image
                  fill
                  sizes="80px"
                  className="object-cover"
                  loader={avatarImageLoader}
                  src={slice.primary.headshot.url}
                  alt={RichText.asText(
                    slice.primary.information
                  )}
                />
              </div>
              <p className="text-center lg:text-left">
                {RichText.asText(slice.primary.information)}
              </p>
            </div>
          </div>
        )
      } else {
        return null
      }
    }
  )

  const interviews = article.data.body.map((slice) => {
    if (slice.slice_type == 'interview') {
      return (
        <>
          <h3>{t('article.interview')}</h3>
          {slice.items.map((interview, ix) => {
            return (
              <div key={ix} className="inline-block">
                <div className="flex flex-col items-center gap-4 lg:flex-row">
                  <div className="not-prose relative h-20 w-20 shrink-0 overflow-hidden rounded-full">
                    <Image
                      fill
                      sizes="80px"
                      className="object-cover"
                      loader={avatarImageLoader}
                      src={interview.headshot.url}
                      alt={RichText.asText(
                        interview.information
                      )}
                    />
                  </div>
                  <h4
                    className="text-center lg:text-left"
                    style={{
                      marginTop: 0,
                      marginBottom: 0,
                    }}
                  >
                    {RichText.asText(interview.information)}
                  </h4>
                </div>
                {RichText.render(interview.interview)}
              </div>
            )
          })}
        </>
      )
    } else {
      return null
    }
  })

  const author_image = article.data.body.map((slice) => {
    if (slice.slice_type == 'about_the_author') {
      return (
        <div
          key={slice.primary.headshot.url}
          className="not-prose relative h-12 w-12 shrink-0 overflow-hidden rounded-full"
        >
          <Image
            fill
            sizes="48px"
            className="object-cover"
            loader={avatarImageLoader}
            src={slice.primary.headshot.url}
            alt={article.data.author}
          />
        </div>
      )
    } else {
      return null
    }
  })

  const recommendationsRendered = recommendations.map(
    (a, index) => {
      return (
        <CarouselItem
          key={index}
          className="basis-3/4 md:basis-1/3"
        >
          <Link
            href={`/article/${a.uid}`}
            className="bg-card block cursor-pointer rounded-lg p-4 shadow-sm hover:shadow-md"
          >
            <div className="relative aspect-video w-full overflow-hidden rounded-lg">
              <Image
                fill
                sizes="(min-width: 768px) 31vw, 75vw"
                className="object-cover"
                loader={recommendationImageLoader}
                src={a.data.image.url}
                alt={RichText.asText(a.data.title)}
              />
            </div>
            <div>
              <h3 className="line-clamp-1 text-lg font-semibold">
                {RichText.asText(a.data.title)}
              </h3>
              <p className="line-clamp-3 mb-auto text-sm">
                {a.data.description}
              </p>
              <p className="line-clamp-1 mt-2 hidden text-sm lg:flex">
                By{' '}
                {a.data.author +
                  ' · ' +
                  moment(a.data.date).format('ll') +
                  ' · ' +
                  readingTime(a.data.text)}
              </p>
            </div>
          </Link>
        </CarouselItem>
      )
    }
  )

  const router = useRouter()
  return (
    <>
      {isAmp ? (
        <h3>AMP article in progress...</h3>
      ) : (
        <>
          <SocialMeta
            title={`${RichText.asText(
              article.data.title
            )} | SciTeens`}
            description={article.data.description}
            eyebrow="Article"
            badge={article.data.author}
            path={router.asPath}
          />
          <main>
            <article className="prose wrap-break-word lg:prose-lg mx-auto mt-8 overflow-hidden px-4">
              <h1>{RichText.asText(article.data.title)}</h1>
              <div>
                <div className="mb-4 flex items-center">
                  {author_image}
                  <p className="text-foreground ml-6 text-lg ">
                    {t('article.by')} {article.data.author}{' '}
                    <br />
                    <span className="text-muted-foreground">
                      {' '}
                      {moment(article.data.date).format(
                        'MMMM DD, YYYY'
                      )}{' '}
                      · {readingTime(article.data.text)}{' '}
                    </span>
                  </p>
                </div>
                <div className="not-prose flex flex-row flex-wrap">
                  {article.tags.map((tag) => {
                    return (
                      <Button
                        key={tag}
                        variant="secondary"
                        className="bg-card hover:bg-muted border-border mb-1 mr-4 rounded-full border shadow-sm"
                        render={
                          <Link
                            href={{
                              pathname: '/articles',
                              query: { field: tag },
                            }}
                          >
                            {translatedFields[tag] || tag}
                          </Link>
                        }
                      />
                    )
                  })}
                </div>
              </div>
              <div>
                {/* Cover image */}
                <Image
                  loader={coverImageLoader}
                  src={article.data.image.url}
                  alt={RichText.asText(article.data.title)}
                  width={670}
                  height={400}
                  sizes="(min-width: 1024px) 670px, 100vw"
                  className="mt-0 h-auto w-full rounded-lg object-cover"
                />

                <div>
                  <RichText
                    render={article.data.text}
                    htmlSerializer={htmlSerializer}
                  />
                </div>

                {interviews}

                {/* Thumbs Up / Thumbs Down Element */}
                <div className="bg-card flex flex-col place-items-center justify-between rounded-lg shadow-sm md:flex-row md:rounded-full">
                  <p className="text-foreground ml-0 text-sm font-semibold md:ml-14 md:text-lg lg:text-xl">
                    {t('article.rate')}
                  </p>
                  <div className="my-auto mr-0 h-auto pb-4 md:mr-14 md:pb-0">
                    <button
                      className={`mr-12 rounded-lg border-2 p-2 hover:border-green-500 hover:bg-green-50 hover:text-green-500 ${
                        vote === 'positive'
                          ? 'border-green-500 text-green-500'
                          : 'border-border text-muted-foreground'
                      }`}
                      onClick={() => handleRate('positive')}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        className="h-5 w-5 fill-current lg:h-7 lg:w-7"
                      >
                        <path d="M11 0h1v3l3 7v8a2 2 0 0 1-2 2H5c-1.1 0-2.31-.84-2.7-1.88L0 12v-2a2 2 0 0 1 2-2h7V2a2 2 0 0 1 2-2zm6 10h3v10h-3V10z" />
                      </svg>
                    </button>
                    <button
                      className={`rounded-lg border-2 p-2 hover:border-red-500 hover:bg-red-50 hover:text-red-500 ${
                        vote === 'negative'
                          ? 'border-red-500 text-red-500'
                          : 'border-border text-muted-foreground'
                      }`}
                      onClick={() => handleRate('negative')}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 20 20"
                        className="h-5 w-5 fill-current lg:h-7 lg:w-7"
                      >
                        <path d="M11 20a2 2 0 0 1-2-2v-6H2a2 2 0 0 1-2-2V8l2.3-6.12A3.11 3.11 0 0 1 5 0h8a2 2 0 0 1 2 2v8l-3 7v3h-1zm6-10V0h3v10h-3z" />
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Submit an article CTA */}
                <div className="bg-card mt-4 rounded-lg p-4 text-center shadow-sm">
                  <p className="text-foreground text-sm md:text-lg">
                    {t('article.submit_own')}{' '}
                    <a
                      href="mailto:info@sciteens.com"
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold"
                    >
                      {t('article.reach_out')}
                    </a>
                  </p>
                </div>

                {about_the_author}
              </div>
              {typeof window !== 'undefined' && (
                <Discussion
                  type={'article'}
                  item_id={router.query.slug}
                />
              )}
              <div className="bg-border my-2 h-px" />
            </article>
            <h3 className="mt-8 text-center text-2xl font-semibold md:text-5xl">
              {t('article.related')}
            </h3>
            <div className="mx-auto w-11/12 max-w-4xl pb-8">
              <Carousel opts={{ align: 'start' }}>
                <CarouselContent>
                  {recommendationsRendered}
                </CarouselContent>
                <CarouselPrevious className="left-2 lg:-left-12" />
                <CarouselNext className="right-2 lg:-right-12" />
              </Carousel>
            </div>
          </main>
        </>
      )}
    </>
  )
}

export async function getStaticPaths() {
  const apiEndpoint =
    'https://sciteens.cdn.prismic.io/api/v2'
  const client = Prismic.client(apiEndpoint)
  const res = await client.query(
    Prismic.Predicates.at('document.type', 'blog')
  )
  const pages = await Promise.all(
    Array.from({ length: res.total_pages }, (_, i) =>
      client.query(
        Prismic.Predicates.at('document.type', 'blog'),
        { pageSize: 20, page: i + 1 }
      )
    )
  )
  const paths = pages.flatMap((page) =>
    page.results.map((article) => ({
      params: { slug: article.uid },
    }))
  )
  return { paths, fallback: false }
}

export async function getStaticProps({ params, locale }) {
  try {
    const apiEndpoint =
      'https://sciteens.cdn.prismic.io/api/v2'
    const client = Prismic.client(apiEndpoint)
    const [translations, article] = await Promise.all([
      serverSideTranslations(locale, ['common']),
      client.getByUID('blog', params?.slug),
    ])
    const recommendationsQuery = await client.query([
      Prismic.Predicates.at('document.type', 'blog'),
      Prismic.Predicates.any('document.tags', article.tags),
    ])
    let recommendations = []
    let index = 0
    do {
      if (
        recommendationsQuery.results[index].uid !=
        article.uid
      ) {
        recommendations.push(
          recommendationsQuery.results[index]
        )
      }
      index++
    } while (recommendations.length < 5)

    return {
      props: {
        article: article,
        recommendations: recommendations,
        ...translations,
      },
    }
  } catch (e) {
    console.log(e)
    return {
      notFound: true,
    }
  }
}

export default Article
