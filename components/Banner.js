import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

import { RichText } from 'prismic-reactjs'
var Prismic = require('@prismicio/client')

function Banner({ closeBanner }) {
  const [banner, setBanner] = useState(null)
  useEffect(() => {
    async function loadBanner() {
      const apiEndpoint =
        'https://sciteens.cdn.prismic.io/api/v2'
      const client = Prismic.default.client(apiEndpoint)
      const banner = await client.getSingle('banner')
      setBanner(banner)
    }
    loadBanner()
  }, [])
  return banner?.data.show_banner ? (
    <div className="bg-sciteensGreen-regular relative mx-auto flex w-full flex-row items-center justify-center gap-3 px-4 py-2.5 text-center text-sm text-white lg:text-base">
      <div className="[&_a]:decoration-white/70 [&_a]:hover:decoration-white [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-white m-1 w-11/12 break-words">
        {RichText.render(banner.data.message)}
      </div>
      <button
        onClick={() => closeBanner()}
        aria-label="Close"
        className="hover:bg-white/15 relative flex shrink-0 items-center justify-center rounded-full p-1.5 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  ) : (
    <></>
  )
}

export default Banner
