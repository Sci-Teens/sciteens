import { useAmp } from 'next/amp'
import { RichText } from 'prismic-reactjs';
export const config = { amp: 'hybrid' };
var Prismic = require("@prismicio/client");
import moment from 'moment';
import Image from 'next/image'
import Head from 'next/head'
import htmlSerializer from '../../htmlserializer';
// import { useRouter } from 'next/router'

function Article({ article }) {
    const isAmp = useAmp()

    const imageLoader = ({ src, width, height }) => {
        return `${src}?fit=crop&crop=faces&w=${width || 582}&h=${height || 389}`
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

    // const router = useRouter()
    return (
        <>
            {
                isAmp ? <h3>AMP article in progess...</h3> :
                    <>
                        <Head>
                            <title>{RichText.asText(article.data.title)}</title>
                            <link rel="icon" href="/favicon.ico" />
                        </Head>
                        <article className="prose-sm lg:prose mx-auto px-4 overflow-hidden break-words">
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
                                <Image loader={imageLoader} src={article.data.image.url} width="582" height="389" className="w-full mt-0 object-contain" />

                                <div>
                                    <RichText render={article.data.text} htmlSerializer={htmlSerializer} />
                                </div>
                                {interviews}
                                {about_the_author}

                            </div>
                        </article>
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
        return {
            props: { article }
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