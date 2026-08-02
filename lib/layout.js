// The nav pill sits at `mx-4`, so page content has to start at this edge
// on mobile or the two edges disagree. Split out from GUTTER because the
// centered-column pages (AuthCard) need the mobile edge without the wider
// breakpoints; a nav gutter change should still only ever be one edit.
export const EDGE = 'px-4'

// Shared by every full-bleed marketing page.
export const GUTTER = `${EDGE} md:px-16 lg:px-24`
