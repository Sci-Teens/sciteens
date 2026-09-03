import { useEffect, useState } from 'react'
import Head from 'next/head'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useTranslation } from 'next-i18next'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

import { useSigninCheck } from '../../context/AuthContext'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import LoadingSpinner from '@/components/LoadingSpinner'

const ACCEPT_INVITE_ENDPOINT =
  'https://us-central1-directed-relic-266701.cloudfunctions.net/acceptProjectInvite'
const INVITE_TOKEN_KEY = 'projectInviteToken'

export default function ProjectInvite() {
  const { t } = useTranslation('common')
  const router = useRouter()
  const { status: authStatus, data: signInCheckResult } =
    useSigninCheck()
  const [status, setStatus] = useState('loading')
  const [projectId, setProjectId] = useState('')

  useEffect(() => {
    if (!router.isReady || authStatus !== 'success') return

    let fragmentToken = ''
    try {
      fragmentToken = decodeURIComponent(
        window.location.hash.slice(1)
      )
    } catch {
      fragmentToken = ''
    }
    if (fragmentToken) {
      sessionStorage.setItem(
        INVITE_TOKEN_KEY,
        fragmentToken
      )
      window.history.replaceState(
        window.history.state,
        '',
        window.location.pathname
      )
    }
    const token =
      fragmentToken ||
      sessionStorage.getItem(INVITE_TOKEN_KEY) ||
      ''

    if (!signInCheckResult?.signedIn) {
      setStatus(token ? 'signin' : 'error')
      return
    }
    if (!token) {
      setStatus('error')
      return
    }

    let cancelled = false
    async function acceptInvite() {
      try {
        const idToken =
          await signInCheckResult.user.getIdToken()
        const response = await fetch(
          ACCEPT_INVITE_ENDPOINT,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${idToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ token }),
          }
        )
        const body = await response.json().catch(() => null)
        if (!response.ok || !body?.ok || !body.projectId) {
          throw new Error('invalid_invite')
        }
        sessionStorage.removeItem(INVITE_TOKEN_KEY)
        if (!cancelled) {
          setProjectId(body.projectId)
          setStatus('success')
        }
      } catch {
        if (!cancelled) setStatus('error')
      }
    }
    acceptInvite()
    return () => {
      cancelled = true
    }
  }, [authStatus, router.isReady, signInCheckResult])

  return (
    <>
      <Head>
        <title>
          {t('project_invite.title')} | SciTeens
        </title>
      </Head>
      <main className="mx-auto flex min-h-[50vh] max-w-2xl items-center px-4 py-16 md:py-24">
        <Card className="border-border/60 w-full shadow-sm">
          <CardContent className="p-6 md:p-8">
            <h1 className="font-heading text-3xl font-semibold tracking-tight">
              {t('project_invite.title')}
            </h1>
            {status === 'loading' && (
              <div className="flex justify-center py-10">
                <LoadingSpinner />
              </div>
            )}
            {status === 'signin' && (
              <>
                <p className="text-muted-foreground mt-3 leading-7">
                  {t('project_invite.signin_description')}
                </p>
                <Link
                  href={{
                    pathname: '/signin/student',
                    query: { ref: 'project|invite' },
                  }}
                  className={buttonVariants({
                    className: 'mt-6',
                  })}
                >
                  {t('project_invite.sign_in')}
                </Link>
              </>
            )}
            {status === 'success' && (
              <>
                <p className="text-muted-foreground mt-3 leading-7">
                  {t('project_invite.success')}
                </p>
                <Link
                  href={`/project/${projectId}`}
                  className={buttonVariants({
                    className: 'mt-6',
                  })}
                >
                  {t('project_invite.view_project')}
                </Link>
              </>
            )}
            {status === 'error' && (
              <p className="text-destructive mt-3 leading-7">
                {t('project_invite.error')}
              </p>
            )}
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
