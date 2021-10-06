import { useAmp } from 'next/amp'
import { RichText } from 'prismic-reactjs';
export const config = { amp: 'hybrid' };
var Prismic = require("@prismicio/client");
import moment from 'moment';
// import { useRouter } from 'next/router'

function Article({ article }) {
    const isAmp = useAmp()

    const about_the_author = article.data.body.map((slice, index) => {
        if (slice.slice_type == "about_the_author") {
            return (
                <div key={index} className="inline-block">
                    <h3>About the Author</h3>
                    <div className="flex flex-col lg:flex-row items-center">
                        <img className="rounded-full h-20 w-20 mr-4" src={slice.primary.headshot.url} />
                        <p>{RichText.asText(slice.primary.information)}</p>
                    </div>
                </div>
            )
        }
        else {
            return null
        }
    })

    const author_image = article.data.body.map((slice, index) => {
        if (slice.slice_type == "about_the_author") {
            return (
                <img className="rounded-full h-16 w-16 mr-4" src={slice.primary.headshot.url} />
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
                isAmp ? <h3>My AMP About Page!</h3> :
                    <article className="prose-sm lg:prose mx-auto px-4">
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
                                <p className="font-semibold">
                                    Written by {article.data.author} <br /> {moment(article.data.date).format('MMMM DD, YYYY')}
                                </p>
                            </div>
                        </div>
                        <div>
                            {/* Image Slider */}
                            <img src={article.data.image.url} className="w-full mt-0" style={{ marginTop: '0' }} />

                            <div >
                                {RichText.render(article.data.text)}
                            </div>
                            {/* Interview */}
                            {about_the_author}

                        </div>
                    </article>
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
            // notFound: true,
        }
    }
}

export default Article