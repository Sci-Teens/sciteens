import { useEffect, useState, useCallback } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

import PageHeading from '@/components/PageHeading'
import LoadingSpinner from '@/components/LoadingSpinner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FieldLabel } from '@/components/ui/field'

// Firebase Functions v1 HTTPS triggers deploy to us-central1 by default
// under the directed-relic-266701 project (see .firebaserc and
// functions/lib/resend.js#FUNCTIONS_BASE_URL, which this must match).
const UNSUBSCRIBE_ENDPOINT =
  'https://us-central1-directed-relic-266701.cloudfunctions.net/unsubscribe'

const CATEGORY_KEYS = ['general', 'programs']

async function callUnsubscribeApi(params) {
  const res = await fetch(
    `${UNSUBSCRIBE_ENDPOINT}?${new URLSearchParams(
      params
    ).toString()}`
  )
  const body = await res.json().catch(() => null)
  if (!res.ok || !body || !body.ok) {
    throw new Error(
      (body && body.error) || 'request_failed'
    )
  }
  return body
}

export default function Unsubscribe() {
  const { t } = useTranslation('common')
  const router = useRouter()

  const [status, setStatus] = useState('loading')
  const [subscriptions, setSubscriptions] = useState(null)
  const [pendingCategory, setPendingCategory] =
    useState(null)
  const [unsubscribedCategory, setUnsubscribedCategory] =
    useState(null)

  const { uid, token, category } = router.query

  useEffect(() => {
    if (!router.isReady) return
    if (
      typeof uid !== 'string' ||
      typeof token !== 'string' ||
      typeof category !== 'string' ||
      !CATEGORY_KEYS.includes(category)
    ) {
      setStatus('invalid')
      return
    }

    let cancelled = false
    async function run() {
      try {
        // Clicking the link is the opt-out: unsubscribe the linked
        // category immediately, then load full state so every list
        // can be managed from this one page.
        await callUnsubscribeApi({
          uid,
          token,
          category,
          action: 'unsubscribe',
        })
        const { subscriptions: current } =
          await callUnsubscribeApi({
            uid,
            token,
            action: 'status',
          })
        if (cancelled) return
        setUnsubscribedCategory(category)
        setSubscriptions(current)
        setStatus('ready')
      } catch (err) {
        if (!cancelled) setStatus('invalid')
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [router.isReady, uid, token, category])

  const toggleCategory = useCallback(
    async (categoryKey, nextSubscribed) => {
      setPendingCategory(categoryKey)
      try {
        await callUnsubscribeApi({
          uid,
          token,
          category: categoryKey,
          action: nextSubscribed
            ? 'subscribe'
            : 'unsubscribe',
        })
        setSubscriptions((prev) => ({
          ...prev,
          [categoryKey]: nextSubscribed,
        }))
      } catch (err) {
        setStatus('error')
      } finally {
        setPendingCategory(null)
      }
    },
    [uid, token]
  )

  return (
    <div>
      <Head>
        <title>{t('unsubscribe.title')} | SciTeens</title>
      </Head>
      <main className="mx-auto max-w-lg px-4 py-12 md:px-0">
        <PageHeading>{t('unsubscribe.title')}</PageHeading>
        <p className="text-muted-foreground mt-2 mb-6">
          {t('unsubscribe.intro')}
        </p>

        {status === 'loading' && (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        )}

        {status === 'invalid' && (
          <Card className="border-border/60 shadow-sm">
            <CardContent>
              <p>{t('unsubscribe.invalid_link')}</p>
            </CardContent>
          </Card>
        )}

        {status === 'error' && (
          <p className="text-destructive mb-4">
            {t('unsubscribe.error')}
          </p>
        )}

        {(status === 'ready' || status === 'error') &&
          subscriptions && (
            <div className="flex flex-col gap-4">
              {unsubscribedCategory && (
                <p className="text-sm">
                  {t(
                    'unsubscribe.unsubscribed_confirmation',
                    {
                      category: t(
                        `unsubscribe.categories.${unsubscribedCategory}`
                      ),
                    }
                  )}
                </p>
              )}
              {CATEGORY_KEYS.map((categoryKey) => {
                const subscribed =
                  subscriptions[categoryKey]
                return (
                  <Card
                    key={categoryKey}
                    className="border-border/60 shadow-sm"
                  >
                    <CardContent className="flex items-start justify-between gap-4">
                      <div className="flex flex-col gap-1">
                        <FieldLabel
                          htmlFor={`sub-${categoryKey}`}
                          className="font-medium"
                        >
                          {t(
                            `unsubscribe.categories.${categoryKey}`
                          )}
                        </FieldLabel>
                        <p className="text-muted-foreground text-sm">
                          {t(
                            `unsubscribe.category_descriptions.${categoryKey}`
                          )}
                        </p>
                        <p className="text-muted-foreground text-xs">
                          {subscribed
                            ? t('unsubscribe.subscribed')
                            : t(
                                'unsubscribe.not_subscribed'
                              )}
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        disabled={
                          pendingCategory === categoryKey
                        }
                        onClick={() =>
                          toggleCategory(
                            categoryKey,
                            !subscribed
                          )
                        }
                      >
                        {subscribed
                          ? t(
                              'unsubscribe.unsubscribe_action'
                            )
                          : t('unsubscribe.resubscribe')}
                      </Button>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
      </main>
    </div>
  )
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
    },
  }
}
