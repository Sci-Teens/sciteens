import HeadingRule from '@/components/HeadingRule'
import PageHeading from '@/components/PageHeading'
import { EDGE } from '@/lib/layout'
import { cn } from '@/lib/utils'

// Shared shell for every sign-in/sign-up and account form page. Opens the
// way the refreshed marketing pages do (PageHeading, HeadingRule, muted
// lede, one entrance reveal on load) with the form in a
// ProjectCard-shaped panel, so these read as the same site as /about
// instead of a centered box floating in an empty field.
//
// `panel={false}` is for the confirmation pages, which have no form and
// would otherwise wrap a lone icon or logo in a card for no reason.
export default function AuthCard({
  title,
  subtitle,
  children,
  footer,
  maxWidth = 'max-w-md',
  panel = true,
  className,
}) {
  return (
    <main
      className={`${EDGE} pb-16 pt-10 md:pb-20 md:pt-16`}
    >
      <div
        className={cn('reveal-up mx-auto w-full', maxWidth)}
      >
        {title && (
          <>
            <PageHeading className="lg:text-4xl">
              {title}
            </PageHeading>
            <HeadingRule className="w-32 md:w-48" />
          </>
        )}
        {subtitle && (
          <p className="text-muted-foreground text-pretty mt-5 max-w-[54ch] text-base md:mt-6">
            {subtitle}
          </p>
        )}
        <div
          className={cn(
            'mt-8',
            panel &&
              'border-border/60 bg-card rounded-xl border p-6 shadow-sm sm:p-8',
            className
          )}
        >
          {children}
        </div>
        {footer && (
          <p className="text-muted-foreground mt-6 text-sm">
            {footer}
          </p>
        )}
      </div>
    </main>
  )
}
