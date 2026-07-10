import { cn } from '@/lib/utils'

// Shared page-title treatment (weight + responsive scale) matching the
// homepage hero, so top-level pages (Articles, Projects, About, ...)
// no longer drift to their own one-off heading sizes.
export default function PageHeading({
  as: Tag = 'h1',
  children,
  className,
}) {
  return (
    <Tag
      className={cn(
        'text-3xl font-extrabold md:text-4xl lg:text-5xl',
        className
      )}
    >
      {children}
    </Tag>
  )
}
