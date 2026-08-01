import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  animated,
  useSpring,
  useTrail,
} from '@react-spring/web'
import { ArrowRight } from 'lucide-react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { Trans, useTranslation } from 'next-i18next'
import SocialMeta from '@/components/SocialMeta'
import PageHeading from '@/components/PageHeading'
import HeadingRule from '@/components/HeadingRule'
import { Button } from '@/components/ui/button'
import { GUTTER } from '@/lib/layout'
import { fadeUp, useSectionReveal } from '@/lib/reveal'

const SECTIONS = ['paths', 'contact']

const SUPPORT_EMAIL = 'support@sciteens.org'
const OPPORTUNITIES_EMAIL = 'opportunities@sciteens.org'

// `email` is the single source for the address a row shows, the mailto it
// links, and the mailto a mailto-CTA targets, so the three can't drift
// apart the way they had (the outreach and funding rows used to display
// opportunities@ while linking support@). The address is interpolated
// into the translated sentence rather than concatenated after it, so each
// locale owns its own word order and sentence terminator.
const PATHS = [
  {
    id: 'students',
    heading: 'get_involved.students',
    body: 'get_involved.get_involved_student',
    email: OPPORTUNITIES_EMAIL,
    cta: 'get_involved.student_sign_up',
    href: '/signup/student',
  },
  {
    id: 'outreach',
    heading: 'get_involved.outreach',
    body: 'get_involved.get_involved_outreach',
    email: SUPPORT_EMAIL,
    cta: 'get_involved.contact_us',
  },
  {
    id: 'funding',
    heading: 'get_involved.funding',
    body: 'get_involved.get_involved_funding',
    email: SUPPORT_EMAIL,
    trailing: 'get_involved.no_student_limited',
    cta: 'get_involved.donate_now',
    href: '/donate',
  },
]

// Renders the address as a mailto inside whatever sentence the locale
// wraps it in.
function MailLink({ email }) {
  return (
    <a
      href={`mailto:${email}`}
      translate="no"
      className="text-sciteensGreen-regular hover:text-sciteensGreen-dark font-semibold underline-offset-4 hover:underline"
    >
      {email}
    </a>
  )
}

// A row with no `href` is a mail-us row: the CTA targets the same address
// the sentence names.
const ctaTarget = (path) =>
  path.href ?? `mailto:${path.email}`

export default function GetInvolved() {
  const { t } = useTranslation('common')

  const [animateLanding, setAnimateLanding] =
    useState(false)
  useEffect(() => setAnimateLanding(true), [])

  const visible = useSectionReveal(SECTIONS)

  const landingSpring = useSpring(fadeUp(animateLanding))
  const pathsTrail = useTrail(
    PATHS.length,
    fadeUp(visible.paths)
  )
  const contactSpring = useSpring(fadeUp(visible.contact))

  return (
    <div>
      <SocialMeta
        title="Get Involved | SciTeens"
        description={t('get_involved.lede')}
        eyebrow="Get Involved"
        path="/get-involved"
      />
      <main>
        <section
          className={`${GUTTER} pb-14 pt-10 md:pb-16 md:pt-16`}
        >
          <animated.div style={landingSpring}>
            <PageHeading className="max-w-[16ch]">
              {t('get_involved.want_to_get_involved')}
            </PageHeading>
            <HeadingRule />
            <p className="text-muted-foreground text-pretty mt-6 max-w-[58ch] text-base md:mt-7 md:text-lg">
              {t('get_involved.lede')}
            </p>
          </animated.div>
        </section>

        <section id="paths" className={GUTTER}>
          {pathsTrail.map((style, index) => {
            const path = PATHS[index]

            return (
              <animated.div
                key={path.id}
                style={style}
                className="border-border/60 grid gap-6 border-t py-12 md:py-16 lg:grid-cols-[1fr_1.4fr] lg:gap-16"
              >
                <h2 className="text-balance text-2xl font-bold tracking-tight md:text-4xl">
                  {t(path.heading)}
                </h2>
                <div>
                  <p className="text-muted-foreground max-w-[62ch] text-base md:text-lg">
                    <Trans
                      i18nKey={path.body}
                      values={{ email: path.email }}
                      components={{
                        mail: (
                          <MailLink email={path.email} />
                        ),
                      }}
                    />
                    {path.trailing &&
                      ` ${t(path.trailing)}`}
                  </p>
                  <Button
                    size="lg"
                    className="mt-6 h-11 px-6 text-base"
                    render={
                      path.href ? (
                        <Link href={path.href} />
                      ) : (
                        <a
                          href={ctaTarget(path)}
                          aria-label={t(path.cta)}
                        />
                      )
                    }
                  >
                    {t(path.cta)}
                    <ArrowRight className="group-hover/button:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              </animated.div>
            )
          })}
        </section>

        <section
          id="contact"
          className="border-border/60 border-y"
        >
          <animated.div
            style={contactSpring}
            className={`${GUTTER} py-14 md:py-16`}
          >
            <p className="max-w-[58ch] text-base md:text-lg">
              <Trans
                i18nKey="get_involved.not_sure_where"
                values={{ email: SUPPORT_EMAIL }}
                components={{
                  mail: <MailLink email={SUPPORT_EMAIL} />,
                }}
              />
            </p>
          </animated.div>
        </section>
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
