var Prismic = require("@prismicio/client");
import Link from 'next/link'
import Image from 'next/image';
import { RichText } from 'prismic-reactjs';
import { useRouter } from "next/router"
import Head from 'next/head';
import { useEffect, useState, useMemo } from 'react';

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
        q.search = search
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
    }

    function trimArticleDescription(summary) {
        if (summary.length > 150) {
            summary = summary.substring(0, 150) + "..."
        }
        return summary
    }

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

                <div className="p-4 bg-white shadow rounded-lg z-50 mt-6 md:mt-8 flex flex-row items-center">
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

                </div>
            </Link >
        )
    })


    return (
        <>
            <Head>
                <title>Articles Page {router?.query?.page ? router.query.page : 1}</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div className="min-h-screen mx-auto lg:mx-16 xl:mx-32 flex flex-row mt-8 mb-24">
                <div className="w-11/12 md:w-[85%] mx-auto lg:mx-0 lg:w-[60%]">
                    <h1 className="text-4xl py-4 text-left font-semibold ml-4">
                        Articles 📰
                    </h1>
                    {articlesComponent}
                    {articles.length &&
                        <div className="mx-auto text-center mt-20">
                            <i className="font-semibold text-xl">
                                Sorry, we couldn't find any searches related to {router?.query.search}
                            </i>
                        </div>
                    }
                </div>
                <div className="hidden lg:block w-0 lg:w-[30%] xl:w-1/4 ml-[4.5rem] xl:ml-32">
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
                                field_names.map((field) => {
                                    return (
                                        <button onClick={() => handleFieldSearch(field)} className="text-sm px-3 py-2 bg-white rounded-full mr-4 mb-4 shadow">
                                            {field}
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