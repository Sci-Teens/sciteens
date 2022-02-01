import { RichText } from 'prismic-reactjs';
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
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

function Course({ course }) {
    const [files, setFiles] = useState([])
    const { t } = useTranslation('common')

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
                <meta name="description" content={RichText.asText(course.data.description)} />
                <meta name="keywords" content="SciTeens, sciteens, course, teen science" />
                <meta name="og:image" content={course.data.image_main.url} />
                <meta property="og:type" content="website" />
                <meta property="og:title" content={`${RichText.asText(course.data.name)} | SciTeens`} />
                <meta property="og:description" content={course.data.description} />
            </Head>
            <article className="prose-sm lg:prose mx-auto px-4 overflow-hidden break-words mt-8">
                <div>
                    <h1>
                        {RichText.asText(course.data.name)}

                    </h1>
                    <p className="font-semibold">
                        {t('course.starts')} {moment(course.data.start).calendar(null, { sameElse: 'MMMM DD, YYYY' })}, Ends {moment(course.data.end).calendar(null, { sameElse: 'MMMM DD, YYYY' })} <br />
                        {t('course.enroll_by')} {moment(course.data.enroll_by).calendar(null, { sameElse: 'MMMM DD, YYYY' })}
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
                    {t('course.lessons')}
                </h2>
                <table
                    className="table-auto w-full shadow rounded mb-4"
                >
                    <tr
                        className="bg-gray-200 rounded-t-md text-center border-b border-gray-400"
                    >
                        <th className="p-2">{t('course.date')}</th>
                        <th className="p-2">{t('course.lesson')}</th>
                        <th className="p-2">{t('course.notebook')}</th>
                    </tr>
                    {lessonComponent}
                </table>
                {
                    files?.length && <>
                        <h2 className="text-lg font-semibold mb-2">
                            {t('course.files')}
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
                {typeof window !== 'undefined' &&
                    <Discussion type={"course"} item_id={router.query.slug} />
                }
            </div>
        </>
    )
}

export async function getStaticPaths() {
    let paths = []
    const apiEndpoint = 'https://sciteens.cdn.prismic.io/api/v2'
    const client = Prismic.client(apiEndpoint)
    const res = await client.query(
        Prismic.Predicates.at('document.type', 'course'),
    )
    for (let i = 1; i <= res.total_pages; i++) {
        const courses = await client.query(
            Prismic.Predicates.at('document.type', 'course'),
            { pageSize: 20, page: i }
        )
        for (let course of courses.results) {
            paths.push({
                params: { slug: course.uid }
            })
        }
    }
    return { paths: paths, fallback: false }
}

export async function getStaticProps({ params, locale }) {
    // Fetch data from external API
    const translations = await serverSideTranslations(locale, ['common'])

    try {
        const apiEndpoint = 'https://sciteens.cdn.prismic.io/api/v2'
        const client = Prismic.client(apiEndpoint)
        const course = await client.getByUID(
            'course', params?.slug
        )
        return {
            props: { course, ...translations }
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