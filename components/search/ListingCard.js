import Image from 'next/image'
import Link from 'next/link'

import { Card, CardContent } from '@/components/ui/card'

// One card shape for /articles and /courses. Both pages previously
// inlined near-identical markup that had already drifted apart (line
// clamps, description breakpoints, entrance animation on courses only).
//
// Hover is a border/surface shift rather than a lift-and-shadow: the
// design system keeps shadows at `shadow-sm`, and a transform hover on
// every row in a long list is motion that has to be suppressed again
// under `prefers-reduced-motion`.
export default function ListingCard({
  href,
  title,
  fallbackLabel,
  description,
  imageSrc,
  imageAlt,
  priority = false,
  byline,
  meta,
}) {
  return (
    <Card className="border-border/60 hover:border-border hover:bg-muted/40 relative isolate overflow-hidden transition-colors">
      {/* Inset outline: Card is `overflow-hidden`, so the global
          `outline-offset: 2px` focus ring paints outside the clip box
          and disappears entirely.

          The overlay Link has no text content of its own, so a
          blank title would leave it with no accessible name. */}
      <Link
        href={href}
        aria-label={title || fallbackLabel}
        className="focus-visible:outline-ring focus-visible:-outline-offset-2 absolute inset-0 z-10 rounded-xl focus-visible:outline-2"
      />
      <CardContent className="flex items-start gap-4">
        <div className="bg-muted relative h-24 w-24 shrink-0 overflow-hidden rounded-lg md:h-36 md:w-36">
          {imageSrc && (
            <Image
              src={imageSrc}
              alt={imageAlt ?? ''}
              fill
              sizes="(min-width: 768px) 144px, 96px"
              className="object-cover"
              priority={priority}
            />
          )}
        </div>
        <div className="min-w-0 flex-1">
          {byline}
          <h2 className="line-clamp-2 text-pretty text-base font-semibold md:text-lg lg:text-xl">
            {title}
          </h2>
          {description && (
            <p className="text-muted-foreground md:line-clamp-2 max-md:hidden mt-1.5 max-w-[68ch] text-sm leading-relaxed">
              {description}
            </p>
          )}
          {meta && (
            <p className="text-muted-foreground mt-3 text-xs">
              {meta}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
