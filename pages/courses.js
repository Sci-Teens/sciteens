var Prismic = require("@prismicio/client");
import Link from 'next/link'
import Image from 'next/image';
import { RichText } from 'prismic-reactjs';
import { useRouter } from "next/router"
import Head from 'next/head';
import { useState, } from 'react';


function Courses({ courses }) {
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
            pathname: '/courses',
            query: q
        })
    }

    async function handleFieldSearch(field) {
        let q = {}
        q.field = field
        router.push({
            pathname: '/courses',
            query: q
        })
    }

    const coursesComponent = courses.results.map((course, index) => {

        return (
            <Link key={course.uid} href={`/course/${course.uid}`}>

                <div className="p-4 bg-white shadow rounded-lg z-50 mt-4 flex items-center">
                    <div className="h-full w-1/4 relative">
                        <Image className="rounded-lg object-cover flex-shrink-0" loader={imageLoader} src={course.data.image_main.url} width={256} height={256} />

                    </div>
                    <div className="ml-4 w-3/4 lg:w-11/12">
                        <h3 className="font-semibold text-lg">{RichText.asText(course.data.name)}</h3>
                        <p className="hidden lg:block">{RichText.asText(course.data.description)}</p>
                    </div>

                </div>
            </Link >
        )
    })
    return (
        <>
            <Head>
                <title>{field ? field + ' ' : ''}Courses {search ? 'related to ' + search : ''} | SciTeens</title>
                <link rel="icon" href="/favicon.ico" />
                <meta name="description" content="SciTeens Courses Page" />
                <meta name="keywords" content="SciTeens, sciteens, courses, teen science" />
            </Head>
            <div className="min-h-screen mx-auto lg:mx-16 xl:mx-32 flex flex-row mt-8 mb-24">
                <div className="w-11/12 md:w-[85%] mx-auto lg:mx-0 lg:w-[60%]">
                    <h1 className="text-4xl py-4 text-left ml-4">
                        📰 Latest Courses
                    </h1>
                    {coursesComponent}
                    {courses.length &&
                        <div className="mx-auto text-center mt-20">
                            <i className="font-semibold text-xl">
                                Sorry, we couldn't find any searches related to {router?.query.search}
                            </i>
                        </div>
                    }
                </div>


                <div className="hidden lg:block w-0 lg:w-[30%] lg:ml-32">
                    <div className="sticky top-1/2 transform -translate-y-1/2 w-full">
                        <h2 className="text-xl text-gray-700 mb-2">Search Courses</h2>
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
        const courses = await client.query([
            Prismic.Predicates.at("document.type", "course"),
            ...predicates,
        ],
            {
                orderings: `[document.first_publication_date desc]`,
                pageSize: 10,
                page: query?.page ? query?.page : 1
            }
        )

        return {
            props: { courses }
        }
    }
    catch (e) {
        return {
            notFound: true,
        }
    }
}

export default Courses