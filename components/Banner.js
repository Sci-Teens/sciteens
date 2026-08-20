import { X } from 'lucide-react'
import { useTranslation } from 'next-i18next'

import banner from '../content/banner.json'
import { isSafeContentUrl } from '../lib/contentUrls.mjs'

// The banner used to fetch a Prismic single type from an effect in
// components/Layout.js, which meant a third-party request on every page load
// just to discover the banner was switched off. It is now a two-field JSON
// file bundled at build time: no request, no flash of a late-arriving bar.
//
// Copy lives in public/locales/*/common.json like every other user-facing
// string, so only the toggle and the link target are content.
function Banner({ closeBanner }) {
  const { t } = useTranslation('common')

  if (!banner.show) return null

  const href = isSafeContentUrl(banner.href)
    ? banner.href
    : null

  return (
    <div className="bg-sciteensGreen-regular relative mx-auto flex w-full flex-row items-center justify-center gap-3 px-4 py-2.5 text-center text-sm text-white lg:text-base">
      <div className="m-1 w-11/12 break-words">
        {t('banner.message')}
        {href && (
          <>
            {' '}
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline decoration-white/70 underline-offset-2 hover:text-white hover:decoration-white"
            >
              {t('banner.link_text')}
            </a>
          </>
        )}
      </div>
      <button
        onClick={() => closeBanner()}
        aria-label="Close"
        className="hover:bg-white/15 relative flex shrink-0 items-center justify-center rounded-full p-1.5 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

export default Banner
