import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import LoadingSpinner from '@/components/LoadingSpinner'

export default function InfiniteScrollTrigger({
  hasNextPage,
  isLoading,
  onLoadMore,
  label,
}) {
  const triggerRef = useRef(null)

  useEffect(() => {
    const trigger = triggerRef.current
    if (
      !trigger ||
      !hasNextPage ||
      isLoading ||
      typeof IntersectionObserver === 'undefined'
    ) {
      return
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) onLoadMore()
      },
      { rootMargin: '600px 0px' }
    )
    observer.observe(trigger)

    return () => observer.disconnect()
  }, [hasNextPage, isLoading, onLoadMore])

  if (!hasNextPage) return null

  return (
    <div
      ref={triggerRef}
      className="mt-6 flex justify-center md:mt-8"
    >
      <Button
        type="button"
        variant="outline"
        className="bg-card shadow-sm"
        disabled={isLoading}
        onClick={onLoadMore}
      >
        {label}
        {isLoading && <LoadingSpinner className="ml-2" />}
      </Button>
    </div>
  )
}
