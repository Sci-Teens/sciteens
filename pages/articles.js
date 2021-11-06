var Prismic = require("@prismicio/client");
import Link from 'next/link'
import Image from 'next/image';
import { RichText } from 'prismic-reactjs';
import { useRouter } from "next/router"
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useSpring, animated, config } from '@react-spring/web'

function Articles({ articles }) {
    const router = useRouter()
    const [search, setSearch] = useState('')
    const [field, setField] = useState('All')
    const [field_names] = useState([
        "All",
        "Biology",
        "Chemistry",
        "Cognitive Science",
        "Computer Science",
        "Earth Science",
        "Electrical Engineering",
        "Environmental Science",
        "Mathematics",
        "Mechanical Engineering",
        "Medicine",
        "Physics",
        "Space Science",
    ])

    const imageLoader = ({ src, width, height }) => {
        return `${src}?fit=crop&crop=faces&w=${width || 256}&h=${height || 256}`
    }

    useEffect(() => {
        if (router?.isReady) {
            setSearch(router.query?.search ? router.query.search : '')
            setField(router.query?.field ? router.query.field : '')
        }
    }, [router])

    async function handleChange(e, target) {
        e.preventDefault();
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
            query: q
        })
        // router.push(`/articles?${search.trim() ? 'search=' + search.trim() : ''}${field ? '&field=' + field : ''}`)
    }

    async function handleFieldSearch(field) {
        let q = {}
        q.field = field
        router.push({
            pathname: '/articles',
            query: q
        })
        setField(field)
    }

    function trimArticleDescription(summary) {
        if (summary.length > 150) {
            summary = summary.substring(0, 150) + "..."
        }
        return summary
    }

    // REACT SPRING ANIMATIONS
    useEffect(() => {
        set({ opacity: 0, transform: 'translateX(80px)', config: { tension: 10000, clamp: true } })
        window.setTimeout(function () { set({ opacity: 1, transform: 'translateX(0)', config: config.default }) }, 10)
    }, [articles])

    const [article_spring, set] = useSpring(() => ({
        opacity: 1,
        transform: 'translateX(0)',
        from: {
            opacity: 0,
            transform: 'translateX(80px)'
        }
    }))

    const articlesComponent = articles.results.map((article, index) => {

        const author_image = article.data.body.map((slice, ix) => {
            if (slice.slice_type == "about_the_author") {
                return (
                    // <img src={slice.primary.headshot.url} />
                    <div className="relative h-6 w-6 lg:h-8 lg:w-8" key={index}>
                        <Image className="rounded-full h-6 w-6 lg:h-8 lg:w-8" height={48} width={48} loader={imageLoader} src={slice.primary.headshot.url} />
                    </div>

                )
            }
            else {
                return null
            }
        })

        return (
            <Link key={index} href={`/article/${article.uid}`}>
                <animated.a style={article_spring} className="cursor-pointer p-4 bg-white shadow rounded-lg z-50 mt-6 md:mt-8 flex flex-row items-center">
                    <div className="h-full max-w-[100px] md:max-w-[200px] relative">
                        <Image className="rounded-lg object-cover flex-shrink-0" loader={imageLoader} src={article.data.image.url} width={256} height={256} />

                    </div>
                    <div className="ml-4 w-3/4 lg:w-11/12">
                        <div className="flex flex-row items-center mb-3">
                            {author_image}
                            <p className="ml-3">{article.data.author}</p>
                        </div>
                        <h3 className="font-semibold text-base md:text-xl lg:text-2xl mb-2">{RichText.asText(article.data.title)}</h3>
                        <p className="hidden md:block text-sm lg:text-base">{trimArticleDescription(article.data.description)}</p>
                    </div>

                </animated.a>
            </Link >
        )
    })


    return (
        <>
            <Head>
                <title>{field ? field + ' ' : ''} Articles {search ? 'related to ' + search : ''} | SciTeens</title>
                <link rel="icon" href="/favicon.ico" />
                <meta name="description" content="SciTeens Articles Page" />
                <meta name="keywords" content="SciTeens, sciteens, articles, teen science" />
            </Head>
            <div className="min-h-screen mx-auto lg:mx-16 xl:mx-32 flex flex-row mt-8 mb-24">
                <div className="w-11/12 md:w-[85%] mx-auto lg:mx-0 lg:w-[60%]">
                    <h1 className="text-4xl py-4 text-left font-semibold ml-4">
                        Articles 📰
                    </h1>
                    <form onSubmit={e => handleSearch(e)} className="flex flex-row lg:hidden">
                        <button type="submit" className="min-w-[13%] md:min-w-[7%] bg-sciteensLightGreen-regular text-white font-semibold rounded-l-lg px-3 hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                            onClick={e => handleSearch(e)}>
                            <img src="assets/zondicons/search.svg" alt="Search" className="h-6 w-6" />
                        </button>
                        <input
                            onChange={e => handleChange(e, 'searchbar')}
                            value={search}
                            name="search"
                            placeholder="Search..."
                            required
                            className={`appearance-none border-transparent border-2 bg-white w-full p-2 leading-tight focus:outline-none focus:bg-white focus:placeholder-gray-700 focus:border-sciteensLightGreen-regular text-gray-700 shadow`}
                            type="text"
                            aria-label="search"
                            maxLength="100"
                        />
                        <select
                            onChange={e => setField(e.target.value)}
                            name="field"
                            id="field"
                            value={field}
                            className="w-1/2 appearance-none border-transparent border-2 bg-white p-2 leading-tight rounded-r-lg focus:outline-none focus:bg-white focus:placeholder-gray-700 focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular shadow"
                        >
                            {
                                field_names.map((name) => {
                                    return (
                                        <option key={name} value={name}>
                                            {name}
                                        </option>
                                    )
                                })
                            }
                        </select>
                    </form>
                    {articlesComponent}
                    {articles.results.length === 0 &&
                        <div className="mx-auto text-center mt-20">
                            <i className="font-semibold text-xl">
                                Sorry, we couldn't find any searches related to {router?.query.search == undefined ? router?.query.field : router?.query.search}
                            </i>
                        </div>
                    }
                </div>
                <div className="hidden lg:block w-0 lg:w-[30%] lg:ml-32">
                    <div className="sticky top-1/2 transform -translate-y-1/2 w-full">
                        <h2 className="text-xl text-gray-700 mb-2">Search Articles</h2>
                        <form onSubmit={e => handleSearch(e)} className="flex flex-row">
                            <input
                                onChange={e => handleChange(e, 'searchbar')}
                                value={search}
                                name="search"
                                required
                                className={`appearance-none border-transparent border-2 bg-white w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 focus:border-sciteensLightGreen-regular text-gray-700 shadow`}
                                type="text"
                                aria-label="search"
                                maxLength="100"
                            />
                            <button type="submit" className="bg-sciteensLightGreen-regular text-white font-semibold rounded-lg px-4 py-2 hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                                onClick={e => handleSearch(e)}>
                                Search
                            </button>
                        </form>

                        <hr className="bg-gray-300 my-8" />

                        <h2 className="text-xl text-gray-700 mb-2">Topics</h2>
                        <div className="flex flex-row flex-wrap">
                            {
                                field_names.map((f) => {
                                    return (
                                        <button key={f} onClick={() => handleFieldSearch(f)} className={`text-sm px-3 py-2 rounded-full mr-4 mb-4 shadow
                                        ${f == field ? "bg-sciteensLightGreen-regular text-white" : "bg-white"}`}>
                                            {f}
                                        </button>
                                    )
                                })
                            }
                        </div>
                    </div>
                </div>
            </div>
        </>

    )
}

export async function getServerSideProps({ query }) {
    // Fetch data from external API
    try {
        const apiEndpoint = 'https://sciteens.cdn.prismic.io/api/v2'
        const client = Prismic.client(apiEndpoint)
        let predicates = []
        if (query.search) {
            predicates.push(Prismic.Predicates.fulltext('document', query.search))
        }
        if (query.field && query.field != "All") {
            predicates.push(Prismic.Predicates.at("document.tags", [query.field]))
        }
        const articles = await client.query([
            Prismic.Predicates.at("document.type", "blog"),
            ...predicates
        ],
            {
                orderings: `[document.first_publication_date desc]`,
                pageSize: 10,
            })

        return {
            props: { articles }
        }
    }
    catch (e) {
        return {
            notFound: true,
        }
    }
}

export default Articles