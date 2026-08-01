import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
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
import { fadeUp, useSectionReveal } from '@/lib/reveal'

const SECTIONS = ['mission', 'team', 'join']

// Bios are keys, not resolved strings: resolving them here would freeze
// whichever locale happened to render first.
const MEMBERS = [
  {
    name: 'Sri Kondapalli',
    image: 'sri.jpg',
    bio: 'about.about_sri',
    current: false,
  },
  {
    name: 'Rohan Bolle',
    image: 'rohan.jpg',
    bio: 'about.about_rohan',
    current: false,
  },
  {
    name: 'Aneesha Acharya',
    image: 'aneesha.jpg',
    bio: 'about.about_aneesha',
    current: false,
  },
  {
    name: 'Angelo Chen',
    image: 'angelo.jpg',
    bio: 'about.about_angelo',
    current: false,
  },
  {
    name: 'Sonica Prakash',
    image: 'sonica.jpg',
    bio: 'about.about_sonica',
    current: false,
  },
  {
    name: 'John Sutor',
    image: 'john.jpg',
    bio: 'about.about_john',
    current: false,
  },
  {
    name: 'Haley Gardner',
    image: 'haley.jpg',
    bio: 'about.about_haley',
    current: false,
  },
  {
    name: 'Carlos Mercado-Lara',
    image: 'carlos.jpg',
    bio: 'about.about_carlos',
    current: false,
  },
  {
    name: 'Erin Kang',
    image: 'erin.jpg',
    bio: 'about.about_erin',
    current: false,
  },
  {
    name: 'Grace Jiang',
    image: 'grace.jpg',
    bio: 'about.about_grace',
    current: false,
  },
  {
    name: 'Aarti Kalamangalam',
    image: 'aarti.jpg',
    bio: 'about.about_aarti',
    current: false,
  },
  {
    name: 'Iman Khalid',
    image: 'iman.jpg',
    bio: 'about.about_iman',
    current: false,
  },
  {
    name: 'Liane Xu',
    image: 'liane.jpg',
    bio: 'about.about_liane',
    current: false,
  },
  {
    name: 'Alae Belkhadir',
    image: 'alae.jpg',
    bio: 'about.about_alae',
    current: false,
  },
  {
    name: 'Sanjana Gade',
    image: 'sanjana.jpg',
    bio: 'about.about_sanjana',
    current: false,
  },
  {
    name: 'Joud Abdul Baki',
    image: 'joud.jpg',
    bio: 'about.about_joud',
    current: false,
  },
  {
    name: 'Philip Antonopoulos',
    image: 'philip.jpg',
    bio: 'about.about_philip',
    current: false,
  },
  {
    name: 'Srishti Swaminathan',
    image: 'srishti.jpg',
    bio: 'about.about_srishti',
    current: false,
  },
  {
    name: 'Grace Nyakarombo',
    image: 'grace2.jpg',
    bio: 'about.about_grace2',
    current: false,
  },
  {
    name: 'Tasman Rosenfeld',
    image: 'tasman.jpg',
    bio: 'about.about_tasman',
    current: false,
  },
  {
    name: 'Luke Sutor',
    image: 'luke.jpg',
    bio: 'about.about_luke',
    current: false,
  },
  {
    name: 'Hannah Scaglione',
    image: 'hannah.jpg',
    bio: 'about.about_hannah',
    current: false,
  },
  {
    name: 'Ohm Parikh',
    image: 'ohm.jpg',
    bio: 'about.about_ohm',
    current: false,
  },
  {
    name: 'Akash Patel',
    image: 'akash.jpg',
    bio: 'about.about_akash',
    current: false,
  },
  {
    name: 'Eduard Shkulipa',
    image: 'eduard.jpg',
    bio: 'about.about_eduard',
    current: false,
  },
  {
    name: 'Aya Khalaf',
    image: 'aya.jpg',
    bio: 'about.about_aya',
    current: false,
  },
  {
    name: 'Angelica Castillejos',
    image: 'angelica.jpg',
    bio: 'about.about_angelica',
    current: false,
  },
  {
    name: 'Ashley Pelton',
    image: 'ashley.jpg',
    bio: 'about.about_ashley',
    current: false,
  },
]

// Fisher-Yates: sort-based shuffles are biased and non-uniform.
function shuffle(items) {
  const shuffled = [...items]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

function MemberGrid({ members }) {
  const { t } = useTranslation('common')

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {members.map((member) => (
        <li key={member.name}>
          <Card className="h-full">
            <CardContent className="flex h-full items-start gap-4 p-5">
              <Image
                src={`/assets/headshots/${member.image}`}
                alt=""
                width={112}
                height={112}
                className="size-14 shrink-0 rounded-full object-cover"
              />
              <div className="min-w-0">
                <p className="font-semibold leading-tight">
                  {member.name}
                </p>
                <p className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                  {t(member.bio)}
                </p>
              </div>
            </CardContent>
          </Card>
        </li>
      ))}
    </ul>
  )
}

export default function About() {
  const { t } = useTranslation('common')

  const [members, setMembers] = useState(MEMBERS)
  const [animateLanding, setAnimateLanding] =
    useState(false)

  useEffect(() => {
    // Shuffled on the client only, so the roster never reads as a
    // ranking and the prerendered HTML stays stable.
    setMembers(shuffle(MEMBERS))
    setAnimateLanding(true)
  }, [])

  const visible = useSectionReveal(SECTIONS)

  const landingSpring = useSpring(fadeUp(animateLanding))
  const missionSpring = useSpring(fadeUp(visible.mission))
  const teamSpring = useSpring(fadeUp(visible.team))
  const joinSpring = useSpring(fadeUp(visible.join))

  const currentMembers = members.filter((m) => m.current)
  const previousMembers = members.filter((m) => !m.current)

  return (
    <div>
      <SocialMeta
        title="About Us | SciTeens"
        description={t('about.we_strive')}
        eyebrow="About"
        path="/about"
      />
      <main>
        <section
          className={`${GUTTER} pb-16 pt-10 md:pb-20 md:pt-16`}
        >
          <animated.div style={landingSpring}>
            <PageHeading className="max-w-[16ch]">
              {t('about.on_a_mission')}
            </PageHeading>
            <HeadingRule />
            <p className="text-muted-foreground text-pretty mt-6 max-w-[58ch] text-base md:mt-7 md:text-lg">
              {t('about.we_strive')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="h-11 px-6 text-base"
                render={<Link href="/get-involved" />}
              >
                {t('navigation.get_involved')}
                <ArrowRight className="group-hover/button:translate-x-0.5 transition-transform" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="h-11 px-5 text-base"
                render={<Link href="/donate" />}
              >
                {t('navigation.donate')}
              </Button>
            </div>
          </animated.div>
        </section>

        <section
          id="mission"
          className="border-border/60 border-y"
        >
          <animated.div
            style={missionSpring}
            className={`${GUTTER} grid gap-8 py-16 md:py-20 lg:grid-cols-[1fr_1.15fr] lg:gap-16`}
          >
            <h2 className="text-balance max-w-[20ch] text-2xl font-bold tracking-tight md:text-4xl">
              {t('index.furthering_accessibility')}
            </h2>
            <p className="text-muted-foreground max-w-[62ch] text-base md:text-lg">
              {t('index.collaborate_on_projects')}
            </p>
          </animated.div>
        </section>

        <section
          id="team"
          className={`${GUTTER} py-20 md:py-28`}
        >
          <animated.div style={teamSpring}>
            <h2 className="text-balance text-2xl font-bold tracking-tight md:text-4xl">
              {t('about.get_to_know_us')}
            </h2>

            {currentMembers.length > 0 && (
              <>
                <h3 className="text-muted-foreground mt-10 text-sm font-semibold">
                  {t('about.current_members')}
                </h3>
                <div className="mt-5">
                  <MemberGrid members={currentMembers} />
                </div>
              </>
            )}

            <h3 className="text-muted-foreground mt-10 text-sm font-semibold">
              {t('about.previous_members')}
            </h3>
            <div className="mt-5">
              <MemberGrid members={previousMembers} />
            </div>
          </animated.div>
        </section>

        <section
          id="join"
          className="border-border/60 border-t"
        >
          <animated.div
            style={joinSpring}
            className={`${GUTTER} flex flex-col gap-6 py-16 md:flex-row md:items-center md:justify-between md:py-20`}
          >
            <div>
              <h2 className="text-balance text-2xl font-bold tracking-tight md:text-4xl">
                {t('get_involved.want_to_get_involved')}
              </h2>
              <p className="text-muted-foreground text-pretty mt-3 max-w-[52ch] text-base">
                {t('get_involved.lede')}
              </p>
            </div>
            <Button
              size="lg"
              className="h-11 shrink-0 self-start px-6 text-base md:self-auto"
              render={<Link href="/get-involved" />}
            >
              {t('navigation.get_involved')}
              <ArrowRight className="group-hover/button:translate-x-0.5 transition-transform" />
            </Button>
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
