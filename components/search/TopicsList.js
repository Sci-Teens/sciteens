import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Topic chip list shared by /projects, /courses, /articles — a vertical
// list of full-width toggle buttons (not the old horizontal flex-wrap
// pill layout) so it reads naturally inside the fixed-width filter
// sidebar/sheet on every page. `facets` is optional: pages backed by a
// search index (projects) pass live counts, pages that aren't (courses,
// articles) simply omit it and the counts don't render.
//
// Counts are scoped to the active search, and Meilisearch omits empty
// buckets from a facet distribution, so a topic missing from a non-empty
// `facets` means zero matches — rendered as "0" rather than left blank,
// which would read as "unknown" next to siblings that do show a number.
export default function TopicsList({
  topicsLabel,
  fields,
  field,
  onFieldSelect,
  facets,
  hasActiveFilters,
  clearLabel,
  onClear,
}) {
  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-foreground text-sm font-semibold">
          {topicsLabel}
        </h2>
        {hasActiveFilters && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="text-muted-foreground hover:text-foreground inline-flex touch-manipulation items-center gap-1 text-xs transition-colors"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            {clearLabel}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {Object.entries(fields).map(([key, value]) => {
          const count =
            facets?.length && key !== 'All'
              ? facets.find(
                  (facet) =>
                    facet.field.toLowerCase() ===
                    key.toLowerCase()
                )?.count ?? 0
              : undefined
          const active =
            key === 'All' ? !field : field === key
          return (
            <button
              key={key}
              type="button"
              onClick={() => onFieldSelect(key)}
              aria-pressed={active}
              className={cn(
                'flex touch-manipulation items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition-colors',
                active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-foreground hover:bg-muted'
              )}
            >
              <span>{value}</span>
              {typeof count === 'number' && (
                <span
                  className={cn(
                    'text-xs tabular-nums',
                    active
                      ? 'text-primary-foreground/80'
                      : 'text-muted-foreground'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
