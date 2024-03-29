import { useEffect, useState } from 'react'

import Link from 'next/link'
import Head from 'next/head'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

var Prismic = require('@prismicio/client')
import { RichText } from 'prismic-reactjs'

import moment from 'moment'
import {
  useSpring,
  animated,
  config,
} from '@react-spring/web'
import { getTranslatedFieldsDict } from '../context/helpers'
import ReactPaginate from 'react-paginate'

function Articles({ cached_articles }) {
  const router = useRouter()
  const [articles, setArticles] = useState(cached_articles)
  const [page, setPage] = useState(0)

  useEffect(async () => {
    let isSubscribed = true
    if (isSubscribed) {
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
      const as = await client.query(
        [
          Prismic.default.Predicates.at(
            'document.type',
            'blog'
          ),
          ...predicates,
        ],
        {
          orderings: `[document.first_publication_date desc]`,
          pageSize: 10,
          page: router.query?.page ? router.query.page : 1,
        }
      )
      setArticles(as)
      moment.locale(router?.locale ? router.locale : 'en')
    }

    return () => (isSubscribed = false)
  }, [router])

  const [search, setSearch] = useState('')
  const [field, setField] = useState('All')

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
    // router.push(`/articles?${search.trim() ? 'search=' + search.trim() : ''}${field ? '&field=' + field : ''}`)
  }

  async function handlePageChange(e) {
    setPage(e.selected)
    console.log(e.selected)
    let q = {}
    if (search) {
      q.search = search
    }
    if (field) {
      q.field = field
    }
    q.page = e.selected + 1
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
  }, [articles])

  const [article_spring, set] = useSpring(() => ({
    opacity: 1,
    transform: 'translateX(0)',
    from: {
      opacity: 0,
      transform: 'translateX(150px)',
    },
    config: config.slow,
  }))

  const articlesComponent = articles.results.map(
    (article, index) => {
      const author_image = article.data.body.map(
        (slice, ix) => {
          if (slice.slice_type == 'about_the_author') {
            return (
              <div
                className="relative h-6 w-6 lg:h-8 lg:w-8"
                key={index}
              >
                <Image
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
        <Link key={index} href={`/article/${article.uid}`}>
          <animated.a
            style={article_spring}
            className="z-50 mt-6 flex cursor-pointer flex-row items-center rounded-lg bg-white p-4 shadow md:mt-8"
          >
            <div className="relative h-full max-w-[100px] md:max-w-[200px]">
              <Image
                className="flex-shrink-0 rounded-lg object-cover"
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
              <h3 className="mb-2 text-base font-semibold line-clamp-2 md:text-xl lg:text-2xl">
                {RichText.asText(article.data.title)}
              </h3>
              <p className="mb-2 hidden text-sm line-clamp-none md:flex md:line-clamp-2 lg:text-base">
                {article.data.description}
              </p>
              <p className="flex text-xs">
                {moment(article.data.date).format('ll') +
                  ' · ' +
                  readingTime(article.data.text)}
              </p>
            </div>
          </animated.a>
        </Link>
      )
    }
  )

  return (
    <>
      <Head>
        <title>
          {field ? field + ' ' : ''} Articles{' '}
          {search ? 'related to ' + search : ''} | SciTeens
        </title>
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
      <div className="mx-auto mt-8 mb-24 flex min-h-screen flex-row overflow-x-hidden md:overflow-visible lg:mx-16 xl:mx-32">
        <div className="mx-auto w-11/12 md:w-[85%] lg:mx-0 lg:w-[60%]">
          <h1 className="ml-4 py-4 text-left text-4xl font-semibold">
            {t('articles.articles')} 📰
          </h1>
          <form
            onSubmit={(e) => handleSearch(e)}
            className="flex flex-row lg:hidden"
          >
            <button
              type="submit"
              className="outline-none w-auto rounded-l-lg bg-sciteensLightGreen-regular px-3 font-semibold text-white shadow hover:bg-sciteensLightGreen-dark disabled:opacity-50"
              onClick={(e) => handleSearch(e)}
            >
              <img
                src="assets/zondicons/search.svg"
                alt="Search"
                className="h-10"
              />
            </button>
            <input
              onChange={(e) => handleChange(e, 'searchbar')}
              value={search}
              name="search"
              placeholder="Search..."
              required
              className={`focus:outline-none w-full appearance-none border-2 border-transparent bg-white p-2 leading-tight text-gray-700 shadow focus:border-sciteensLightGreen-regular focus:bg-white focus:placeholder-gray-700`}
              type="text"
              aria-label="search"
              maxLength="100"
            />
            <select
              onChange={(e) =>
                handleFieldSearch(e.target.value)
              }
              name="field"
              id="field"
              value={field}
              className="focus:outline-none w-1/2 appearance-none rounded-r-lg border-2 border-transparent bg-white p-2 leading-tight text-gray-700 placeholder-sciteensGreen-regular shadow focus:border-sciteensGreen-regular focus:bg-white focus:placeholder-gray-700"
            >
              {Object.entries(
                getTranslatedFieldsDict(t)
              ).map(([key, value]) => {
                return (
                  <option key={key} value={key}>
                    {value}
                  </option>
                )
              })}
            </select>
          </form>
          {articlesComponent}
          {articles.results.length === 0 && (
            <div className="mx-auto mt-20 text-center">
              <i className="text-xl font-semibold">
                {t('articles.sorry')}{' '}
                {router?.query.search == undefined
                  ? router?.query.field
                  : router?.query.search}
              </i>
            </div>
          )}
          <div className="flex w-full items-center justify-center">
            <ReactPaginate
              breakLabel="..."
              nextLabel=">"
              onPageChange={(e) => handlePageChange(e)}
              pageRangeDisplayed={2}
              pageCount={articles.total_pages}
              previousLabel="<"
              renderOnZeroPageCount={false}
              className="mx-auto mt-2 flex h-full flex-row items-center gap-2 font-bold"
              pageClassName="rounded-lg px-3 py-2 bg-white text-black shadow h-full"
              previousLinkClassName="rounded-lg px-3 py-2 bg-white text-black shadow h-full"
              nextLinkClassName="rounded-lg px-3 py-2 bg-white text-black shadow h-full"
              activeLinkClassName="text-sciteensGreen-regular"
              disableInitialCallback={false}
            ></ReactPaginate>
          </div>
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
                {t('articles.search')}
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
        pageSize: 10,
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
