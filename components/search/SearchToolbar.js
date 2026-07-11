import { Filter, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'

// Persistent search bar + optional extra controls (e.g. a sort Select)
// + mobile "Filters" trigger, shared by /projects, /courses, /articles.
// Always visible at every breakpoint — the previous per-page layouts
// each hid their entire search UI below `lg` (or, on /articles, hid the
// real one and duplicated a second, differently-styled mobile-only
// form), leaving mobile/tablet visitors with a broken or inconsistent
// search experience depending which page they were on.
export default function SearchToolbar({
  value,
  onChange,
  onSubmit,
  placeholder,
  searchLabel,
  submitLabel,
  filtersLabel,
  hasActiveFilters,
  filtersOpen,
  onFiltersOpenChange,
  filterPanel,
  children,
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        onSubmit={onSubmit}
        className="flex flex-1 flex-row gap-2"
      >
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            value={value}
            onChange={onChange}
            name="search"
            type="text"
            maxLength="100"
            placeholder={placeholder}
            aria-label={searchLabel}
            className="bg-card pl-9 shadow-sm"
          />
        </div>
        <Button type="submit" className="shrink-0">
          {submitLabel}
        </Button>
      </form>

      {children}

      {filterPanel && (
        <Sheet
          open={filtersOpen}
          onOpenChange={onFiltersOpenChange}
        >
          <SheetTrigger
            render={
              <Button
                variant="outline"
                className="bg-card shrink-0 shadow-sm lg:hidden"
              >
                <Filter
                  className="h-4 w-4"
                  aria-hidden="true"
                />
                {filtersLabel}
                {hasActiveFilters && (
                  <span
                    className="bg-primary ml-0.5 inline-block h-1.5 w-1.5 rounded-full"
                    aria-hidden="true"
                  />
                )}
              </Button>
            }
          />
          <SheetContent
            side="right"
            className="overflow-y-auto px-6 pt-16"
          >
            <SheetTitle>{filtersLabel}</SheetTitle>
            <div className="mt-6">{filterPanel}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
