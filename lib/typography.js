// Prose link treatments, shared so a link style change is one edit.
//
// `sciteensGreen-dark` is the resting color because it is the only brand
// green that clears WCAG AA on both surfaces links sit on: 6.85:1 on the
// white card and 6.69:1 on backgroundGreen. `sciteensGreen-regular`
// (4.29:1 / 4.19:1) and `sciteensLightGreen-regular` (2.24:1 / 2.18:1)
// both fail, so hover adds the underline instead of lightening the text.
export const INLINE_LINK =
  'text-sciteensGreen-dark font-semibold underline-offset-4 hover:underline'

// The de-emphasized tier, for a link that sits beside a form label rather
// than inside a sentence. `-my-1 py-1` buys a 28px tap target (WCAG 2.2
// target size) without shifting the baseline it is aligned to.
export const MUTED_LINK =
  'text-muted-foreground hover:text-foreground -my-1 py-1 text-sm underline-offset-4 transition-colors hover:underline'
