import { LoaderCircle } from 'lucide-react'
import { useTranslation } from 'next-i18next'

import { cn } from '@/lib/utils'

export default function LoadingSpinner({ className }) {
  const { t } = useTranslation('common')

  return (
    <LoaderCircle
      aria-label={t('edit_profile.loading')}
      className={cn(
        'inline-block h-5 w-5 animate-spin',
        className
      )}
    />
  )
}
