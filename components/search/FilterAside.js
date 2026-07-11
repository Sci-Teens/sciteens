import { Card, CardContent } from '@/components/ui/card'

// Desktop-only (`lg:block`) filter sidebar shared by /projects,
// /courses, /articles. `sticky top-24` keeps it aligned with the page
// nav instead of the old `top-1/2 -translate-y-1/2` (which centered it
// independent of the content column, so it never actually lined up with
// whatever the user had scrolled to).
export default function FilterAside({ children }) {
  return (
    <aside className="sticky top-24 hidden w-72 shrink-0 lg:block">
      <Card className="border-border/60 shadow-sm">
        <CardContent>{children}</CardContent>
      </Card>
    </aside>
  )
}
