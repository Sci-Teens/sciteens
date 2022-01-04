import { RichText } from 'prismic-reactjs';
import { useState, useEffect } from 'react'
var Prismic = require("@prismicio/client");
import Link from 'next/link';
import moment from 'moment';
import Image from 'next/image'
import Head from 'next/head'
import htmlSerializer from '../../htmlserializer';
import Discussion from '../../components/Discussion';
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { logEvent, getAnalytics } from 'firebase/analytics';


function Article({ article, recommendations }) {
    const [leftVisible, setLeftVisible] = useState(false)
    const [rightVisible, setRightVisible] = useState(true)
    const [scrollIndex, setScrollIndex] = useState(-1)
    const [swipePosition, setSwipePositon] = useState(0)
    const [vote, setVote] = useState(null)
    const isAmp = false
    const { t } = useTranslation('common')
    let analytics
    if (typeof window !== 'undefined')
        analytics = getAnalytics()

    async function handleRate(type) {
        if (typeof window !== 'undefined') {
            if (type == "positive") {
                setVote("positive")
                return logEvent(analytics, "rate_article", { name: RichText.asText(article.data.title), rating: "positive" })
            }

            else {
                setVote("negative")
                return logEvent(analytics, "rate_article", { name: RichText.asText(article.data.title), rating: "negative" })
            }
        }
    }

    const handleSwipe = (e, call) => {
        if (call == 'start') {
            setSwipePositon(e.touches[0].clientX)
        }

        else {
            const touchDown = swipePosition

            if (touchDown == 0) {
                return
            }

            const currentTouch = e.touches[0].clientX
            const diff = touchDown - currentTouch

            if (diff > 5) {
                element.scrollTo(0, 0)
                setScrollIndex(-1)
            }

            if (diff < -5 && scrollIndex > -1) {
                element.scrollTo(document.getElementById("i-" + (scrollIndex + 1))?.offsetLeft, 0)
                setScrollIndex(scrollIndex + 1)
            }

            setTouchPosition(null)
        }
    }

    const imageLoader = ({ src, width, height }) => {
        return `${src}?fit=crop&crop=faces&w=${width || 582}&h=${height || 389}`
    }

    function readingTime(article) {
        let article_length = 0
        article?.map((text) => {
            if (text.type == "paragraph" && text.text) {
                article_length += text.text?.split(' ').length
            }
        })
        let time_to_read = Math.max(1, Math.round(article_length / 200))

        return `${time_to_read} minute read`
    }

    useEffect(() => {
        if (scrollIndex < 3) {
            setRightVisible(true)
        } else if (scrollIndex == 3) {
            setRightVisible(false)
        }
        if (scrollIndex >= 0) {
            setLeftVisible(true)
        } else if (scrollIndex == -1) {
            setLeftVisible(false)
        }
    }, [scrollIndex])

    function scroll(e, direction, index) {
        e.preventDefault()
        let element = document.getElementById('readMore')

        if (index >= 0) {
            if (index == 0) {
                element.scrollTo(0, 0)
                setScrollIndex(-1)
            } else {
                element.scrollTo(document.getElementById("i-" + (window.innerWidth >= 768 ? index - 1 : index))?.offsetLeft, 0)
                setScrollIndex(index - 1)
            }
            return
        }

        if (direction == "right") {
            if (scrollIndex < 4) {
                element.scrollTo(document.getElementById("i-" + (scrollIndex + 1))?.offsetLeft, 0)
                setScrollIndex(scrollIndex + 1)
            }
        } else {
            if (scrollIndex > 0) {
                element.scrollTo(document.getElementById("i-" + (scrollIndex - 1))?.offsetLeft, 0)
            } else if (scrollIndex == 0) {
                element.scrollTo(0, 0)
            }
            setScrollIndex(scrollIndex - 1)
        }
    }

    const about_the_author = article.data.body.map((slice, index) => {
        if (slice.slice_type == "about_the_author") {
            return (
                <div key={index} className="inline-block">
                    <h3>{t('article.about_the_author')}</h3>
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
                    <h3>{t('article.interview')}</h3>
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
                <Image className="rounded-full" height="48" width="48" loader={imageLoader} src={slice.primary.headshot.url} />
            )
        }
        else {
            return null
        }
    })

    const recommendationsRendered = recommendations.map((a, index) => {
        return (<Link key={index} href={`/article/${a.uid}`}>
            <a id={"i-" + index} className="w-[75vw] md:w-[31vw] mr-[5vw] md:mr-[2.9vw] flex-shrink-0 bg-white p-4 cursor-pointer mt-6 md:mt-8  shadow hover:shadow-md rounded-lg">
                <div className="relative">
                    <Image className="rounded-lg object-cover flex-shrink-0" loader={imageLoader} src={a.data.image.url} width={1280} height={720} />
                </div>
                <div className="">
                    <h3 className="text-lg font-semibold line-clamp-1">{RichText.asText(a.data.title)}</h3>
                    <p className="line-clamp-3 text-sm mb-auto">{a.data.description}</p>
                    <p className="hidden lg:flex text-sm mt-2 line-clamp-1">By {a.data.author + " · " + moment(a.data.date).format('ll') + " · " + readingTime(a.data.text)}</p>
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
                            <meta name="og:image" content={article.data.image.url} />
                            <meta property="og:type" content="website" />
                            <meta property="og:title" content={`${RichText.asText(article.data.title)} | SciTeens`} />
                            <meta property="og:description" content={article.data.description} />
                        </Head>
                        <main>
                            <article className="prose prose-sm lg:prose-lg mx-auto px-4 overflow-hidden break-words mt-8">
                                <h1>
                                    {RichText.asText(article.data.title)}
                                </h1>
                                <div>
                                    <div className="flex items-center mb-4">
                                        {author_image}
                                        <p className="ml-6 text-black text-lg ">
                                            {t('article.by')} {article.data.author} <br />
                                            <span className="text-gray-500"> {moment(article.data.date).format('MMMM DD, YYYY')} · {readingTime(article.data.text)} </span>
                                        </p>
                                    </div>
                                    <div className="flex flex-row flex-wrap">
                                        {article.tags.map((tag) => {
                                            return <Link href={{
                                                pathname: '/articles',
                                                query: { field: tag }
                                            }}>
                                                <p className="cursor-pointer text-base px-5 py-1.5 my-1 bg-white rounded-full mr-4 shadow hover:shadow-md">{tag}</p>
                                            </Link>
                                        })}
                                    </div>
                                </div>
                                <div>
                                    {/* Image Slider */}
                                    <Image loader={imageLoader} src={article.data.image.url} width="670" height="400" className="mt-0 object-cover" />

                                    <div>
                                        <RichText render={article.data.text} htmlSerializer={htmlSerializer} />
                                    </div>

                                    {interviews}

                                    {/* Thumbs Up / Thumbs Down Element */}
                                    <div className='flex flex-col md:flex-row justify-between place-items-center bg-white rounded-lg md:rounded-full shadow'>
                                        <p className='ml-0 md:ml-14 text-sm md:text-lg lg:text-xl font-semibold text-black'>{t('article.rate')}</p>
                                        <div className='mr-0 md:mr-14 my-auto h-auto pb-4 md:pb-0'>
                                            <button className={`mr-12 border-2 p-2 rounded-lg hover:border-green-500 hover:text-green-500 hover:bg-green-50 ${vote === 'positive' ? 'border-green-500 text-green-500' : 'border-gray-600 text-gray-600'}`} onClick={e => handleRate('positive')}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className='w-5 lg:w-7 h-5 lg:h-7 fill-current'><path d="M11 0h1v3l3 7v8a2 2 0 0 1-2 2H5c-1.1 0-2.31-.84-2.7-1.88L0 12v-2a2 2 0 0 1 2-2h7V2a2 2 0 0 1 2-2zm6 10h3v10h-3V10z" /></svg>
                                            </button>
                                            <button className={`border-2 p-2 rounded-lg hover:border-red-500 hover:text-red-500 hover:bg-red-50 ${vote === 'negative' ? 'border-red-500 text-red-500' : 'border-gray-600 text-gray-600'}`} onClick={e => handleRate('negative')}>
                                                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className='w-5 lg:w-7 h-5 lg:h-7 fill-current'><path d="M11 20a2 2 0 0 1-2-2v-6H2a2 2 0 0 1-2-2V8l2.3-6.12A3.11 3.11 0 0 1 5 0h8a2 2 0 0 1 2 2v8l-3 7v3h-1zm6-10V0h3v10h-3z" /></svg>
                                            </button>
                                        </div>
                                    </div>

                                    {about_the_author}

                                </div>
                                <Discussion type={"article"} item_id={router.query.slug} />
                                <div className="h-px bg-gray-300 my-2" />
                            </article>
                            <h3 className="font-semibold text-2xl md:text-5xl text-center mt-8">{t('article.related')}</h3>
                            <div className="relative">
                                <div id="readMore" style={{ scrollBehavior: 'smooth' }} className="transition-all flex flex-row px-[12.5vw] md:px-[16.5vw] pb-8 overflow-x-hidden" onTouchMove={e => handleSwipe(e, 'move')} onTouchStart={e => handleSwipe(e, 'start')} >
                                    {recommendationsRendered}
                                    <button onClick={e => scroll(e, "right")} className={`absolute h-12 lg:h-16 w-12 lg:w-16 right-6 top-1/2 transform -translate-y-1/2 z-50 bg-white opacity-70 hover:opacity-100 shadow hover:shadow-lg rounded-full
                                    ${rightVisible ? "hidden md:flex " : "hidden"}`} >
                                        <svg className="m-auto h-2/3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M12.95 10.707l.707-.707L8 4.343 6.586 5.757 10.828 10l-4.242 4.243L8 15.657l4.95-4.95z" /></svg>
                                    </button>
                                    <button onClick={e => scroll(e, "left")} className={`absolute h-12 lg:h-16 w-12 lg:w-16 left-6 top-1/2 transform -translate-y-1/2 z-50 bg-white opacity-70 hover:opacity-100 shadow hover:shadow-lg rounded-full
                                    ${leftVisible ? "hidden md:flex " : "hidden"}`}>
                                        <svg className="m-auto h-2/3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M7.05 9.293L6.343 10 12 15.657l1.414-1.414L9.172 10l4.242-4.243L12 4.343z" /></svg>
                                    </button>
                                </div>
                            </div>
                            <div className="flex flex-row mx-auto justify-center mb-20">
                                {new Array(5).fill(1).map((data, i) => {
                                    return <button onClick={e => scroll(e, null, i)}
                                        className={`h-[10px] w-[10px] rounded-full border border-black ${scrollIndex == i - 1 ? "bg-black" : "bg-transparent"} ${i == 4 ? "" : "mr-4"}`} />
                                })}
                            </div>
                        </main>
                    </>
            }
        </>
    )
}

export async function getStaticPaths() {
    let paths = []
    const apiEndpoint = 'https://sciteens.cdn.prismic.io/api/v2'
    const client = Prismic.client(apiEndpoint)
    const res = await client.query(
        Prismic.Predicates.at('document.type', 'blog'),
    )
    for (let i = 1; i <= res.total_pages; i++) {
        const articles = await client.query(
            Prismic.Predicates.at('document.type', 'blog'),
            { pageSize: 20, page: i }
        )
        for (let article of articles.results) {
            paths.push({
                params: { slug: article.uid }
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
        const article = await client.getByUID(
            'blog', params?.slug
        )
        const recommendationsQuery = await client.query([
            Prismic.Predicates.at("document.type", "blog"),
            Prismic.Predicates.any("document.tags", article.tags),
        ]);
        let recommendations = []
        let index = 0
        do {
            if (recommendationsQuery.results[index].uid != article.uid) {
                recommendations.push(recommendationsQuery.results[index])
            }
            index++
        } while (recommendations.length < 5);

        return {
            props: { article: article, recommendations: recommendations, ...translations }
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