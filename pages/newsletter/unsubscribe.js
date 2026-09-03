import Head from 'next/head'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const NEWSLETTER_ENDPOINT =
  'https://us-central1-directed-relic-266701.cloudfunctions.net/newsletter'

export default function NewsletterUnsubscribe() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const [status, setStatus] = useState('ready')
  const [capability, setCapability] = useState(null)
  const subscriber = capability?.subscriber || ''
  const token = capability?.token || ''

  useEffect(() => {
    if (!router.isReady) return
    const fragment = new URLSearchParams(
      window.location.hash.slice(1)
    )
    setCapability({
      subscriber:
        typeof router.query.subscriber === 'string'
          ? router.query.subscriber
          : fragment.get('subscriber'),
      token:
        typeof router.query.token === 'string'
          ? router.query.token
          : fragment.get('token'),
    })
    window.history.replaceState(
      window.history.state,
      '',
      window.location.pathname
    )
  }, [router.isReady, router.query])
  const canUnsubscribe =
    router.isReady &&
    subscriber.length > 0 &&
    token.length > 0

  async function unsubscribe() {
    if (!canUnsubscribe) return

    setStatus('submitting')
    try {
      const params = new URLSearchParams({
        action: 'unsubscribe',
        subscriber,
        token,
        locale: router.locale || 'en',
      })
      const response = await fetch(
        `${NEWSLETTER_ENDPOINT}?${params.toString()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({}),
        }
      )
      const body = await response.json().catch(() => null)
      if (!response.ok || !body?.ok) {
        throw new Error('newsletter_unsubscribe_failed')
      }
      setStatus('success')
    } catch {
      setStatus('error')
    }
  }

  const invalid = !canUnsubscribe || status === 'error'

  return (
    <>
      <Head>
        <title>{t('newsletter.unsubscribe_title')}</title>
      </Head>
      <main className="mx-auto flex min-h-[50vh] max-w-2xl items-center px-4 py-16 md:py-24">
        <Card className="border-border/60 w-full shadow-sm">
          <CardContent className="p-6 md:p-8">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {status === 'success'
                ? t('newsletter.unsubscribed_title')
                : invalid
                ? t('newsletter.unsubscribe_invalid_title')
                : t('newsletter.unsubscribe_title')}
            </h1>
            <p className="text-muted-foreground mt-3 max-w-prose leading-7">
              {status === 'success'
                ? t('newsletter.unsubscribed_description')
                : invalid
                ? t(
                    'newsletter.unsubscribe_invalid_description'
                  )
                : t('newsletter.unsubscribe_description')}
            </p>
            {!invalid && status !== 'success' ? (
              <Button
                className="mt-6"
                onClick={unsubscribe}
                disabled={status === 'submitting'}
              >
                {status === 'submitting'
                  ? t('newsletter.unsubscribe_submitting')
                  : t('newsletter.unsubscribe_submit')}
              </Button>
            ) : null}
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
