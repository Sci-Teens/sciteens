import PageHeading from '@/components/PageHeading'
import FilterAside from '@/components/search/FilterAside'

// Shared shell for /projects, /articles and /courses so the three
// aggregation pages cannot drift apart again.
//
// The container caps at `max-w-6xl` and keeps horizontal padding at
// every breakpoint. The old `px-4 md:px-0 lg:mx-16` ran body text flush
// against the viewport edge between 768px and 1024px, and left it
// unbounded on wide displays, where card descriptions stretched well
// past a readable measure.
export default function ListingLayout({
  title,
  lede,
  actions,
  aside,
  children,
}) {
  return (
    <div className="text-foreground mx-auto mb-24 mt-8 min-h-screen w-full max-w-6xl px-4 md:px-6 lg:px-8">
      <header className="flex flex-col gap-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
        <div className="min-w-0">
          <PageHeading className="text-left">
            {title}
          </PageHeading>
          {lede && (
            <p className="text-muted-foreground text-pretty mt-3 max-w-[58ch] leading-relaxed">
              {lede}
            </p>
          )}
        </div>
        {actions}
      </header>

      <div className="mt-4 flex flex-row items-start gap-8 xl:gap-12">
        <div className="min-w-0 flex-1">{children}</div>
        <FilterAside>{aside}</FilterAside>
      </div>
    </div>
  )
}
