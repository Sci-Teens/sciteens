import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useEffect, useRef, useState } from 'react'
import { i18n } from 'next-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

const NEWSLETTER_ENDPOINT =
  'https://us-central1-directed-relic-266701.cloudfunctions.net/newsletter'
export default function Footer() {
  const router = useRouter()
  const [newsletterStatus, setNewsletterStatus] =
    useState('idle')
  const emailRef = useRef(null)

  async function handleNewsletterSubmit(event) {
    event.preventDefault()
    const form = event.currentTarget
    const email = emailRef.current?.value || ''
    const website = new FormData(form).get('website')
    setNewsletterStatus('submitting')
    try {
      const response = await fetch(NEWSLETTER_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          locale: router.locale || 'en',
          website:
            typeof website === 'string' ? website : '',
        }),
      })
      const body = await response.json().catch(() => null)
      if (!response.ok || !body?.ok) {
        throw new Error('newsletter_request_failed')
      }

      emailRef.current.value = ''
      setNewsletterStatus('success')
    } catch {
      setNewsletterStatus('error')
    }
  }

  useEffect(() => {
    if (router.isReady && i18n?.isInitialized) {
      // Empty bundle on purpose: this only marks the namespace as
      // present for a client-only mount. i18next throws outright when
      // `resources` is omitted, so the argument is not optional.
      i18n.addResourceBundle(router.locale, 'common', {})
    }
  }, [router])

  return (
    <footer suppressHydrationWarning={true}>
      {i18n?.isInitialized && (
        <>
          <svg
            viewBox="0 0 900 40"
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
          >
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="#F5FFF5"
            />
            <path
              d="M0 10L13.7 11.5C27.3 13 54.7 16 82 16C109.3 16 136.7 13 163.8 10.7C191 8.3 218 6.7 245.2 8C272.3 9.3 299.7 13.7 327 14.3C354.3 15 381.7 12 409 10.7C436.3 9.3 463.7 9.7 491 11.7C518.3 13.7 545.7 17.3 573 17.3C600.3 17.3 627.7 13.7 654.8 13.5C682 13.3 709 16.7 736.2 16C763.3 15.3 790.7 10.7 818 8.2C845.3 5.7 872.7 5.3 886.3 5.2L900 5L900 41L886.3 41C872.7 41 845.3 41 818 41C790.7 41 763.3 41 736.2 41C709 41 682 41 654.8 41C627.7 41 600.3 41 573 41C545.7 41 518.3 41 491 41C463.7 41 436.3 41 409 41C381.7 41 354.3 41 327 41C299.7 41 272.3 41 245.2 41C218 41 191 41 163.8 41C136.7 41 109.3 41 82 41C54.7 41 27.3 41 13.7 41L0 41Z"
              fill="#58b386"
            />
            <path
              d="M0 17L13.7 16.7C27.3 16.3 54.7 15.7 82 16.8C109.3 18 136.7 21 163.8 21.2C191 21.3 218 18.7 245.2 18.7C272.3 18.7 299.7 21.3 327 22.2C354.3 23 381.7 22 409 20.8C436.3 19.7 463.7 18.3 491 17.5C518.3 16.7 545.7 16.3 573 17.5C600.3 18.7 627.7 21.3 654.8 22.3C682 23.3 709 22.7 736.2 22.5C763.3 22.3 790.7 22.7 818 22.3C845.3 22 872.7 21 886.3 20.5L900 20L900 41L886.3 41C872.7 41 845.3 41 818 41C790.7 41 763.3 41 736.2 41C709 41 682 41 654.8 41C627.7 41 600.3 41 573 41C545.7 41 518.3 41 491 41C463.7 41 436.3 41 409 41C381.7 41 354.3 41 327 41C299.7 41 272.3 41 245.2 41C218 41 191 41 163.8 41C136.7 41 109.3 41 82 41C54.7 41 27.3 41 13.7 41L0 41Z"
              fill="#3e8d67"
            />
            <path
              d="M0 30L13.7 29.3C27.3 28.7 54.7 27.3 82 27.3C109.3 27.3 136.7 28.7 163.8 28.7C191 28.7 218 27.3 245.2 26.7C272.3 26 299.7 26 327 25.7C354.3 25.3 381.7 24.7 409 25.3C436.3 26 463.7 28 491 27.8C518.3 27.7 545.7 25.3 573 25.5C600.3 25.7 627.7 28.3 654.8 28.5C682 28.7 709 26.3 736.2 25.5C763.3 24.7 790.7 25.3 818 26.5C845.3 27.7 872.7 29.3 886.3 30.2L900 31L900 41L886.3 41C872.7 41 845.3 41 818 41C790.7 41 763.3 41 736.2 41C709 41 682 41 654.8 41C627.7 41 600.3 41 573 41C545.7 41 518.3 41 491 41C463.7 41 436.3 41 409 41C381.7 41 354.3 41 327 41C299.7 41 272.3 41 245.2 41C218 41 191 41 163.8 41C136.7 41 109.3 41 82 41C54.7 41 27.3 41 13.7 41L0 41Z"
              fill="#236648"
            />
          </svg>
          {/* Ring is scoped to white here because the global
              `--ring` is the same #236648 as this surface, which
              would make the focus outline invisible. */}
          <div className="bg-sciteensGreen-dark text-primary-foreground/80 px-4 pb-8 pt-4 [--ring:#ffffff] md:px-24">
            <section
              className="border-primary-foreground/20 grid gap-6 border-b pb-8 md:grid-cols-[minmax(0,1fr)_minmax(20rem,30rem)] md:items-end md:gap-12"
              aria-labelledby="newsletter-heading"
            >
              <div>
                <h2
                  id="newsletter-heading"
                  className="font-heading text-2xl font-semibold tracking-tight text-white"
                >
                  {i18n.t('footer.newsletter_heading')}
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-6">
                  {i18n.t('footer.newsletter_description')}
                </p>
              </div>
              <form
                className="w-full"
                onSubmit={handleNewsletterSubmit}
              >
                <label
                  className="sr-only"
                  htmlFor="footer-newsletter-email"
                >
                  {i18n.t('footer.newsletter_email_label')}
                </label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    ref={emailRef}
                    id="footer-newsletter-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    disabled={
                      newsletterStatus === 'submitting'
                    }
                    placeholder={i18n.t(
                      'footer.newsletter_placeholder'
                    )}
                    aria-describedby="newsletter-consent newsletter-status"
                    className="border-primary-foreground/30 text-foreground placeholder:text-muted-foreground h-10 bg-white"
                  />
                  <label
                    className="absolute -left-[10000px] h-px w-px overflow-hidden"
                    aria-hidden="true"
                  >
                    Website
                    <input
                      name="website"
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                    />
                  </label>
                  <Button
                    type="submit"
                    disabled={
                      newsletterStatus === 'submitting'
                    }
                    className="text-sciteensGreen-dark h-10 w-full bg-white px-4 hover:bg-white/90 sm:w-auto"
                  >
                    {newsletterStatus === 'submitting'
                      ? i18n.t(
                          'footer.newsletter_submitting'
                        )
                      : i18n.t('footer.newsletter_submit')}
                  </Button>
                </div>
                <p
                  id="newsletter-consent"
                  className="mt-2 text-xs leading-5"
                >
                  {i18n.t(
                    'footer.newsletter_privacy_prefix'
                  )}{' '}
                  <Link
                    href="/legal/privacy"
                    className="text-white underline underline-offset-4 hover:no-underline"
                  >
                    {i18n.t(
                      'footer.newsletter_privacy_link'
                    )}
                  </Link>
                  .
                </p>
                <p
                  id="newsletter-status"
                  className="min-h-5 mt-2 text-sm text-white"
                  aria-live="polite"
                  role={
                    newsletterStatus === 'error'
                      ? 'alert'
                      : undefined
                  }
                >
                  {newsletterStatus === 'success'
                    ? i18n.t(
                        'footer.newsletter_confirmation_sent'
                      )
                    : newsletterStatus === 'error'
                    ? i18n.t('footer.newsletter_error')
                    : null}
                </p>
              </form>
            </section>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="w-full">
                <p className="mb-1 font-semibold text-white md:mb-2">
                  {i18n.t('footer.organization')}
                </p>
                <ul>
                  <li>
                    <Link href="/about">
                      {i18n.t('footer.about')}
                    </Link>
                  </li>
                  <li>
                    <Link href="/signup/student">
                      {i18n.t('footer.get_started')}
                    </Link>
                  </li>
                  <li>
                    <a
                      href="mailto:info@sciteens.org"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {i18n.t('footer.contact')}
                    </a>
                  </li>
                  <li>
                    <Link href="/get-involved">
                      {i18n.t('footer.get_involved')}
                    </Link>
                  </li>
                  <li>
                    <a
                      href="https://docs.google.com/forms/d/e/1FAIpQLScbDPaXgLflGrV3NSXpOTSFYoU2dIcEFy-xT2Kz9-6dMUYotQ/viewform?usp=sf_link"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {i18n.t('footer.feedback')}
                    </a>
                  </li>
                </ul>
              </div>
              <div className="w-full">
                <p className="mb-1 font-semibold text-white md:mb-2">
                  {i18n.t('footer.legal')}
                </p>
                <ul>
                  <li>
                    <Link href="/legal/privacy">
                      {i18n.t('footer.privacy')}
                    </Link>
                  </li>
                  <li>
                    <Link href="/legal/terms">
                      {i18n.t('footer.terms')}
                    </Link>
                  </li>
                  <li>
                    <Link href="/legal/gdpr">
                      {i18n.t('footer.cookies')}
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="w-full">
                <p className="mb-1 font-semibold text-white md:mb-2">
                  {i18n.t('footer.language')}
                </p>
                <ul>
                  <li>
                    <Link
                      href={router.pathname}
                      locale="en"
                    >
                      English
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={router.pathname}
                      locale="es"
                    >
                      Español
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={router.pathname}
                      locale="fr"
                    >
                      Français
                    </Link>
                  </li>
                  <li>
                    <Link
                      href={router.pathname}
                      locale="hi"
                    >
                      नहीं
                    </Link>
                  </li>
                </ul>
              </div>
              <div className="w-full">
                <p className="mb-2 font-semibold text-white">
                  {i18n.t('footer.follow_us')}
                </p>
                <div className="flex flex-row gap-4">
                  <a
                    href="https://www.facebook.com/SciTeensinfo"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      className="h-6 w-auto"
                      src="/assets/icons/facebook-flat.svg"
                      alt="Facebook"
                      width={24}
                      height={24}
                      unoptimized
                    />
                  </a>
                  <a
                    href="https://www.instagram.com/sci.teens/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      className="h-6 w-auto"
                      src="/assets/icons/instagram.svg"
                      alt="Instagram"
                      width={24}
                      height={24}
                      unoptimized
                    />
                  </a>
                  <a
                    href="https://www.linkedin.com/company/sciteens/"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      className="h-6 w-auto"
                      src="/assets/icons/linkedin-flat.svg"
                      alt="LinkedIn"
                      width={26}
                      height={24}
                      unoptimized
                    />
                  </a>
                  <a
                    href="https://www.youtube.com/channel/UCXnyAT9TOrXywV0M6HbhaRA"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      className="h-6 w-auto"
                      src="/assets/icons/youtube.svg"
                      alt="YouTube"
                      width={24}
                      height={24}
                      unoptimized
                    />
                  </a>
                  <a
                    href="https://www.tiktok.com/@sciteens"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      className="h-6 w-auto"
                      src="/assets/icons/tiktok.svg"
                      alt="TikTok"
                      width={24}
                      height={24}
                      unoptimized
                    />
                  </a>
                  <a
                    href="https://discord.gg/QuS4fjePK6"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Image
                      className="h-6 w-auto"
                      src="/assets/icons/discord.svg"
                      alt="Discord"
                      width={31}
                      height={24}
                      unoptimized
                    />
                  </a>
                </div>
              </div>
            </div>
            <div className="border-primary-foreground/20 mx-auto mt-8 border-t-2">
              <p className="mt-4 text-left">
                &copy; SciTeens Inc.{' '}
                {new Date().getFullYear()}
              </p>
            </div>
          </div>
        </>
      )}
    </footer>
  )
}
