import { Html, Head, Main, NextScript } from 'next/document'
import { fontVariables } from '../lib/fonts'

export default function Document() {
  return (
    <Html className={fontVariables}>
      <Head />
      <body className="bg-background text-foreground">
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
