import { useAmp } from 'next/amp'
import { RichText } from 'prismic-reactjs';
export const config = { amp: 'hybrid' };
var Prismic = require("@prismicio/client");
import Link from 'next/link';
import moment from 'moment';
import Image from 'next/image'
import Head from 'next/head'
import htmlSerializer from '../../htmlserializer';
import Discussion from '../../components/Discussion';
import { useRouter } from 'next/router'

function Article({ article, recommendations }) {
    const isAmp = useAmp()

    const imageLoader = ({ src, width, height }) => {
        return `${src}?fit=crop&crop=faces&w=${width || 582}&h=${height || 389}`
    }

    function readingTime(article) {
        let article_length = 0
        article.map((text) => {
            if (text.type = "paragraph" && text.text) {
                article_length += text.text?.split(' ').length
            }
        })
        let time_to_read = Math.round(article_length / 200)

        return `${time_to_read} minute read · ${article_length} words`
    }

    const about_the_author = article.data.body.map((slice, index) => {
        if (slice.slice_type == "about_the_author") {
            return (
                <div key={index} className="inline-block">
                    <h3>About the Author</h3>
                    <div className="flex flex-col lg:flex-row items-center">
                        <Image className="rounded-full h-20 w-20 flex-grow-0" height="256" width="256" loader={imageLoader} src={slice.primary.headshot.url} />
                        <p className="ml-4">{RichText.asText(slice.primary.information)}</p>
                    </div>
                </div>
            )
        }
        else {
            return null
        }
    })

    const interviews = article.data.body.map((slice, index) => {
        if (slice.slice_type == "interview") {
            return (
                <>
                    <h3>Interview</h3>
                    {slice.items.map((interview, ix) => {
                        return (
                            <div key={ix} className="inline-block">
                                <div className="flex flex-col lg:flex-row items-center">
                                    <Image className="rounded-full h-20 w-20" height="64" width="64" loader={imageLoader} src={interview.headshot.url} />
                                    <h4 className="ml-4" style={{ marginTop: 0, marginBottom: 0 }}>{RichText.asText(interview.information)}</h4>
                                </div>
                                {RichText.render(interview.interview)}
                            </div>
                        )
                    })}
                </>
            )
        }
        else {
            return null
        }
    })

    const author_image = article.data.body.map((slice, index) => {
        if (slice.slice_type == "about_the_author") {
            return (
                <Image className="rounded-full h-16 w-16" height="64" width="64" loader={imageLoader} src={slice.primary.headshot.url} />
            )
        }
        else {
            return null
        }
    })

    const recommendationsRendered = recommendations.map((a, index) => {
        return (<Link key={index} href={`/article/${a.uid}`}>
            <a className="cursor-pointer p-4 bg-white shadow rounded-lg z-50 mt-6 md:mt-8 flex flex-row items-center">
                <div className="h-full max-w-[100px] md:max-w-[200px] relative">
                    <Image className="rounded-lg object-cover flex-shrink-0" loader={imageLoader} src={a.data.image.url} width={256} height={256} />
                </div>
                <div className="ml-4 w-3/4 lg:w-11/12">
                    <div className="flex flex-row items-center mb-3">
                        {/* {author_image} */}
                        <p className="ml-3">{a.data.author}</p>
                    </div>
                    <h3 className="font-semibold text-base md:text-xl lg:text-2xl mb-2 line-clamp-2">{RichText.asText(a.data.title)}</h3>
                    <p className="hidden md:flex text-sm lg:text-base mb-2 line-clamp-none md:line-clamp-2">{a.data.description}</p>
                    <p className="hidden lg:flex text-xs">{moment(a.data.date).format('ll') + " · " + readingTime(a.data.text)}</p>
                </div>

            </a>
        </Link >)
    })

    const router = useRouter()
    return (
        <>
            {
                isAmp ? <h3>AMP article in progess...</h3> :
                    <>
                        <Head>
                            <title>{RichText.asText(article.data.title)} | SciTeens</title>
                            <link rel="icon" href="/favicon.ico" />
                            <meta name="description" content={article.data.description} />
                            <meta name="keywords" content="SciTeens, sciteens, article, teen science" />
                        </Head>
                        <article className="prose prose-sm lg:prose-lg mx-auto px-4 overflow-hidden break-words mt-8">
                            <div>
                                <h1>
                                    {RichText.asText(article.data.title)}

                                </h1>
                                <i >
                                    {article.data.description}
                                </i>
                                <div className="border-b-2 mt-2"></div>
                                <div className="flex items-center">
                                    {author_image}
                                    <p className="font-semibold ml-4">
                                        Written by {article.data.author} <br /> {moment(article.data.date).format('MMMM DD, YYYY')}
                                    </p>
                                </div>
                            </div>
                            <div>
                                {/* Image Slider */}
                                <Image loader={imageLoader} src={article.data.image.url} width="670" height="400" className="w-full mt-0 object-cover" />

                                <div>
                                    <RichText render={article.data.text} htmlSerializer={htmlSerializer} />
                                </div>
                                {interviews}
                                {about_the_author}

                            </div>
                            <h3>Recommendations</h3>
                        </article>
                        <div className="max-w-prose mx-auto mb-4 px-4 lg:px-0">
                            <div className="mt-4">
                                {recommendationsRendered}
                            </div>
                            <Discussion type={"article"} item_id={router.query.slug}>
                            </Discussion>
                        </div>

                    </>
            }
        </>
    )


}

export async function getServerSideProps({ query }) {
    // Fetch data from external API
    try {
        const apiEndpoint = 'https://sciteens.cdn.prismic.io/api/v2'
        const client = Prismic.client(apiEndpoint)
        const article = await client.getByUID(
            'blog', query?.slug
        )
        const recommendationsQuery = await client.query([
            Prismic.Predicates.at("document.type", "blog"),
            Prismic.Predicates.any("document.tags", article.tags),
        ]);
        const recommendations = recommendationsQuery.results.slice(0, 5)
        return {
            props: { article: article, recommendations: recommendations }
        }
    }
    catch (e) {
        console.log(e)
        return {
            notFound: true,
        }
    }
}

export default Article