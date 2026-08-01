import { X } from 'lucide-react'

// With the filter sidebar hidden below `lg`, the only signal that a
// filter was applied used to be a 6px dot on the Filters button, so you
// had to open the sheet to find out what was narrowing your results.
// These chips surface the active query at every breakpoint and each one
// removes just its own filter.
export default function ActiveFilters({
  label,
  filters = [],
  clearLabel,
  onClear,
}) {
  if (filters.length === 0) return null

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <span className="sr-only">{label}</span>
      {filters.map((filter) => (
        <button
          key={filter.key}
          type="button"
          onClick={filter.onRemove}
          aria-label={filter.removeLabel}
          className="border-border/60 bg-card hover:bg-muted inline-flex max-w-full items-center gap-1.5 rounded-full border px-3 py-1 text-xs transition-colors"
        >
          <span className="text-muted-foreground shrink-0">
            {filter.label}
          </span>
          <span className="text-foreground truncate font-medium">
            {filter.value}
          </span>
          <X
            className="text-muted-foreground h-3 w-3 shrink-0"
            aria-hidden="true"
          />
        </button>
      ))}
      <button
        type="button"
        onClick={onClear}
        className="text-muted-foreground hover:text-foreground text-xs underline underline-offset-4 transition-colors"
      >
        {clearLabel}
      </button>
    </div>
  )
}
