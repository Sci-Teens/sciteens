var Prismic = require("@prismicio/client");
import Link from 'next/link'
import Image from 'next/image';
import { RichText } from 'prismic-reactjs';
import { useRouter } from "next/router"
import Head from 'next/head';


function Articles({ articles }) {
    const router = useRouter()

    const imageLoader = ({ src, width, height }) => {
        return `${src}?fit=crop&crop=faces&w=${width || 256}&h=${height || 256}`
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
            <div className="w-full">
                <h1 className="text-4xl py-4 text-left ml-4">
                    📰 Latest Articles
                </h1>
                {articlesComponent}
                <p className="my-4 w-full flex flex-row items-center justify-center space-x-4">
                    <Link href={`/articles?page=${router.query?.page && router.query?.page > 1 ? Number(router.query?.page) - 1 : 1}`} disabled={!router.query?.page || router.query?.page === 1}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="fill-current text-sciteensGreen-regular h-8 hover:text-sciteensGreen-dark hover:cursor-pointer"><path d="M7.05 9.293L6.343 10 12 15.657l1.414-1.414L9.172 10l4.242-4.243L12 4.343z" />
                        </svg>
                    </Link>
                    <Link href={`/articles?page=1`}>
                        <button className="text-sciteensGreen-regular font-bold hover:text-sciteensGreen-dark">
                            1
                        </button>
                    </Link>
                    {
                        (router.query?.page && router.query?.page > 3 && router.query?.page <= articles.total_pages) &&
                        <div className="text-sciteensGreen-regular font-bold hover:text-sciteensGreen-dark">
                            ...
                        </div>
                    }
                    <Link href={`/articles?page=${router.query?.page && router.query?.page > 2 && router.query?.page <= articles.total_pages ? Number(router.query?.page) - 1 : 2}`}>
                        <button className="text-sciteensGreen-regular font-bold hover:text-sciteensGreen-dark">
                            {router.query?.page && router.query?.page > 2 && router.query?.page <= articles.total_pages ? Number(router.query?.page) - 1 : 2}
                        </button>
                    </Link>

                    {
                        (router.query?.page && router.query?.page > 2 && router.query?.page < articles.total_pages) &&
                        <div className="text-sciteensGreen-regular font-bold hover:text-sciteensGreen-dark">
                            {router.query?.page}
                        </div>
                    }
                    {
                        (router.query?.page < articles.total_pages - 1) &&
                        <Link href={`/articles?page=${router.query?.page && router.query?.page > 2 && router.query?.page < articles.total_pages - 1 ? Number(router.query?.page) + 1 : 3}`}>
                            <button className="text-sciteensGreen-regular font-bold hover:text-sciteensGreen-dark">
                                {router.query?.page && router.query?.page > 2 && router.query?.page < articles.total_pages - 1 ? Number(router.query?.page) + 1 : 3}
                            </button>
                        </Link>
                    }

                    {
                        (router.query?.page && router.query?.page < articles.total_pages - 2) &&
                        <div className="text-sciteensGreen-regular font-bold hover:text-sciteensGreen-dark">
                            ...
                        </div>
                    }
                    <Link href={`/articles?page=${articles.total_pages}`}>
                        <button className="text-sciteensGreen-regular font-bold hover:text-sciteensGreen-dark">
                            {articles.total_pages}
                        </button>
                    </Link>
                    <Link href={`/articles?page=${router.query?.page && router.query?.page < articles.total_pages ? Number(router.query?.page) + 1 : articles.total_pages}`} disabled={!router.query?.page || router.query?.page === articles.total_pages}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className="fill-current text-sciteensGreen-regular h-8 hover:text-sciteensGreen-dark hover:cursor-pointer"><path d="M12.95 10.707l.707-.707L8 4.343 6.586 5.757 10.828 10l-4.242 4.243L8 15.657l4.95-4.95z" />
                        </svg>
                    </Link>
                </p>
            </div>
        </>

    )
}

export async function getServerSideProps({ query }) {
    // Fetch data from external API
    try {
        const apiEndpoint = 'https://sciteens.cdn.prismic.io/api/v2'
        const client = Prismic.client(apiEndpoint)
        const articles = await client.query(
            Prismic.Predicates.at("document.type", "blog"), {
            orderings: `[document.first_publication_date desc]`,
            pageSize: 10,
            page: query?.page ? query?.page : 1
        }
        )

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