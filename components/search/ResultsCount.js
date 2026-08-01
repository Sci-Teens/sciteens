// Always mounted so the count is announced when it changes; screen
// readers ignore a live region that only appears alongside its content.
// Left to collapse when empty: /projects only gets a count from the
// search index, so a reserved line would sit blank for the whole of
// plain browsing.
export default function ResultsCount({ children }) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-muted-foreground mb-2 text-sm tabular-nums"
    >
      {children}
    </p>
  )
}
