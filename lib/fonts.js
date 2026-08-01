import {
  Anek_Devanagari,
  Archivo,
  Figtree,
} from 'next/font/google'

// One shared set of next/font instances so the CSS variables resolve to the
// same hashed families in both `_app` (app tree) and `_document` (<html>).
// Hoisting them to <html> lets body-level portals (Dialog/DropdownMenu/Sheet)
// inherit the type system instead of the sans fallback. The variables are
// composed into `--font-sciteens` / `--font-heading` in styles/globals.css.
export const figtree = Figtree({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-figtree',
})

export const archivo = Archivo({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-archivo',
})

// Devanagari coverage, composed after the latin faces so the browser only
// reaches it for codepoints they cannot render. `preload: false` keeps it off
// the critical path: latin pages fetch it lazily (the footer language switcher
// paints one Devanagari label) rather than blocking first paint on it.
export const anekDevanagari = Anek_Devanagari({
  subsets: ['devanagari'],
  display: 'swap',
  preload: false,
  variable: '--font-anek-devanagari',
})

export const fontVariables = `${figtree.variable} ${archivo.variable} ${anekDevanagari.variable}`
