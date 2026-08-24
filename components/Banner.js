import { X } from 'lucide-react'
import { useTranslation } from 'next-i18next'

import banner from '../content/banner.json'
import { isSafeContentUrl } from '../lib/contentUrls.mjs'

// Bundled at build time rather than fetched, so no request and no flash of a
// late-arriving bar. Copy lives in the locale bundles like every other
// user-facing string; only the toggle and link target are content.
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
