import { useTranslation } from 'next-i18next'

import { Skeleton } from '@/components/ui/skeleton'
import { EDGE } from '@/lib/layout'

// The auth gate on the create/edit pages resolves client-side, so the
// first paint of every one of them is this placeholder. It mirrors
// AuthCard's shell (same gutter, same column, same opening rhythm) so
// the page settles in place instead of replacing a bare `h-screen`
// text node with a full form.
export default function FormPageSkeleton() {
  const { t } = useTranslation('common')

  return (
    <main
      className={`${EDGE} pb-16 pt-10 md:pb-20 md:pt-16`}
      aria-busy="true"
    >
      <div className="mx-auto w-full max-w-2xl">
        <span className="sr-only">{t('form.loading')}</span>
        <Skeleton className="h-9 w-64 md:h-11" />
        <Skeleton className="mt-4 h-2.5 w-32 md:h-4 md:w-48" />
        <Skeleton className="mt-6 h-12 w-full max-w-[54ch]" />
        <Skeleton className="mt-8 h-96 w-full rounded-xl" />
      </div>
    </main>
  )
}
