import { useRef } from 'react'

import { Filter, Search, X } from 'lucide-react'
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
export default function SearchToolbar({
  value,
  onChange,
  onSubmit,
  onClear,
  placeholder,
  searchLabel,
  submitLabel,
  clearSearchLabel,
  filtersLabel,
  hasActiveFilters,
  filtersOpen,
  onFiltersOpenChange,
  filterPanel,
  children,
}) {
  const inputRef = useRef(null)

  // The clear button only exists while the field has a value, so
  // clearing unmounts the element that holds focus and drops it to
  // `<body>`. Hand focus back to the input the button belongs to.
  function handleClear() {
    onClear()
    inputRef.current?.focus()
  }

  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
      <form
        role="search"
        onSubmit={onSubmit}
        className="flex flex-1 flex-row gap-2"
      >
        <div className="relative flex-1">
          <Search
            className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
            aria-hidden="true"
          />
          <Input
            ref={inputRef}
            value={value}
            onChange={onChange}
            name="search"
            type="search"
            inputMode="search"
            enterKeyHint="search"
            autoComplete="off"
            spellCheck={false}
            maxLength="100"
            placeholder={placeholder}
            aria-label={searchLabel}
            // The WebKit clear affordance sits at a different inset and
            // does not fire onClear, so the explicit button below owns it.
            className="bg-card [&::-webkit-search-cancel-button]:hidden touch-manipulation pl-9 pr-9 shadow-sm"
          />
          {value && (
            <button
              type="button"
              onClick={handleClear}
              aria-label={clearSearchLabel}
              className="text-muted-foreground hover:text-foreground absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 transition-colors"
            >
              <X
                className="h-3.5 w-3.5"
                aria-hidden="true"
              />
            </button>
          )}
        </div>
        <Button
          type="submit"
          className="shrink-0 touch-manipulation"
        >
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
                className="bg-card shrink-0 touch-manipulation shadow-sm lg:hidden"
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
            className="overflow-y-auto overscroll-contain px-6 pt-16"
          >
            <SheetTitle>{filtersLabel}</SheetTitle>
            <div className="mt-6">{filterPanel}</div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  )
}
