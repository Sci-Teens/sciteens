import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// Topic chip list shared by /projects, /courses, /articles — a vertical
// list of full-width toggle buttons (not the old horizontal flex-wrap
// pill layout) so it reads naturally inside the fixed-width filter
// sidebar/sheet on every page. `facets` is optional: pages backed by a
// search index (projects) pass live counts, pages that aren't (courses,
// articles) simply omit it and the counts don't render.
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
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs transition-colors"
          >
            <X className="h-3 w-3" aria-hidden="true" />
            {clearLabel}
          </button>
        )}
      </div>
      <div className="flex flex-col gap-1">
        {Object.entries(fields).map(([key, value]) => {
          const count =
            facets && key !== 'All'
              ? facets.find(
                  (facet) =>
                    facet.field.toLowerCase() ===
                    key.toLowerCase()
                )?.count
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
                'flex items-center justify-between rounded-lg px-3 py-1.5 text-left text-sm transition-colors',
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
