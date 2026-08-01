import SocialMeta from '@/components/SocialMeta'
import Image from 'next/image'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import {
  useSpring,
  useTrail,
  useReducedMotion,
  animated,
  config,
} from '@react-spring/web'
import {
  ArrowRight,
  Atom,
  Code2,
  Cpu,
  Dna,
  FlaskConical,
  Globe,
  GraduationCap,
  Rocket,
  Sprout,
} from 'lucide-react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const AnimatedImage = animated(Image)

// Matches the nav's `mx-4` on mobile so page content lines up with it.
const GUTTER = 'px-4 md:px-16 lg:px-24'

const PARTNERS = [
  {
    src: '/assets/logos/Google_fullsize.png',
    alt: 'Google',
    link: 'https://www.google.com/nonprofits/',
    width: 625,
    height: 212,
  },
  {
    src: '/assets/logos/MIT.png',
    alt: 'MIT',
    link: 'https://innovation.mit.edu/opportunity/mit-ideas-global-challenge/',
    width: 1280,
    height: 662,
  },
  {
    src: '/assets/logos/FSU.png',
    alt: 'FSU',
    link: 'https://www.bio.fsu.edu/ysp/',
    width: 470,
    height: 512,
  },
  {
    src: '/assets/logos/Yale.png',
    alt: 'Yale',
    link: 'https://city.yale.edu/',
    width: 300,
    height: 130,
  },
]

// `field` values are the canonical Title Case keys the projects page filters
// on (context/helpers.js#getTranslatedFieldsDict), so these deep-link
// straight into a filtered feed.
const FIELDS = [
  {
    field: 'Biology',
    label: 'fields.biology',
    icon: Dna,
    image: '/assets/fields/biology.webp',
  },
  {
    field: 'Chemistry',
    label: 'fields.chemistry',
    icon: FlaskConical,
    image: '/assets/fields/chemistry.webp',
  },
  {
    field: 'Physics',
    label: 'fields.physics',
    icon: Atom,
    image: '/assets/fields/physics.webp',
  },
  {
    field: 'Computer Science',
    label: 'fields.computer_science',
    icon: Cpu,
    image: '/assets/fields/computer-science.webp',
  },
  {
    field: 'Environmental Science',
    label: 'fields.environmental_science',
    icon: Sprout,
    image: '/assets/fields/environmental-science.webp',
  },
  {
    field: 'Space Science',
    label: 'fields.space_science',
    icon: Rocket,
    image: '/assets/fields/space-science.webp',
  },
]

const TESTIMONIALS = [
  {
    body: 'Working with students across the world with SciTeens was amazing... I am super grateful that I was able to experience it.',
    name: 'David L.',
    country: 'United States',
    icon: Globe,
  },
  {
    body: 'I want to first thank the members and founders of SciTeens for bringing such a wonderful and amazing opportunity we are having. I would love to thank all the mentors who were taking most of their time mentoring us as well helping us coming up with best projects.',
    name: 'Elisha M.',
    country: 'Zimbabwe',
    icon: GraduationCap,
  },
  {
    body: 'Because of the coding boot camp I did with SciTeens, I was able to find my passion for coding and further expand my knowledge in the STEM field.',
    name: 'Melissa R.',
    country: 'United States',
    icon: Code2,
  },
]

const STATS = [
  { value: 400, suffix: '+', label: 'index.monthly_users' },
  { value: 50, suffix: '', label: 'index.schools' },
  { value: 50, suffix: '+', label: 'index.countries' },
]

const MEDIA = [
  {
    href: 'https://www.neonscience.org/impact/observatory-blog/sciteens-data-science-and-ecology-gen-z',
    src: '/assets/featured_media/neon.jpg',
    title: 'index.data_science_and_ecology',
    date: '2021-02-10',
  },
  {
    href: 'https://news.mit.edu/2019/ideas-challenge-social-ventures-0430',
    src: '/assets/featured_media/ideas.jpg',
    title: 'index.ideas_challenge',
    date: '2019-04-30',
  },
  {
    href: 'https://news.fsu.edu/multimedia/radio/2020/08/03/young-scholars-online-program-turns-students-into-scientists/',
    src: '/assets/featured_media/ysp.jpg',
    title: 'index.young_scholars_program',
    date: '2020-08-03',
  },
]

const SECTIONS = [
  'partners',
  'mission',
  'testimonials',
  'media',
]

// No `from`: the visible=false branch is already the initial render value, and
// re-supplying `from` restarts every spring whenever any section scrolls in.
function fadeUp(visible, overrides) {
  return {
    opacity: visible ? 1 : 0,
    transform: visible
      ? 'translateY(0px)'
      : 'translateY(24px)',
    config: config.gentle,
    ...overrides,
  }
}

export default function Home() {
  const { t } = useTranslation('common')
  const { locale } = useRouter()
  useReducedMotion()

  const [animateLanding, setAnimateLanding] =
    useState(false)
  const [visible, setVisible] = useState({})

  useEffect(() => {
    setAnimateLanding(true)

    const sections = SECTIONS.map((id) => ({
      id,
      element: document.getElementById(id),
    })).filter(({ element }) => Boolean(element))

    if (!('IntersectionObserver' in window)) {
      setVisible(
        Object.fromEntries(SECTIONS.map((id) => [id, true]))
      )
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return
          setVisible((current) => ({
            ...current,
            [entry.target.id]: true,
          }))
          observer.unobserve(entry.target)
        })
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' }
    )

    sections.forEach(({ element }) =>
      observer.observe(element)
    )

    return () => observer.disconnect()
  }, [])

  const formatDate = (iso) =>
    new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(`${iso}T00:00:00Z`))

  const landingSpring = useSpring(
    fadeUp(animateLanding, {
      delay: 100,
      config: config.slow,
    })
  )
  const fieldsTrail = useTrail(
    FIELDS.length,
    fadeUp(animateLanding, { delay: 250 })
  )
  const partnersTrail = useTrail(
    PARTNERS.length,
    fadeUp(visible.partners)
  )
  const missionImageSpring = useSpring(
    fadeUp(visible.mission, { config: config.slow })
  )
  const missionSpring = useSpring(
    fadeUp(visible.mission, { delay: 150 })
  )
  const testimonialsTitleSpring = useSpring(
    fadeUp(visible.testimonials)
  )
  const testimonialsTrail = useTrail(
    TESTIMONIALS.length,
    fadeUp(visible.testimonials, { delay: 200 })
  )
  const statsSpring = useSpring(
    fadeUp(visible.testimonials, { delay: 400 })
  )
  const { countUp } = useSpring({
    countUp: visible.testimonials ? 1 : 0,
    delay: 500,
    config: { duration: 1400 },
  })
  const mediaTitleSpring = useSpring(fadeUp(visible.media))
  const mediaTrail = useTrail(
    MEDIA.length,
    fadeUp(visible.media, { delay: 200 })
  )

  return (
    <div>
      <SocialMeta
        title={`SciTeens — ${t(
          'index.science_simplified'
        )}`}
        description={t('index.share_work')}
        path="/"
      />

      <section
        className={`${GUTTER} pb-16 pt-10 md:pb-24 md:pt-16`}
      >
        <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
          <animated.div style={landingSpring}>
            <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl lg:text-7xl">
              {t('index.science_simplified')}
            </h1>
            <svg
              aria-hidden="true"
              viewBox="0 0 300 12"
              preserveAspectRatio="none"
              className="text-sciteensLightGreen-regular mt-3 h-2.5 w-44 md:mt-4 md:h-4 md:w-72"
            >
              <path
                d="M3 8.5C58 3.5 112 10.5 168 5.5S262 3 297 6.5"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
              />
            </svg>
            <p className="text-muted-foreground mt-6 max-w-[52ch] text-base md:mt-7 md:text-lg">
              {t('index.share_work')}
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button
                size="lg"
                className="h-11 px-6 text-base"
                render={<Link href="/signup/student" />}
              >
                {t('index.get_started')}
                <ArrowRight className="group-hover/button:translate-x-0.5 transition-transform" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="h-11 px-5 text-base"
                render={<Link href="/about" />}
              >
                {t('navigation.about')}
              </Button>
            </div>
          </animated.div>

          <nav aria-label={t('projects.topics')}>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              {fieldsTrail.map((styles, index) => {
                const {
                  field,
                  label,
                  icon: Icon,
                  image,
                } = FIELDS[index]

                return (
                  <animated.div key={field} style={styles}>
                    <Link
                      href={{
                        pathname: '/projects',
                        query: { field },
                      }}
                      className="border-border/60 group relative flex aspect-[3/2] flex-col justify-between overflow-hidden rounded-xl border p-4 shadow-sm transition-transform hover:-translate-y-1 md:p-5"
                    >
                      <Image
                        src={image}
                        alt=""
                        fill
                        sizes="(min-width: 1024px) 23vw, 45vw"
                        className="object-cover transition duration-500 group-hover:scale-105"
                      />
                      <span className="bg-sciteensGreen-regular/45 absolute inset-0 mix-blend-multiply" />
                      <span className="from-sciteensGreen-dark/95 via-sciteensGreen-dark/25 absolute inset-0 bg-gradient-to-t to-transparent" />
                      <span className="bg-sciteensGreen-dark/80 size-8 md:size-9 relative flex items-center justify-center rounded-lg">
                        <Icon className="size-4 md:size-5 text-white" />
                      </span>
                      <span className="relative text-sm font-semibold leading-tight text-white md:text-base">
                        {t(label)}
                      </span>
                    </Link>
                  </animated.div>
                )
              })}
            </div>
          </nav>
        </div>
      </section>

      <section
        id="partners"
        className="border-border/60 border-y"
      >
        <div className={`${GUTTER} py-10 md:py-12`}>
          <p className="text-muted-foreground mb-8 text-sm">
            {t('index.partners')}
          </p>
          <div className="grid grid-cols-2 items-center gap-8 md:grid-cols-4 md:gap-12">
            {partnersTrail.map((styles, index) => {
              const partner = PARTNERS[index]

              return (
                <animated.a
                  key={partner.alt}
                  style={styles}
                  href={partner.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group"
                >
                  <Image
                    src={partner.src}
                    alt={partner.alt}
                    width={partner.width}
                    height={partner.height}
                    className="mx-auto h-8 w-auto opacity-50 brightness-0 grayscale transition duration-300 group-hover:opacity-100 group-hover:brightness-100 group-hover:grayscale-0 md:h-10"
                  />
                </animated.a>
              )
            })}
          </div>
        </div>
      </section>

      <section
        id="mission"
        className={`${GUTTER} py-20 md:py-28`}
      >
        <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-16">
          <AnimatedImage
            style={missionImageSpring}
            src="/assets/device_mockup.jpg"
            width={1277}
            height={782}
            sizes="(min-width: 1024px) 50vw, 100vw"
            alt={t('index.device_mockup_alt')}
            className="border-border/60 h-auto w-full rounded-xl border shadow-sm"
          />
          <animated.div style={missionSpring}>
            <h2 className="text-2xl font-bold tracking-tight md:text-4xl">
              {t('index.furthering_accessibility')}
            </h2>
            <p className="text-muted-foreground mt-5 max-w-[58ch] text-base md:text-lg">
              {t('index.collaborate_on_projects')}
            </p>
            <p className="text-muted-foreground mt-4 max-w-[58ch] text-base md:text-lg">
              {t('index.bridge_the_gap')}
            </p>
          </animated.div>
        </div>
      </section>

      <section id="testimonials">
        <div className={`${GUTTER} pb-20 md:pb-28`}>
          <animated.h2
            style={testimonialsTitleSpring}
            className="max-w-[48ch] text-xl font-semibold md:text-2xl"
          >
            {t('index.sciteens_pride')}
          </animated.h2>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {testimonialsTrail.map((styles, index) => {
              const {
                body,
                name,
                country,
                icon: Icon,
              } = TESTIMONIALS[index]

              return (
                <animated.div
                  key={name}
                  style={styles}
                  className="h-full"
                >
                  <Card className="h-full">
                    <CardContent className="flex h-full flex-col p-5">
                      <Icon className="text-sciteensGreen-regular size-6" />
                      <p className="mt-4 flex-1 text-sm leading-relaxed md:text-base">
                        {body}
                      </p>
                      <p className="mt-6 text-sm">
                        <span className="font-semibold">
                          {name}
                        </span>
                        <span className="text-muted-foreground">
                          , {country}
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                </animated.div>
              )
            })}
          </div>
        </div>

        <div className="bg-sciteensGreen-dark text-white">
          <animated.div
            style={statsSpring}
            className={`${GUTTER} grid grid-cols-3 gap-6 py-12 md:py-16`}
          >
            {STATS.map((stat) => (
              <div key={stat.label}>
                <p className="text-3xl font-extrabold tabular-nums md:text-5xl">
                  <animated.span>
                    {countUp.to(
                      (progress) =>
                        Math.round(progress * stat.value) +
                        stat.suffix
                    )}
                  </animated.span>
                </p>
                <p className="mt-2 text-xs text-white/80 md:text-base">
                  {t(stat.label)}
                </p>
              </div>
            ))}
          </animated.div>
        </div>
      </section>

      <section
        id="media"
        className={`${GUTTER} py-20 md:py-28`}
      >
        <animated.h2
          style={mediaTitleSpring}
          className="text-2xl font-bold tracking-tight md:text-4xl"
        >
          {t('index.featured_media')}
        </animated.h2>
        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {mediaTrail.map((styles, index) => {
            const item = MEDIA[index]

            return (
              <animated.a
                key={item.href}
                style={styles}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="group"
              >
                <Card className="h-full overflow-hidden">
                  <div className="relative aspect-[16/10] w-full overflow-hidden">
                    <Image
                      src={item.src}
                      alt=""
                      fill
                      sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
                      className="object-cover transition duration-500 group-hover:scale-105"
                    />
                  </div>
                  <CardContent className="p-5">
                    <p className="font-semibold md:text-lg">
                      {t(item.title)}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {formatDate(item.date)}
                    </p>
                  </CardContent>
                </Card>
              </animated.a>
            )
          })}
        </div>
      </section>

      <section className={`${GUTTER} py-20 md:py-28`}>
        <div className="bg-sciteensGreen-dark rounded-xl px-6 py-14 text-white md:px-12 md:py-20">
          <h2 className="text-3xl font-extrabold tracking-tight md:text-5xl">
            {t('get_involved.want_to_get_involved')}
          </h2>
          <p className="mt-5 max-w-[58ch] text-base text-white/80 md:text-lg">
            {t('index.spark_of_inspiration')}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button
              size="lg"
              className="text-sciteensGreen-dark hover:bg-white/85 h-11 bg-white px-6 text-base"
              render={<Link href="/signup/student" />}
            >
              {t('index.get_started')}
              <ArrowRight className="group-hover/button:translate-x-0.5 transition-transform" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-11 border-white/40 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white"
              render={<Link href="/donate" />}
            >
              {t('navigation.donate')}
            </Button>
          </div>
        </div>
      </section>
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
