import { cn } from '@/lib/utils'

// The hand-drawn stroke that sits under a page's opening heading. Shared
// so every top-level page opens with the same gesture instead of each
// one inlining its own copy of the path.
export default function HeadingRule({ className }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 300 12"
      preserveAspectRatio="none"
      className={cn(
        'text-sciteensLightGreen-regular mt-3 h-2.5 w-44 md:mt-4 md:h-4 md:w-72',
        className
      )}
    >
      <path
        d="M3 8.5C58 3.5 112 10.5 168 5.5S262 3 297 6.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  )
}
