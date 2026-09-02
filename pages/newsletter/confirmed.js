import Head from 'next/head'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { Card, CardContent } from '@/components/ui/card'

export default function NewsletterConfirmed() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const invalid = router.query.status === 'invalid'

  return (
    <>
      <Head>
        <title>{t('newsletter.confirmed_title')}</title>
      </Head>
      <main className="mx-auto flex min-h-[50vh] max-w-2xl items-center px-4 py-16 md:py-24">
        <Card className="border-border/60 w-full shadow-sm">
          <CardContent className="p-6 md:p-8">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {invalid
                ? t('newsletter.confirmed_invalid_title')
                : t('newsletter.confirmed_title')}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-prose leading-7">
              {invalid
                ? t(
                    'newsletter.confirmed_invalid_description'
                  )
                : t('newsletter.confirmed_description')}
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  )
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
