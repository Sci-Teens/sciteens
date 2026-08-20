import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ThumbsDown, ThumbsUp } from 'lucide-react'
import SocialMeta from '../../components/SocialMeta'
import Discussion from '../../components/Discussion'
import MarkdownContent from '../../components/MarkdownContent'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { logEvent, getAnalytics } from 'firebase/analytics'
import { hasAnalyticsConsent } from '../../lib/consent'
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
            : article.title,
        })
      } else {
        setVote('negative')
        return logEvent(analytics, 'rage_negative', {
          page_location: window.location.href
            ? window.location.href
            : article.title,
        })
      }
    }
    setVote(type)
  }

  const translatedFields = getTranslatedFieldsDict(t)
  const publishedDate = formatMediumDate(
    article.date,
    router?.locale
  )

  const authorAvatar = article.authorHeadshot && (
    <span className="bg-muted relative block h-12 w-12 shrink-0 overflow-hidden rounded-full">
      <img
        src={article.authorHeadshot.src}
        alt=""
        width={article.authorHeadshot.width}
        height={article.authorHeadshot.height}
        loading="lazy"
        decoding="async"
        className="h-full w-full object-cover"
      />
    </span>
  )

  return (
    <>
      <SocialMeta
        title={`${article.title} | SciTeens`}
        description={article.description}
        eyebrow="Article"
        badge={article.author}
        path={router.asPath}
      />
      <DetailMain>
        <PageHeading>{article.title}</PageHeading>
        <HeadingRule />

        <div className="mt-6 flex items-center gap-3 md:mt-7">
          {authorAvatar}
          <div className="min-w-0 text-sm">
            <p className="font-medium">
              {t('article.by')} {article.author}
            </p>
            <p className="text-muted-foreground mt-0.5">
              {publishedDate} ·{' '}
              {t('articles.reading_time', {
                minutes: article.minutes,
              })}
            </p>
          </div>
        </div>

        {article.description && (
          <p className="text-muted-foreground text-pretty mt-6 text-base leading-relaxed md:mt-7 md:text-lg">
            {article.description}
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

        {/* Plain <img>, not next/image: the file is already WebP at the
            width this column renders, and /_next/image would re-encode it
            on every Cloud Run cold start for no gain. Eager and
            high-priority because this is the LCP candidate. */}
        <img
          src={article.cover.src}
          alt=""
          width={article.cover.width}
          height={article.cover.height}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          className="border-border/60 mt-8 h-auto w-full rounded-xl border object-cover"
        />

        <MarkdownContent
          as="article"
          hast={article.body}
          className="prose lg:prose-lg wrap-break-word mt-8 max-w-none"
        />

        <div className="mt-10 space-y-4">
          {article.authorBio && (
            <Card className="border-border/60">
              <CardContent className="p-5 md:p-6">
                <h2 className="text-base font-semibold">
                  {t('article.about_the_author')}
                </h2>
                <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                  {article.authorHeadshot && (
                    <span className="bg-muted relative block h-20 w-20 shrink-0 overflow-hidden rounded-full">
                      <img
                        src={article.authorHeadshot.src}
                        alt=""
                        width={article.authorHeadshot.width}
                        height={
                          article.authorHeadshot.height
                        }
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </span>
                  )}
                  {/* Markdown, not flattened text: the Prismic page ran
                      the bio through RichText.asText, which silently
                      dropped every link in it. */}
                  <MarkdownContent
                    hast={article.authorBio}
                    className="prose prose-sm text-muted-foreground max-w-none text-center sm:text-left"
                  />
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
                    key={recommendation.slug}
                    className="basis-4/5 sm:basis-1/2 lg:basis-1/3"
                  >
                    <Card className="border-border/60 hover:border-border hover:bg-muted/40 relative isolate h-full overflow-hidden transition-colors">
                      {/* Inset outline: Card clips overflow, so the
                          global 2px-offset focus ring would be cut. */}
                      <Link
                        href={`/article/${recommendation.slug}`}
                        aria-label={recommendation.title}
                        className="focus-visible:outline-ring focus-visible:-outline-offset-2 absolute inset-0 z-10 rounded-xl focus-visible:outline-2"
                      />
                      <CardContent className="flex h-full flex-col gap-3">
                        <div className="bg-muted relative aspect-video w-full shrink-0 overflow-hidden rounded-lg">
                          {/* Small slot, and the source cover is 1200w,
                              so this one is worth resizing through
                              next/image. The full-width cover above is
                              already the right size and is not. */}
                          <Image
                            src={recommendation.cover}
                            alt=""
                            fill
                            sizes="(min-width: 1024px) 240px, (min-width: 640px) 45vw, 75vw"
                            className="object-cover"
                            loading="lazy"
                          />
                        </div>
                        <div className="min-w-0">
                          <h3 className="line-clamp-2 text-pretty text-base font-semibold">
                            {recommendation.title}
                          </h3>
                          <p className="text-muted-foreground line-clamp-2 mt-1.5 text-sm leading-relaxed">
                            {recommendation.description}
                          </p>
                          <p className="text-muted-foreground line-clamp-1 mt-2 text-xs">
                            {t('article.by')}{' '}
                            {recommendation.author} ·{' '}
                            {formatMediumDate(
                              recommendation.date,
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
  const { getArticleSlugs } = await import(
    '../../lib/content'
  )
  return {
    paths: getArticleSlugs().map((slug) => ({
      params: { slug },
    })),
    fallback: false,
  }
}

export async function getStaticProps({ params, locale }) {
  const { getArticle, getRecommendations } = await import(
    '../../lib/content'
  )
  const article = getArticle(params?.slug)
  if (!article) return { notFound: true }

  return {
    props: {
      article,
      recommendations: getRecommendations(article.slug),
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}

export default Article
