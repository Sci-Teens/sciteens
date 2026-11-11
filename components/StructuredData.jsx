import Head from 'next/head'
import { serializeStructuredData } from '@/lib/structuredData'

export default function StructuredData({ id, data }) {
  return (
    <Head>
      <script
        key={id}
        id={id}
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: serializeStructuredData(data),
        }}
      />
    </Head>
  )
}
