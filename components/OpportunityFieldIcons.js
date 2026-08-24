import { cn } from '@/lib/utils'
import { getFieldIcon } from '@/lib/fieldIcons'

// Opportunities have no hosted photo (see lib/mockPrograms.js), so the
// ListingCard media slot shows the program's STEM field(s) as colored
// icon tiles instead — one full-bleed tile when there's a single field,
// a 2-up grid when a program spans several (e.g. Regeneron ISEF).
export default function OpportunityFieldIcons({
  fields = [],
  size = 'sm',
}) {
  const items = (fields.length ? fields : ['']).slice(0, 4)
  const single = items.length === 1
  const iconSize =
    size === 'lg'
      ? single
        ? 'h-12 w-12 md:h-16 md:w-16'
        : 'h-7 w-7 md:h-9 md:w-9'
      : single
      ? 'h-10 w-10 md:h-14 md:w-14'
      : 'h-5 w-5 md:h-7 md:w-7'

  return (
    <div
      className={cn(
        'grid h-full w-full',
        single ? 'grid-cols-1' : 'grid-cols-2'
      )}
    >
      {items.map((field, index) => {
        const { Icon, bg, fg } = getFieldIcon(field)
        return (
          <div
            key={`${field}-${index}`}
            className={cn(
              'flex items-center justify-center',
              bg
            )}
          >
            <Icon
              className={cn(iconSize, fg)}
              aria-hidden="true"
            />
          </div>
        )
      })}
    </div>
  )
}
