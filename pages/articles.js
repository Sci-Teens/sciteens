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

    const articlesComponent = articles.results.map((article, index) => {

        const author_image = article.data.body.map((slice, ix) => {
            if (slice.slice_type == "about_the_author") {
                return (
                    // <img src={slice.primary.headshot.url} />
                    <div className="relative h-8 w-8 lg:h-16 lg:w-16" key={index}>
                        <Image className="rounded-full h-8 w-8 lg:h-16 lg:w-16" height={64} width={64} loader={imageLoader} src={slice.primary.headshot.url} />
                    </div>
                )
            }
            else {
                return null
            }
        })

        return (
            <Link key={index} href={`/article/${article.uid}`}>

                <div className="p-4 bg-white shadow rounded-lg z-50 mt-4 flex items-center">
                    <div className="h-full w-1/4 lg:w-1/12 relative">
                        <Image className="rounded-lg object-cover flex-shrink-0" loader={imageLoader} src={article.data.image.url} width={256} height={256} />

                    </div>
                    <div className="ml-4 w-3/4 lg:w-11/12">
                        <h3 className="font-semibold text-lg">{RichText.asText(article.data.title)}</h3>
                        <p className="hidden lg:block">{article.data.description}</p>
                        <div className="flex flex-row items-center mt-2">
                            {author_image}
                            <p className="ml-2">By {article.data.author}</p>
                        </div>
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
            <div className="w-full min-h-screen">
                <h1 className="text-4xl py-4 text-left ml-4">
                    📰 Articles
                </h1>
                <form onSubmit={e => handleSearch(e)} className="py-4 mx-4 flex">
                    <select
                        onChange={e => setField(e.target.value)}
                        name="field"
                        id="field"
                        value={field}
                        className="appearance-none border-transparent border-2 bg-green-200 mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular"
                    >
                        {
                            field_names.map((name) => {
                                return (
                                    <option value={name}>
                                        {name}
                                    </option>
                                )
                            })
                        }
                    </select>
                    <input
                        onChange={e => handleChange(e, 'searchbar')}
                        value={search}
                        name="search"
                        required
                        className={`appearance-none border-transparent border-2 bg-green-200 w-full mr-3 p-2 leading-tight rounded focus:outline-none focus:bg-white focus:placeholder-gray-700 focus:border-sciteensGreen-regular text-gray-700 placeholder-sciteensGreen-regular`}
                        type="text"
                        placeholder="Search articles...."
                        aria-label="search"
                        maxLength="100"
                    />
                    <button type="submit" className="bg-sciteensLightGreen-regular text-white rounded-lg p-2 hover:bg-sciteensLightGreen-dark shadow outline-none disabled:opacity-50"
                        onClick={e => handleSearch(e)}>
                        Search
                    </button>
                </form>
                {articlesComponent}
                {
                    articles.length &&
                    <div className="mx-auto text-center mt-20">
                        <i className="font-semibold text-xl">
                            Sorry, we couldn't find any searches related to {router?.query.search}
                        </i>
                    </div>
                }
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