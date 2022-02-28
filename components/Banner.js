import { useEffect, useState } from "react"

import { useRouter } from "next/router";

import { RichText } from 'prismic-reactjs';
var Prismic = require("@prismicio/client");


function Banner({ closeBanner }) {
    const [banner, setBanner] = useState(null)
    const router = useRouter()
    useEffect(async () => {
        const apiEndpoint = 'https://sciteens.cdn.prismic.io/api/v2'
        const client = Prismic.default.client(apiEndpoint)
        const banner = await client.getSingle(
            'banner',
        )
        setBanner(banner)

    }, [])
    return (
        banner?.data.show_banner ?
            <div className="relative w-full h-32 mx-auto text-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white textl-lg flex flex-row items-center justify-center">
                <div className="overflow-auto m-1 w-11/12">{RichText.render(banner.data.message)}</div>
                <button onClick={() => closeBanner()} className="relative w-1/12 h-full">
                    <img src='/assets/zondicons/close.svg' className="h-full w-5 transform" alt="Close" />
                </button>
            </div> : <></>
    )
}

export default Banner

