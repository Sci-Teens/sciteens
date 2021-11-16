import { RichText } from 'prismic-reactjs';
export const config = { amp: 'hybrid' };
var Prismic = require("@prismicio/client");
import Link from 'next/link';
import moment from 'moment';
import Image from 'next/image'
import Head from 'next/head'
import htmlSerializer from '../../htmlserializer';
import { useState, useEffect } from 'react';
import File from '../../components/File'
import Discussion from '../../components/Discussion';
import { useRouter } from 'next/router'

function Course({ course }) {
    const [files, setFiles] = useState([])

    const imageLoader = ({ src, width, height }) => {
        return `${src}?fit=crop&crop=faces&w=${width || 582}&h=${height || 386}`
    }

    useEffect(async () => {
        try {
            for (const r of course.data.files) {
                const url = r.file.url
                const xhr = new XMLHttpRequest();
                xhr.responseType = 'blob';
                xhr.onload = (e) => {
                    const blob = xhr.response;
                    if (xhr.status == 200) {
                        console.log(blob)
                        blob.name = r.file.name
                        setFiles(fs => [...fs, blob])
                    }
                };
                xhr.open('GET', url);
                xhr.send();
            }
        }
        catch (e) {
            console.error(e)
        }
    }, [])

    const lessonComponent = course.data.body.map((slice, index) => {
        if (slice.slice_type == "lesson") {
            return (
                <tr key={index}>
                    <td className="p-2">
                        {moment(slice.primary.date).calendar(null, { sameElse: 'MMMM DD, YYYY' })}
                    </td>
                    <td className="p-2">
                        {RichText.asText(slice.primary.title)}
                    </td>
                    <td className="p-2">
                        <a
                            href={slice.primary.lesson_link.url}
                            target="_blank"
                        >
                            View
                        </a>
                    </td>
                </tr>
            )
        }
    })
    const router = useRouter()
    return (
        <>
            <Head>
                <title>{RichText.asText(course.data.name)} | SciTeens</title>
                <link rel="icon" href="/favicon.ico" />
                <meta name="description" content={course.data.description} />
                <meta name="keywords" content="SciTeens, sciteens, course, teen science" />
            </Head>
            <article className="prose-sm lg:prose mx-auto px-4 overflow-hidden break-words mt-8">
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
                    <Image loader={imageLoader} src={course.data.image_main.url} width="582" height="250" className="w-full mt-0 object-contain" />

                    <div>
                        <RichText render={course.data.about} htmlSerializer={htmlSerializer} />
                    </div>
                </div>
            </article>
            <div className="w-full max-w-prose mx-auto">
                <h2 className="text-lg font-semibold mb-2">
                    Lessons
                </h2>
                <table
                    className="table-auto w-full shadow rounded mb-4"
                >
                    <tr
                        className="bg-gray-200 rounded-t-md text-center border-b border-gray-400"
                    >
                        <th className="p-2">Date</th>
                        <th className="p-2">Lesson</th>
                        <th className="p-2">Notebook</th>
                    </tr>
                    {lessonComponent}
                </table>
                {
                    files?.length && <>
                        <h2 className="text-lg font-semibold mb-2">
                            Files
                        </h2>
                        <div className="flex flex-col items-center space-y-2">
                            {
                                files.map((f, id) => {
                                    return <File file={f} id={id} key={f.name}></File>
                                })
                            }
                        </div>
                    </>
                }
                <Discussion type={"course"} item_id={router.query.slug}>
                </Discussion>
            </div>
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