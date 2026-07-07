import { LoaderCircle } from 'lucide-react'

import { cn } from '@/lib/utils'

export default function LoadingSpinner({ className }) {
  return (
    <LoaderCircle
      aria-label="Loading"
      className={cn(
        'inline-block h-5 w-5 animate-spin',
        className
      )}
    />
  )
}
