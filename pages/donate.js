import Link from 'next/link'
import Image from 'next/image'
import { animated, useSpring } from '@react-spring/web'
import { ArrowRight } from 'lucide-react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import SocialMeta from '@/components/SocialMeta'
import PageHeading from '@/components/PageHeading'
import HeadingRule from '@/components/HeadingRule'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { GUTTER } from '@/lib/layout'
import { riseUp, useSectionReveal } from '@/lib/reveal'
import { SITE_STATS } from '@/lib/siteStats'

const SECTIONS = ['appeal']

const PAYPAL_URL =
  'https://www.paypal.com/donate?hosted_button_id=7B8QACYV83ACA'

export default function Donate() {
  const { t } = useTranslation('common')

  const visible = useSectionReveal(SECTIONS)

  const appealSpring = useSpring(riseUp(visible.appeal))

  return (
    <div>
      <SocialMeta
        title="Donate | SciTeens"
        description={t('donate.lede')}
        eyebrow="Donate"
        path="/donate"
      />
      <main>
        <section
          className={`${GUTTER} pb-16 pt-10 md:pb-20 md:pt-16`}
        >
          <div className="reveal-up">
            <PageHeading className="max-w-[16ch]">
              {t('donate.annual_donation_appeal')}
            </PageHeading>
            <HeadingRule />
            <p className="text-muted-foreground text-pretty mt-6 max-w-[58ch] text-base md:mt-7 md:text-lg">
              {t('donate.lede')}
            </p>
          </div>
        </section>

        <section
          id="appeal"
          className="border-border/60 border-t"
        >
          <animated.div
            style={appealSpring}
            className={`${GUTTER} grid items-start gap-10 py-16 md:py-24 lg:grid-cols-[1.5fr_1fr] lg:gap-16`}
          >
            {/* Ahead of the letter in DOM order so the ask is the
                first thing a phone shows; the grid puts it back on
                the right once there is room for two columns. */}
            <Card className="lg:sticky lg:top-8 lg:order-2">
              <CardContent className="p-6 md:p-7">
                <h2 className="text-balance text-xl font-bold tracking-tight md:text-2xl">
                  {t('donate.support_sciteens')}
                </h2>
                <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                  {t('donate.every_donation_counts')}
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  <Button
                    size="lg"
                    className="h-11 w-full px-6 text-base"
                    render={
                      <a
                        href={PAYPAL_URL}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={t('donate.donate_now')}
                      />
                    }
                  >
                    {t('donate.donate_now')}
                    <ArrowRight className="group-hover/button:translate-x-0.5 transition-transform" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="lg"
                    className="h-11 w-full px-6 text-base"
                    render={<Link href="/about" />}
                  >
                    {t('donate.read_our_mission')}
                  </Button>
                </div>
                <p className="text-muted-foreground border-border/60 mt-7 border-t pt-6 text-sm font-semibold">
                  {t('donate.our_reach')}
                </p>
                <dl className="mt-4 grid grid-cols-3 gap-4">
                  {SITE_STATS.map((stat) => (
                    <div
                      key={stat.label}
                      className="flex flex-col-reverse justify-end"
                    >
                      <dt className="text-muted-foreground mt-1 text-xs leading-tight">
                        {t(stat.label)}
                      </dt>
                      <dd className="text-2xl font-extrabold tabular-nums md:text-3xl">
                        {stat.value}
                        {stat.suffix}
                      </dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
            <article className="max-w-[66ch] text-base leading-relaxed md:text-lg lg:order-1">
              <p>{t('donate.dear_supporter')}</p>
              <p className="mt-5">
                {t('donate.sciteens_pride')}
              </p>
              <p className="mt-5">
                {t('donate.we_depend_on_donations')}
              </p>
              <p className="mt-5">
                {t('donate.we_kindly_ask')}
              </p>
              <p className="mt-8">
                {t('donate.sincerely')},
              </p>
              <Image
                src="/assets/sutor_signature.png"
                alt="John Sutor Signature"
                width={1099}
                height={318}
                className="mt-2 h-12 w-auto"
              />
              <p className="mt-2 font-semibold">
                John Sutor
              </p>
              <p className="text-muted-foreground text-base">
                {t('donate.co_founder')}
              </p>
            </article>
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
