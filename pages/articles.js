import { useEffect, useMemo, useRef, useState } from 'react'

import Link from 'next/link'
import Head from 'next/head'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { useIntersectionObserver } from '../context/helpers'
import PageHeading from '@/components/PageHeading'

var Prismic = require('@prismicio/client')
import { RichText } from 'prismic-reactjs'

import moment from 'moment'
import { Search } from 'lucide-react'
import { getTranslatedFieldsDict } from '../context/helpers'
import { useInfiniteQuery } from '@tanstack/react-query'
import { useWindowVirtualizer } from '@tanstack/react-virtual'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const ARTICLES_PAGE_SIZE = 10

async function fetchArticlesPage({
  search,
  field,
  pageParam,
}) {
  const apiEndpoint =
    'https://sciteens.cdn.prismic.io/api/v2'
  const client = Prismic.default.client(apiEndpoint)
  let predicates = []

  if (search) {
    predicates.push(
      Prismic.default.Predicates.fulltext(
        'document',
        search
      )
    )
  }
  if (field) {
    predicates.push(
      Prismic.default.Predicates.at('document.tags', [
        field,
      ])
    )
  }

  const articles = await client.query(
    [
      Prismic.default.Predicates.at(
        'document.type',
        'blog'
      ),
      ...predicates,
    ],
    {
      orderings: `[document.first_publication_date desc]`,
      pageSize: ARTICLES_PAGE_SIZE,
      page: pageParam,
    }
  )

  return {
    articles: articles.results,
    nextPage:
      articles.page < articles.total_pages
        ? articles.page + 1
        : null,
    totalPages: articles.total_pages,
  }
}

function Articles({ cached_articles }) {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [field, setField] = useState('All')

  const searchParam = router.query?.search || ''
  const fieldParam =
    router.query?.field && router.query.field !== 'All'
      ? router.query.field
      : ''
  const queryPage = Number(router.query?.page || 1)
  const firstPage =
    Number.isFinite(queryPage) && queryPage > 0
      ? queryPage
      : 1

  const initialData = useMemo(() => {
    if (
      !router.isReady ||
      searchParam ||
      fieldParam ||
      firstPage !== 1 ||
      !cached_articles?.results
    ) {
      return undefined
    }

    return {
      pages: [
        {
          articles: cached_articles.results,
          nextPage:
            cached_articles.page <
            cached_articles.total_pages
              ? cached_articles.page + 1
              : null,
          totalPages: cached_articles.total_pages,
        },
      ],
      pageParams: [1],
    }
  }, [
    router.isReady,
    searchParam,
    fieldParam,
    firstPage,
    cached_articles,
  ])

  const articlesQuery = useInfiniteQuery({
    queryKey: [
      'articles',
      searchParam,
      fieldParam,
      firstPage,
    ],
    enabled: router.isReady,
    initialPageParam: firstPage,
    initialData,
    queryFn: ({ pageParam }) =>
      fetchArticlesPage({
        search: searchParam,
        field: fieldParam,
        pageParam,
      }),
    getNextPageParam: (lastPage) => lastPage.nextPage,
  })

  const articles = useMemo(
    () =>
      articlesQuery.data?.pages.flatMap(
        (page) => page.articles
      ) || [],
    [articlesQuery.data]
  )
  const loading =
    articlesQuery.isLoading && articles.length === 0
  const { hasNextPage, isFetchingNextPage, fetchNextPage } =
    articlesQuery

  useEffect(() => {
    if (articlesQuery.isError) {
      console.error(
        'Failed to load articles:',
        articlesQuery.error
      )
    }
  }, [articlesQuery.isError, articlesQuery.error])

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

  const imageLoader = ({ src, width, height }) => {
    return `${src}?fit=crop&crop=faces&w=${
      width || 256
    }&h=${height || 256}`
  }

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
      pathname: '/articles',
      query: q,
    })
  }

  async function handleFieldSearch(field) {
    let q = {}
    q.field = field
    router.push({
      pathname: '/articles',
      query: q,
    })
    setField(field)
  }

  function readingTime(article) {
    let article_length = 0
    article.map((text) => {
      if (text.type == 'paragraph' && text.text) {
        article_length += text.text?.split(' ').length
      }
    })
    let time_to_read = Math.max(
      1,
      Math.round(article_length / 200)
    )

    return `${time_to_read} minute read · ${article_length} words`
  }

  const { t } = useTranslation('common')

  const articleVirtualizer = useWindowVirtualizer({
    count: articles.length,
    estimateSize: () => 340,
    overscan: 5,
  })

  const articlesComponent = (
    <div
      className="relative w-full"
      style={{
        height: `${articleVirtualizer.getTotalSize()}px`,
      }}
    >
      {articleVirtualizer
        .getVirtualItems()
        .map((virtualRow) => {
          const article = articles[virtualRow.index]
          if (!article) return null

          const author_image = article.data.body.map(
            (slice, index) => {
              if (slice.slice_type == 'about_the_author') {
                return (
                  <div
                    className="relative h-6 w-6 lg:h-8 lg:w-8"
                    key={index}
                  >
                    <Image
                      alt={`${article.data.author} headshot`}
                      className="h-6 w-6 rounded-full lg:h-8 lg:w-8"
                      height={48}
                      width={48}
                      loader={imageLoader}
                      src={slice.primary.headshot.url}
                    />
                  </div>
                )
              } else {
                return null
              }
            }
          )

          return (
            <div
              key={article.id}
              ref={articleVirtualizer.measureElement}
              data-index={virtualRow.index}
              className="absolute left-0 top-0 w-full pt-6 md:pt-8"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <Link
                href={`/article/${article.uid}`}
                className="animate-in bg-card text-card-foreground ring-border/60 fade-in slide-in-from-right-8 z-50 flex cursor-pointer flex-row items-center rounded-xl p-4 shadow-sm ring-1 transition duration-300 hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="relative h-full max-w-[100px] md:max-w-[200px]">
                  <Image
                    alt={RichText.asText(
                      article.data.title
                    )}
                    className="shrink-0 rounded-lg object-cover"
                    loader={imageLoader}
                    src={article.data.image.url}
                    width={256}
                    height={256}
                  />
                </div>
                <div className="ml-4 w-3/4 lg:w-11/12">
                  <div className="mb-3 flex flex-row items-center">
                    {author_image}
                    <p className="ml-3">
                      {article.data.author}
                    </p>
                  </div>
                  <h3 className="line-clamp-2 mb-2 text-base font-semibold md:text-xl lg:text-2xl">
                    {RichText.asText(article.data.title)}
                  </h3>
                  <p className="line-clamp-none md:line-clamp-2 mb-2 hidden text-sm md:flex lg:text-base">
                    {article.data.description}
                  </p>
                  <p className="flex text-xs">
                    {moment(article.data.date)
                      .locale(router?.locale || 'en')
                      .format('ll') +
                      ' · ' +
                      readingTime(article.data.text)}
                  </p>
                </div>
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
          className="bg-muted z-50 mt-4 h-16 rounded-xl p-4 shadow-sm"
        ></div>
      )
    })

  return (
    <>
      <Head>
        <title>{`${field ? field + ' ' : ''} Articles ${
          search ? 'related to ' + search : ''
        } | SciTeens`}</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="SciTeens Articles Page"
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, articles, teen science"
        />
        <meta property="og:type" content="website" />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
      </Head>
      <div className="text-foreground mx-auto mb-24 mt-8 flex min-h-screen flex-row overflow-x-hidden md:overflow-visible lg:mx-16 xl:mx-32">
        <div className="mx-auto w-11/12 md:w-[85%] lg:mx-0 lg:w-[60%]">
          <PageHeading className="ml-4 py-4 text-left">
            {t('articles.articles')} 📰
          </PageHeading>
          <form
            onSubmit={(e) => handleSearch(e)}
            className="flex flex-col gap-2 lg:hidden"
          >
            <div className="flex flex-row gap-2">
              <Button
                type="submit"
                size="icon"
                onClick={(e) => handleSearch(e)}
              >
                <Search
                  aria-hidden="true"
                  className="h-5 w-5"
                />
              </Button>
              <Input
                onChange={(e) =>
                  handleChange(e, 'searchbar')
                }
                value={search}
                name="search"
                placeholder="Search..."
                required
                type="text"
                aria-label="search"
                maxLength="100"
                className="bg-card border-gray-300 shadow-sm"
              />
            </div>
            <Select
              name="field"
              value={field}
              onValueChange={(value) =>
                handleFieldSearch(value)
              }
            >
              <SelectTrigger
                id="field"
                className="bg-card w-full border-gray-300 shadow-sm"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(
                  getTranslatedFieldsDict(t)
                ).map(([key, value]) => {
                  return (
                    <SelectItem key={key} value={key}>
                      {value}
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </form>
          {loading ? loadingComponent : articlesComponent}
          {articlesQuery.isFetchingNextPage &&
            loadingComponent.slice(0, 2)}
          {articles.length === 0 && !loading && (
            <div className="mx-auto mt-20 text-center">
              <i className="text-xl font-semibold">
                {t('articles.sorry')}{' '}
                {router?.query.search == undefined
                  ? router?.query.field
                  : router?.query.search}
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
              {t('articles.search_articles')}
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
                className="bg-card mr-3 border-gray-300 shadow-sm"
                type="text"
                aria-label="search"
                maxLength="100"
              />
              <Button
                type="submit"
                onClick={(e) => handleSearch(e)}
              >
                {t('articles.search')}
              </Button>
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
                        : 'bg-card hover:bg-muted mb-4 mr-4 rounded-full border border-gray-300 shadow-sm'
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
  const translations = await serverSideTranslations(
    locale,
    ['common']
  )
  try {
    const apiEndpoint =
      'https://sciteens.cdn.prismic.io/api/v2'
    const client = Prismic.client(apiEndpoint)
    const articles = await client.query(
      [Prismic.Predicates.at('document.type', 'blog')],
      {
        orderings: `[document.first_publication_date desc]`,
        pageSize: ARTICLES_PAGE_SIZE,
      }
    )

    return {
      props: { cached_articles: articles, ...translations },
    }
  } catch (e) {
    console.error(e)
    return {
      notFound: true,
    }
  }
}

export default Articles
