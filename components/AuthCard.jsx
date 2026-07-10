import { cn } from '@/lib/utils'

// Shared visual shell for every sign-in/sign-up page: a centered card
// on the app's card/border/shadow tokens, matching the rest of the
// site (NavBar, /signup, /getinvolved, /about, ...) instead of the
// hardcoded bg-white/text-gray-700 styling the auth forms drifted to.
export default function AuthCard({
  title,
  subtitle,
  children,
  maxWidth = 'max-w-md',
  className,
}) {
  return (
    <main className="-mt-8 flex min-h-screen items-center justify-center px-4 py-12">
      <div
        className={cn(
          'border-border/60 bg-card w-full rounded-xl border p-8 shadow-sm sm:p-10',
          maxWidth,
          className
        )}
      >
        {title && (
          <h1 className="text-center text-3xl font-semibold">
            {title}
          </h1>
        )}
        {subtitle && (
          <p className="text-muted-foreground text-balance mt-2 text-center text-sm">
            {subtitle}
          </p>
        )}
        <div
          className={title || subtitle ? 'mt-6' : undefined}
        >
          {children}
        </div>
      </div>
    </main>
  )
}
