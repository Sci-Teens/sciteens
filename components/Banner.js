import { useEffect, useState } from 'react'

import { useRouter } from 'next/router'

import { RichText } from 'prismic-reactjs'
var Prismic = require('@prismicio/client')

function Banner({ closeBanner }) {
  const [banner, setBanner] = useState(null)
  const router = useRouter()
  useEffect(async () => {
    const apiEndpoint =
      'https://sciteens.cdn.prismic.io/api/v2'
    const client = Prismic.default.client(apiEndpoint)
    const banner = await client.getSingle('banner')
    setBanner(banner)
  }, [])
  return banner?.data.show_banner ? (
    <div className="textl-lg relative mx-auto flex h-32 w-full flex-row items-center justify-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-center text-white lg:h-12">
      <div className="m-1 w-11/12 overflow-auto">
        {RichText.render(banner.data.message)}
      </div>
      <button
        onClick={() => closeBanner()}
        className="relative h-full w-1/12"
      >
        <img
          src="/assets/zondicons/close.svg"
          className="h-full w-5 transform"
          alt="Close"
        />
      </button>
    </div>
  ) : (
    <></>
  )
}

export default Banner
