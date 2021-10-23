var Prismic = require("@prismicio/client");
import Link from 'next/link'
import Image from 'next/image';
import { RichText } from 'prismic-reactjs';
import { useRouter } from "next/router"
import Head from 'next/head';


function Courses({ courses }) {
    const router = useRouter()

    const imageLoader = ({ src, width, height }) => {
        return `${src}?fit=crop&crop=faces&w=${width || 256}&h=${height || 256}`
    }

    const coursesComponent = courses.results.map((course, index) => {

        return (
            <Link key={index} href={`/course/${course.uid}`}>

                <div className="p-4 bg-white shadow rounded-lg z-50 mt-4 flex items-center">
                    <div className="h-full w-1/4 lg:w-1/12 relative">
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
                <title>Courses</title>
                <link rel="icon" href="/favicon.ico" />
            </Head>
            <div className="w-full">
                <h1 className="text-4xl py-4 text-left ml-4">
                    📰 Latest Courses
                </h1>
                {coursesComponent}
            </div>
        </>

    )
}

export async function getServerSideProps({ query }) {
    // Fetch data from external API
    try {
        const apiEndpoint = 'https://sciteens.cdn.prismic.io/api/v2'
        const client = Prismic.client(apiEndpoint)
        const courses = await client.query(
            Prismic.Predicates.at("document.type", "course"), {
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