import { SearchX } from 'lucide-react'

import { Button } from '@/components/ui/button'

// Replaces the bare `<i>Sorry, we couldn't find…</i>` the three listing
// pages each rendered: a dead end with no indication of which filter
// caused it and no way back.
export default function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  action,
}) {
  return (
    <div className="border-border/60 bg-card mt-6 rounded-xl border border-dashed px-6 py-16 text-center md:mt-8">
      <SearchX
        className="text-muted-foreground mx-auto h-6 w-6"
        aria-hidden="true"
      />
      <h2 className="text-foreground mt-4 text-base font-semibold">
        {title}
      </h2>
      <p className="text-muted-foreground text-pretty mx-auto mt-2 max-w-sm text-sm leading-relaxed">
        {description}
      </p>
      {action}
      {!action && actionLabel && onAction && (
        <Button
          type="button"
          variant="outline"
          className="mt-6"
          onClick={onAction}
        >
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
