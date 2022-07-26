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
        banner?.data.show_banner ? <div className="relative w-full h-12 mx-auto text-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white textl-lg">
            {/* {RichText.render(banner.data.message)} */}
            <div className="pt-3">We are recruiting volunteers! Apply to join our team at this link: <a href="https://forms.gle/xDEb2qewhK6y3R7g9">forms.gle/xDEb2qewhK6y3R7g9</a></div>
            <button onClick={() => closeBanner()}>
                <img src='/assets/zondicons/close.svg' className="absolute top-1/2 right-4 h-5 w-5 transform -translate-y-1/2" alt="Close" />
            </button>
        </div> : <></>
    )
}

export default Banner

