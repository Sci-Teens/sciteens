import { Html, Head, Main, NextScript } from 'next/document'
import { nunito } from '../lib/fonts'

export default function Document() {
  return (
    <Html className={nunito.variable}>
      <Head />
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  )
}
