import { RichText } from 'prismic-reactjs'
import { useState } from 'react'
var Prismic = require('@prismicio/client')
import Link from 'next/link'
import Image from 'next/image'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
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
import { formatMediumDate } from '../../lib/formatDate'
import { INLINE_LINK } from '../../lib/typography'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import HeadingRule from '../../components/HeadingRule'
import PageHeading from '../../components/PageHeading'
import {
  DetailLabel,
  DetailMain,
  DetailSection,
} from '../../components/DetailLayout'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel'

function Article({ article, recommendations }) {
  const [vote, setVote] = useState(null)
  const router = useRouter()
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

  // Prismic stores the running text as blocks; only paragraphs carry
  // prose, so headings and embeds must not inflate the estimate.
  function readingTime(text) {
    const words = (text ?? []).reduce(
      (total, block) =>
        block.type === 'paragraph' && block.text
          ? total + block.text.split(' ').length
          : total,
      0
    )
    const minutes = Math.max(1, Math.round(words / 200))

    // Same key the listing card renders, so the estimate a reader saw
    // on /articles is worded identically here.
    return t('articles.reading_time', { minutes })
  }

  const authorSlice = article.data.body.find(
    (slice) => slice.slice_type === 'about_the_author'
  )
  const interviewSlices = article.data.body.filter(
    (slice) => slice.slice_type === 'interview'
  )
  const publishedDate = formatMediumDate(
    article.data.date,
    router?.locale
  )

  const authorAvatar = authorSlice && (
    <div className="bg-muted relative h-12 w-12 shrink-0 overflow-hidden rounded-full">
      <Image
        fill
        sizes="48px"
        className="object-cover"
        loader={avatarImageLoader}
        src={authorSlice.primary.headshot.url}
        alt=""
      />
    </div>
  )

  return (
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
      <DetailMain>
        <PageHeading>
          {RichText.asText(article.data.title)}
        </PageHeading>
        <HeadingRule />

        <div className="mt-6 flex items-center gap-3 md:mt-7">
          {authorAvatar}
          <div className="min-w-0 text-sm">
            <p className="font-medium">
              {t('article.by')} {article.data.author}
            </p>
            <p className="text-muted-foreground mt-0.5">
              {publishedDate} ·{' '}
              {readingTime(article.data.text)}
            </p>
          </div>
        </div>

        {article.data.description && (
          <p className="text-muted-foreground text-pretty mt-6 text-base leading-relaxed md:mt-7 md:text-lg">
            {article.data.description}
          </p>
        )}

        {article.tags.length > 0 && (
          <div className="mt-8">
            <DetailLabel>{t('article.topics')}</DetailLabel>
            <div className="mt-3 flex flex-wrap gap-2">
              {article.tags.map((tag) => (
                <Link
                  key={tag}
                  href={{
                    pathname: '/articles',
                    query: { field: tag },
                  }}
                  className="border-border/60 bg-card text-foreground hover:bg-muted inline-flex items-center rounded-full border px-3 py-1 text-sm transition-colors"
                >
                  {translatedFields[tag] || tag}
                </Link>
              ))}
            </div>
          </div>
        )}

        <Image
          loader={coverImageLoader}
          src={article.data.image.url}
          alt=""
          width={670}
          height={400}
          sizes="(min-width: 768px) 768px, 100vw"
          priority
          className="border-border/60 mt-8 h-auto w-full rounded-xl border object-cover"
        />

        <article className="prose lg:prose-lg wrap-break-word mt-8 max-w-none">
          <RichText
            render={article.data.text}
            htmlSerializer={htmlSerializer}
          />

          {interviewSlices.map((slice, index) => (
            <section key={`interview-${index}`}>
              <h2>{t('article.interview')}</h2>
              {slice.items.map((interview, ix) => (
                <div key={`interview-${index}-${ix}`}>
                  <div className="flex flex-col items-center gap-4 sm:flex-row">
                    <div className="not-prose bg-muted relative h-20 w-20 shrink-0 overflow-hidden rounded-full">
                      <Image
                        fill
                        sizes="80px"
                        className="object-cover"
                        loader={avatarImageLoader}
                        src={interview.headshot.url}
                        alt=""
                      />
                    </div>
                    <h3 className="my-0 text-center sm:text-left">
                      {RichText.asText(
                        interview.information
                      )}
                    </h3>
                  </div>
                  {RichText.render(interview.interview)}
                </div>
              ))}
            </section>
          ))}
        </article>

        <div className="mt-10 space-y-4">
          {authorSlice && (
            <Card className="border-border/60">
              <CardContent className="p-5 md:p-6">
                <h2 className="text-base font-semibold">
                  {t('article.about_the_author')}
                </h2>
                <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  <div className="bg-muted relative h-20 w-20 shrink-0 overflow-hidden rounded-full">
                    <Image
                      fill
                      sizes="80px"
                      className="object-cover"
                      loader={avatarImageLoader}
                      src={authorSlice.primary.headshot.url}
                      alt=""
                    />
                  </div>
                  <p className="text-muted-foreground text-pretty text-center text-sm leading-relaxed sm:text-left">
                    {RichText.asText(
                      authorSlice.primary.information
                    )}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card className="border-border/60">
            <CardContent className="flex flex-col items-center justify-between gap-4 p-5 sm:flex-row md:p-6">
              <p className="text-pretty font-semibold">
                {t('article.rate')}
              </p>
              <div className="flex shrink-0 items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  aria-label={t('article.rate_yes')}
                  aria-pressed={vote === 'positive'}
                  onClick={() => handleRate('positive')}
                  className={cn(
                    vote === 'positive' &&
                      'border-sciteensGreen-dark bg-sciteensGreen-dark/10 text-sciteensGreen-dark hover:bg-sciteensGreen-dark/15 hover:text-sciteensGreen-dark'
                  )}
                >
                  <ThumbsUp
                    className="size-4"
                    aria-hidden="true"
                  />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon-lg"
                  aria-label={t('article.rate_no')}
                  aria-pressed={vote === 'negative'}
                  onClick={() => handleRate('negative')}
                  className={cn(
                    vote === 'negative' &&
                      'border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/15 hover:text-destructive'
                  )}
                >
                  <ThumbsDown
                    className="size-4"
                    aria-hidden="true"
                  />
                </Button>
              </div>
              {/* Screen-reader-only, matching ProjectUpvoteButton: the
                pressed button colour is the sighted confirmation, and a
                permanently mounted visible line would leave an empty
                row in the card before any vote. */}
              <span
                role="status"
                aria-live="polite"
                className="sr-only"
              >
                {vote ? t('article.rate_thanks') : ''}
              </span>
            </CardContent>
          </Card>

          <Card className="border-border/60">
            <CardContent className="p-5 text-center md:p-6">
              <p className="text-pretty text-sm md:text-base">
                {t('article.submit_own')}{' '}
                <a
                  href="mailto:info@sciteens.org"
                  className={INLINE_LINK}
                >
                  {t('article.reach_out')}
                </a>
              </p>
            </CardContent>
          </Card>
        </div>

        <DetailSection>
          <Discussion
            type="article"
            item_id={router.query.slug}
          />
        </DetailSection>

        {recommendations.length > 0 && (
          <DetailSection title={t('article.related')}>
            <Carousel
              opts={{ align: 'start' }}
              className="mt-4"
            >
              <CarouselContent>
                {recommendations.map((recommendation) => (
                  <CarouselItem
                    key={recommendation.uid}
                    className="basis-4/5 sm:basis-1/2 lg:basis-1/3"
                  >
                    <Card className="border-border/60 hover:border-border hover:bg-muted/40 relative isolate h-full overflow-hidden transition-colors">
                      {/* Inset outline: Card clips overflow, so the
                          global 2px-offset focus ring would be cut. */}
                      <Link
                        href={`/article/${recommendation.uid}`}
                        aria-label={RichText.asText(
                          recommendation.data.title
                        )}
                        className="focus-visible:outline-ring focus-visible:-outline-offset-2 absolute inset-0 z-10 rounded-xl focus-visible:outline-2"
                      />
                      <CardContent className="flex h-full flex-col gap-3">
                        <div className="bg-muted relative aspect-video w-full shrink-0 overflow-hidden rounded-lg">
                          <Image
                            fill
                            sizes="(min-width: 1024px) 240px, (min-width: 640px) 45vw, 75vw"
                            className="object-cover"
                            loader={
                              recommendationImageLoader
                            }
                            src={
                              recommendation.data.image.url
                            }
                            alt=""
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-pretty text-base font-semibold">
                            {RichText.asText(
                              recommendation.data.title
                            )}
                          </h3>
                          <p className="text-muted-foreground line-clamp-2 mt-1.5 text-sm leading-relaxed">
                            {
                              recommendation.data
                                .description
                            }
                          </p>
                          <p className="text-muted-foreground line-clamp-1 mt-2 text-xs">
                            {t('article.by')}{' '}
                            {recommendation.data.author} ·{' '}
                            {formatMediumDate(
                              recommendation.data.date,
                              router?.locale
                            )}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-2 lg:-left-12" />
              <CarouselNext className="right-2 lg:-right-12" />
            </Carousel>
          </DetailSection>
        )}
      </DetailMain>
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
