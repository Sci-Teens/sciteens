import { useId } from 'react'

import { EDGE } from '@/lib/layout'
import { cn } from '@/lib/utils'

// Shared shell for the single-item pages (project, profile, article).
// Each of them used to repeat `mx-auto mt-12 w-full px-4 md:w-2/3
// lg:w-1/2 lg:px-0` on all six or seven sibling blocks, so the column
// width, the mobile gutter and the section rhythm were eight
// separate edits per page and drifted between them. Same opening
// rhythm as AuthCard, so a detail page reads as the same site as
// /about.
//
// `max-w-3xl` is the measure: at the 18px body size these pages use it
// runs ~74 characters, so the text blocks inside need no cap of their
// own (a `max-w-[68ch]` would resolve to 785px in Figtree and never
// bind).
export function DetailMain({ children, className }) {
  return (
    <main
      className={`${EDGE} pb-16 pt-10 md:pb-20 md:pt-16`}
    >
      <div
        className={cn(
          'mx-auto w-full max-w-3xl',
          className
        )}
      >
        {children}
      </div>
    </main>
  )
}

// A rule-delimited block. The refreshed marketing pages carry the rule
// on the section itself (`border-t border-border/60`) instead of
// parking a `<Separator />` in its own full-width container, which is
// what left the detail pages looking like a stack of unrelated stubs.
export function DetailSection({
  title,
  children,
  className,
}) {
  const headingId = useId()

  return (
    <section
      aria-labelledby={title ? headingId : undefined}
      className={cn(
        'border-border/60 mt-10 border-t pt-8 md:mt-12 md:pt-10',
        className
      )}
    >
      {title && (
        <h2
          id={headingId}
          className="text-balance text-xl font-semibold md:text-2xl"
        >
          {title}
        </h2>
      )}
      {children}
    </section>
  )
}

// The small label that introduces a chip row inside the header block
// (topics, links). Matches the eyebrow on /about's roster.
export function DetailLabel({ children, className }) {
  return (
    <h2
      className={cn(
        'text-muted-foreground text-sm font-semibold',
        className
      )}
    >
      {children}
    </h2>
  )
}
