import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

// Mirrors the real card geometry. The pages used to load a stack of
// `h-16` bars and then swap in ~180px cards, so every list jumped its
// own height once results arrived.
//
// Purely decorative: the loading state is announced through the
// always-mounted `ResultsCount` region, because a live region inserted
// with its text already in place is not reliably read out.
export default function ListingSkeleton({ count = 5 }) {
  return (
    <div aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="pt-6 md:pt-8">
          <Card className="border-border/60">
            <CardContent className="flex items-start gap-4">
              <Skeleton className="h-24 w-24 shrink-0 rounded-lg md:h-36 md:w-36" />
              <div className="min-w-0 flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-3 h-5 w-3/4" />
                <Skeleton className="mt-3 hidden h-4 w-full md:block" />
                <Skeleton className="mt-2 hidden h-4 w-2/3 md:block" />
              </div>
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  )
}
