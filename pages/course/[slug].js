import { RichText } from 'prismic-reactjs';
export const config = { amp: 'hybrid' };
var Prismic = require("@prismicio/client");
import Link from 'next/link';
import moment from 'moment';
import Image from 'next/image'
import Head from 'next/head'
import htmlSerializer from '../../htmlserializer';
// import { useRouter } from 'next/router'

function Course({ course }) {

    const imageLoader = ({ src, width, height }) => {
        return `${src}?fit=crop&crop=faces&w=${width || 582}&h=${height || 389}`
    }

    // const router = useRouter()
    return (
        <>
            <Head>
                <title>{RichText.asText(course.data.name)}</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <article className="prose-sm lg:prose mx-auto px-4 overflow-hidden break-words">
                <div>
                    <h1>
                        {RichText.asText(course.data.name)}

                    </h1>
                    <p className="font-semibold">
                        Starts {moment(course.data.start).calendar(null, { sameElse: 'MMMM DD, YYYY' })}, Ends {moment(course.data.end).calendar(null, { sameElse: 'MMMM DD, YYYY' })} <br />
                        Enroll by {moment(course.data.enroll_by).calendar(null, { sameElse: 'MMMM DD, YYYY' })}
                    </p>
                    <i >
                        {RichText.asText(course.data.description)}
                    </i>
                    <div className="border-b-2 mt-2"></div>
                    {/* <div className="flex items-center">
                                    {author_image}
                                    <p className="font-semibold ml-4">
                                        Written by {article.data.author} <br /> {moment(article.data.date).format('MMMM DD, YYYY')}
                                    </p>
                                </div> */}
                </div>
                <div>
                    {/* Image Slider */}
                    <Image loader={imageLoader} src={course.data.image_main.url} width="582" height="389" className="w-full mt-0 object-contain" />

                    <div>
                        <RichText render={course.data.about} htmlSerializer={htmlSerializer} />
                    </div>
                </div>
            </article>
        </>
    )


}

export async function getServerSideProps({ query }) {
    // Fetch data from external API
    try {
        const apiEndpoint = 'https://sciteens.cdn.prismic.io/api/v2'
        const client = Prismic.client(apiEndpoint)
        const course = await client.getByUID(
            'course', query?.slug
        )
        return {
            props: { course }
        }
    }
    catch (e) {
        console.log(e)
        return {
            notFound: true,
        }
    }
}

export default Course