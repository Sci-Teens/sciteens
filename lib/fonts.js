import { Nunito } from 'next/font/google'

// Single shared next/font instance so the `--font-sciteens` CSS variable
// resolves to the same hashed family in both `_app` (app tree) and
// `_document` (<html>). Hoisting it to <html> lets body-level portals
// (Dialog/DropdownMenu/Sheet) inherit Nunito instead of the sans fallback.
export const nunito = Nunito({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sciteens',
})
