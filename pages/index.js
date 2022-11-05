import Head from 'next/head'
import { useState, useEffect } from 'react'
import render from '../components/LoadDesk.js'
import Link from 'next/link'
import {
  useSpring,
  useTrail,
  animated,
  config,
} from '@react-spring/web'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function Home() {
  const [rendered, setRendered] = useState(false)
  const [animateLanding, setAnimateLanding] =
    useState(false)
  const [animatePartners, setAnimatePartners] =
    useState(false)
  const [animateMission, setAnimateMission] =
    useState(false)
  const [animateTestimonials, setAnimateTestimonials] =
    useState(false)
  const [animateMedia, setAnimateMedia] = useState(false)

  function renderDesk(canvas) {
    if (!rendered) {
      render(canvas.offsetWidth, canvas.offsetWidth)
      setRendered(true)
    }
  }

  useEffect(() => {
    let canvas = document.getElementById('canvas')
    renderDesk(canvas)
    setAnimateLanding(true)

    // Intersection Observer Stuff
    const partners = document.getElementById('partners')
    const mission = document.getElementById('mission')
    const testimonials =
      document.getElementById('testimonials')
    const media = document.getElementById('media')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            switch (entry.target.id) {
              case 'partners':
                setAnimatePartners(true)
                observer.unobserve(partners)
                break

              case 'mission':
                setAnimateMission(true)
                observer.unobserve(mission)
                break

              case 'testimonials':
                setAnimateTestimonials(true)
                observer.unobserve(testimonials)
                break

              case 'media':
                setAnimateMedia(true)
                observer.unobserve(media)
                break

              default:
                break
            }
          }
        })
      },
      {
        threshold: 1,
      }
    )

    // Add all elements to observer
    observer.observe(partners)
    observer.observe(mission)
    observer.observe(testimonials)
    observer.observe(media)
  }, [])

  const { t } = useTranslation('common')

  // REACT SPRING ANIMATIONS
  const landing_spring = useSpring({
    opacity: animateLanding ? 1 : 0,
    transform: animateLanding
      ? 'translateY(0)'
      : 'translateY(80px)',
    delay: 200,
    config: config.slow,
  })

  const partners_arr = [
    {
      src: '../assets/logos/Google_fullsize.png',
      alt: 'Google',
      link: 'https://www.google.com/nonprofits/',
    },
    {
      src: '../assets/logos/MIT.png',
      alt: 'MIT',
      link: 'https://innovation.mit.edu/opportunity/mit-ideas-global-challenge/',
    },
    {
      src: '../assets/logos/FSU.png',
      alt: 'FSU',
      link: 'https://www.bio.fsu.edu/ysp/',
    },
    {
      src: '../assets/logos/Yale.png',
      alt: 'Yale',
      link: 'https://city.yale.edu/',
    },
  ]
  const partnersTrail = useTrail(partners_arr.length, {
    opacity: animatePartners ? 1 : 0,
    transform: animatePartners
      ? 'translateY(0px) rotate(0)'
      : 'translateY(-70px) rotate(-7deg)',
    from: {
      opacity: 0,
      transform: 'translateY(-70px) rotate(-7deg)',
    },
  })

  const missionTrail = useTrail(2, {
    opacity: animateMission ? 1 : 0,
    transform: animateMission
      ? 'translateY(0px) rotate(0)'
      : 'translateY(50px) rotate(3deg)',
    from: {
      opacity: 0,
      transform: 'translateY(50px) rotate(3deg)',
    },
  })
  const missionSpring = useSpring({
    opacity: animateMission ? 1 : 0,
    transform: animateMission
      ? 'translateX(0)'
      : 'translateX(-120px)',
    delay: 400,
    config: config.molasses,
  })

  const testimonialsTitleSpring = useSpring({
    opacity: animateTestimonials ? 1 : 0,
    transform: animateTestimonials
      ? 'translateY(0px) rotate(0)'
      : 'translateY(-50px) rotate(-3deg)',
    from: {
      opacity: 0,
      transform: 'translateY(-50px) rotate(-3deg)',
    },
  })
  let testimonials_arr = [
    {
      body: 'Working with students across the world with SciTeens was amazing... I am super grateful that I was able to experience it.',
      name: 'David L.',
      country: 'United States',
      image: './assets/zondicons/globe.svg',
    },
    {
      body: 'I want to first thank the members and founders of SciTeens for bringing such a wonderful and amazing opportunity we are having.I would love to thank all the mentors who were taking most of their time mentoring us as well helping us coming up with best projects.',
      name: 'Elisha M.',
      country: 'Zimbabwe',
      image: './assets/zondicons/education.svg',
    },
    {
      body: 'Because of the coding boot camp I did with SciTeens, I was able to find my passion for coding and further expand my knowledge in the STEM field.',
      name: 'Melissa R.',
      country: 'United States',
      image: './assets/zondicons/code.svg',
    },
  ]
  const testimonialsTrail = useTrail(
    testimonials_arr.length,
    {
      opacity: animateTestimonials ? 1 : 0,
      transform: animateTestimonials
        ? 'scale(1)'
        : 'scale(0)',
      from: {
        opacity: 0,
        transform: 'scale(0)',
      },
      delay: 400,
      config: config.gentle,
    }
  )
  const testimonialsStatsSpring = useSpring({
    opacity: animateTestimonials ? 1 : 0,
    transform: animateTestimonials
      ? 'translateY(0px)'
      : 'translateY(50px)',
    from: {
      opacity: 0,
      transform: 'translateY(50px)',
    },
    delay: 900,
    config: config.molasses,
  })

  const mediaTitleSpring = useSpring({
    opacity: animateMedia ? 1 : 0,
    transform: animateMedia
      ? 'translateY(0px) rotate(0)'
      : 'translateY(50px) rotate(3deg)',
    from: {
      opacity: 0,
      transform: 'translateY(50px) rotate(3deg)',
    },
  })
  const mediaSpring1 = useSpring({
    opacity: animateMedia ? 1 : 0,
    transform: animateMedia
      ? 'translateX(0px)'
      : 'translateX(-100px)',
    from: {
      opacity: 0,
      transform: 'translateX(-100px)',
    },
    delay: 300,
  })
  const mediaSpring2 = useSpring({
    opacity: animateMedia ? 1 : 0,
    transform: animateMedia
      ? 'translateX(0px)'
      : 'translateX(100px)',
    from: {
      opacity: 0,
      transform: 'translateX(100px)',
    },
    delay: 500,
  })
  const mediaSpring3 = useSpring({
    opacity: animateMedia ? 1 : 0,
    transform: animateMedia
      ? 'translateX(0px)'
      : 'translateX(100px)',
    from: {
      opacity: 0,
      transform: 'translateX(100px)',
    },
    delay: 700,
  })

  return (
    <div>
      <Head>
        <title>Welcome to SciTeens! | SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
        <meta
          name="description"
          content="SciTeens Home Page"
        />
        <meta
          name="keywords"
          content="SciTeens, sciteens, home, teen science"
        />
        <meta property="og:type" content="website" />
        <meta
          name="og:image"
          content="/assets/sciteens_initials.jpg"
        />
      </Head>

      <div className="mt-0 overflow-x-hidden lg:-mt-20">
        {/* Landing screen */}
        <div className="relative h-screen text-center lg:text-left">
          <animated.div
            style={landing_spring}
            className="relative z-20 mx-5 mb-12 flex h-full w-auto flex-col pt-24 md:mx-16 lg:ml-24 lg:max-w-xl lg:justify-center xl:max-w-2xl"
          >
            <h1 className="whitespace-nowrap text-3xl font-extrabold md:text-5xl lg:text-6xl">
              🧪
              {t('index.science_simplified')}
            </h1>
            <p className="mt-4 mb-8 text-sm md:text-2xl">
              {t('index.share_work')}
            </p>
            <div>
              <Link href="/signup">
                <a className="mr-2 rounded-lg bg-sciteensLightGreen-regular p-3 text-base text-white shadow-md hover:bg-sciteensLightGreen-dark md:p-4 md:text-xl">
                  {t('index.get_started')}
                </a>
              </Link>
              <Link href="/about">
                <a className="ml-2 p-4 text-base text-gray-700 hover:underline active:bg-green-700 md:text-xl">
                  About
                </a>
              </Link>
            </div>
          </animated.div>
          <div
            id="canvas-container"
            className="absolute right-10 left-10 top-28 grid h-full grid-cols-1 grid-rows-1 items-center md:right-24 md:left-24 lg:right-16 lg:left-auto lg:top-0 lg:w-[40%]"
          >
            <div
              id="loading-screen"
              className="absolute z-10 bg-backgroundGreen transition-all duration-300"
            >
              <img
                src={'./assets/desktop-preview.png'}
                alt=""
                className="scale-75"
              />
            </div>
            <div
              id="canvas"
              className="scale-75 transition-all duration-[1300ms]"
            />
          </div>
        </div>

        {/* Partners */}
        <div
          id="partners"
          className="mx-auto mb-24 grid w-[95%] grid-cols-2 grid-rows-2 md:w-[70%] md:grid-cols-4 md:grid-rows-1"
        >
          {partnersTrail.map((styles, index) => {
            return (
              <animated.a
                key={index}
                style={styles}
                href={partners_arr[index].link}
                className="group py-5 md:py-8"
              >
                <animated.img
                  src={partners_arr[index].src}
                  alt={partners_arr[index].alt}
                  className="m-auto h-8 opacity-50 brightness-0 grayscale transition-all duration-300 group-hover:opacity-100 group-hover:brightness-100 group-hover:grayscale-0 md:h-9 lg:h-14"
                />
              </animated.a>
            )
          })}
        </div>

        {/* Mission Statement & Information */}
        <div className="relative mb-28 md:mb-36">
          <div className="mx-5 flex flex-col-reverse md:mx-16 lg:mx-24 lg:flex-row">
            <div className="relative mx-auto mt-6 w-11/12 transition-all lg:mt-0 lg:w-3/5">
              <animated.img
                style={missionSpring}
                id="mission_img"
                src="assets/device_mockup.png"
                alt="Computer and phone showing sciteens website"
              />
            </div>
            <div className="my-auto mx-auto w-5/6 lg:w-2/5">
              {missionTrail.map((styles, index) => {
                return index == 0 ? (
                  <animated.h2
                    key={index}
                    style={styles}
                    className="mb-4 ml-0 text-xl font-semibold md:text-3xl lg:ml-12 lg:text-4xl"
                  >
                    {t('index.furthering_accessibility')}
                  </animated.h2>
                ) : (
                  <animated.p
                    key={index}
                    style={styles}
                    className="my-auto ml-0 text-base md:text-lg lg:ml-12 lg:text-xl"
                  >
                    {t('index.collaborate_on_projects')}
                  </animated.p>
                )
              })}
            </div>
          </div>
          <div
            id="mission"
            className="absolute left-0 top-[40%] h-20"
          />
        </div>

        {/* Open Source & Testimonials */}
        <div className="relative mb-28 md:mb-36">
          <animated.h2
            style={testimonialsTitleSpring}
            className="mx-12 mb-12 text-center text-xl font-semibold md:mx-28 md:text-3xl lg:mx-48 lg:text-5xl"
          >
            {t('index.sciteens_pride')}
          </animated.h2>
          <div className="relative z-10 mx-5 flex flex-col items-center justify-between md:mx-16 md:flex-row md:items-stretch lg:mx-24">
            {testimonialsTrail.map((styles, index) => {
              return (
                <animated.div
                  key={index}
                  style={styles}
                  className="w-auto rounded-lg bg-white p-5 shadow first-of-type:mb-5 last-of-type:hidden md:w-[45%] md:first-of-type:mb-0 lg:w-[30%] lg:first-of-type:mb-8 lg:last-of-type:mb-8 lg:last-of-type:block"
                >
                  <animated.img
                    src={testimonials_arr[index].image}
                    className="mb-6 h-10"
                    alt=""
                  />
                  <animated.p className="mb-4 text-sm lg:text-base">
                    {testimonials_arr[index].body}
                  </animated.p>
                  <animated.p className="text-lg lg:text-xl">
                    -{' '}
                    <span className="font-semibold">
                      {testimonials_arr[index].name}
                    </span>
                    , {testimonials_arr[index].country}
                  </animated.p>
                </animated.div>
              )
            })}
          </div>
          <svg
            viewBox="0 0 900 40"
            width="100%"
            height="100%"
            xmlns="http://www.w3.org/2000/svg"
            version="1.1"
            className="-mt-32 lg:-mt-36"
          >
            <rect
              x="0"
              y="0"
              width="100%"
              height="100%"
              fill="#F5FFF5"
            />
            <path
              d="M0 7L10.7 8C21.3 9 42.7 11 64.2 11.7C85.7 12.3 107.3 11.7 128.8 11.3C150.3 11 171.7 11 193 12.3C214.3 13.7 235.7 16.3 257 16.2C278.3 16 299.7 13 321.2 10.8C342.7 8.7 364.3 7.3 385.8 8C407.3 8.7 428.7 11.3 450 11.8C471.3 12.3 492.7 10.7 514.2 11.5C535.7 12.3 557.3 15.7 578.8 15.3C600.3 15 621.7 11 643 8.8C664.3 6.7 685.7 6.3 707 7.8C728.3 9.3 749.7 12.7 771.2 14.3C792.7 16 814.3 16 835.8 14.7C857.3 13.3 878.7 10.7 889.3 9.3L900 8L900 41L889.3 41C878.7 41 857.3 41 835.8 41C814.3 41 792.7 41 771.2 41C749.7 41 728.3 41 707 41C685.7 41 664.3 41 643 41C621.7 41 600.3 41 578.8 41C557.3 41 535.7 41 514.2 41C492.7 41 471.3 41 450 41C428.7 41 407.3 41 385.8 41C364.3 41 342.7 41 321.2 41C299.7 41 278.3 41 257 41C235.7 41 214.3 41 193 41C171.7 41 150.3 41 128.8 41C107.3 41 85.7 41 64.2 41C42.7 41 21.3 41 10.7 41L0 41Z"
              fill="#58b386"
            />
            <path
              d="M0 18L10.7 17.8C21.3 17.7 42.7 17.3 64.2 17.3C85.7 17.3 107.3 17.7 128.8 18.7C150.3 19.7 171.7 21.3 193 22.5C214.3 23.7 235.7 24.3 257 24C278.3 23.7 299.7 22.3 321.2 21C342.7 19.7 364.3 18.3 385.8 19.2C407.3 20 428.7 23 450 24.5C471.3 26 492.7 26 514.2 24.3C535.7 22.7 557.3 19.3 578.8 19.5C600.3 19.7 621.7 23.3 643 24.3C664.3 25.3 685.7 23.7 707 22.2C728.3 20.7 749.7 19.3 771.2 18.5C792.7 17.7 814.3 17.3 835.8 17.2C857.3 17 878.7 17 889.3 17L900 17L900 41L889.3 41C878.7 41 857.3 41 835.8 41C814.3 41 792.7 41 771.2 41C749.7 41 728.3 41 707 41C685.7 41 664.3 41 643 41C621.7 41 600.3 41 578.8 41C557.3 41 535.7 41 514.2 41C492.7 41 471.3 41 450 41C428.7 41 407.3 41 385.8 41C364.3 41 342.7 41 321.2 41C299.7 41 278.3 41 257 41C235.7 41 214.3 41 193 41C171.7 41 150.3 41 128.8 41C107.3 41 85.7 41 64.2 41C42.7 41 21.3 41 10.7 41L0 41Z"
              fill="#439e70"
            />
            <path
              d="M0 32L10.7 31C21.3 30 42.7 28 64.2 28C85.7 28 107.3 30 128.8 29.8C150.3 29.7 171.7 27.3 193 26.7C214.3 26 235.7 27 257 27.3C278.3 27.7 299.7 27.3 321.2 28.3C342.7 29.3 364.3 31.7 385.8 32.2C407.3 32.7 428.7 31.3 450 30C471.3 28.7 492.7 27.3 514.2 27.7C535.7 28 557.3 30 578.8 31.3C600.3 32.7 621.7 33.3 643 33.2C664.3 33 685.7 32 707 31.2C728.3 30.3 749.7 29.7 771.2 29.3C792.7 29 814.3 29 835.8 28.8C857.3 28.7 878.7 28.3 889.3 28.2L900 28L900 41L889.3 41C878.7 41 857.3 41 835.8 41C814.3 41 792.7 41 771.2 41C749.7 41 728.3 41 707 41C685.7 41 664.3 41 643 41C621.7 41 600.3 41 578.8 41C557.3 41 535.7 41 514.2 41C492.7 41 471.3 41 450 41C428.7 41 407.3 41 385.8 41C364.3 41 342.7 41 321.2 41C299.7 41 278.3 41 257 41C235.7 41 214.3 41 193 41C171.7 41 150.3 41 128.8 41C107.3 41 85.7 41 64.2 41C42.7 41 21.3 41 10.7 41L0 41Z"
              fill="#2d8a5b"
            />
          </svg>
          <div className="bg-sciteensGreen-regular px-0 pt-32 pb-10 text-center text-white md:px-24">
            <animated.div
              style={testimonialsStatsSpring}
              className="flex flex-row justify-evenly md:justify-between "
            >
              <div className="mr-10 w-[30%] md:w-[45%] lg:w-[30%]">
                <p className="text-3xl font-semibold md:text-4xl lg:text-5xl">
                  400+
                </p>
                <p className="text-sm text-gray-300 md:text-base">
                  {t('index.monthly_users')}
                </p>
              </div>
              <div className="w-[30%] md:w-[45%] lg:w-[30%]">
                <p className="text-3xl font-semibold md:text-4xl lg:text-5xl">
                  50
                </p>
                <p className="text-sm text-gray-300 md:text-base">
                  {t('index.schools')}
                </p>
              </div>
              <div className="hidden w-[45%] flex-col lg:flex lg:w-[30%]">
                <p className="text-4xl font-semibold lg:text-5xl">
                  7
                </p>
                <p className="text-base text-gray-300">
                  {t('index.countries')}
                </p>
              </div>
            </animated.div>
          </div>
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
              d="M0 31L10.7 29.8C21.3 28.7 42.7 26.3 64.2 26.2C85.7 26 107.3 28 128.8 28.2C150.3 28.3 171.7 26.7 193 25C214.3 23.3 235.7 21.7 257 21.7C278.3 21.7 299.7 23.3 321.2 24.5C342.7 25.7 364.3 26.3 385.8 25.2C407.3 24 428.7 21 450 21.2C471.3 21.3 492.7 24.7 514.2 25.3C535.7 26 557.3 24 578.8 23.7C600.3 23.3 621.7 24.7 643 25.3C664.3 26 685.7 26 707 25.2C728.3 24.3 749.7 22.7 771.2 22.3C792.7 22 814.3 23 835.8 23.8C857.3 24.7 878.7 25.3 889.3 25.7L900 26L900 0L889.3 0C878.7 0 857.3 0 835.8 0C814.3 0 792.7 0 771.2 0C749.7 0 728.3 0 707 0C685.7 0 664.3 0 643 0C621.7 0 600.3 0 578.8 0C557.3 0 535.7 0 514.2 0C492.7 0 471.3 0 450 0C428.7 0 407.3 0 385.8 0C364.3 0 342.7 0 321.2 0C299.7 0 278.3 0 257 0C235.7 0 214.3 0 193 0C171.7 0 150.3 0 128.8 0C107.3 0 85.7 0 64.2 0C42.7 0 21.3 0 10.7 0L0 0Z"
              fill="#58b386"
            />
            <path
              d="M0 12L10.7 13.7C21.3 15.3 42.7 18.7 64.2 19.3C85.7 20 107.3 18 128.8 18C150.3 18 171.7 20 193 20C214.3 20 235.7 18 257 16.8C278.3 15.7 299.7 15.3 321.2 14.7C342.7 14 364.3 13 385.8 13.5C407.3 14 428.7 16 450 16.5C471.3 17 492.7 16 514.2 15.8C535.7 15.7 557.3 16.3 578.8 16.8C600.3 17.3 621.7 17.7 643 18.3C664.3 19 685.7 20 707 19.2C728.3 18.3 749.7 15.7 771.2 14.3C792.7 13 814.3 13 835.8 14C857.3 15 878.7 17 889.3 18L900 19L900 0L889.3 0C878.7 0 857.3 0 835.8 0C814.3 0 792.7 0 771.2 0C749.7 0 728.3 0 707 0C685.7 0 664.3 0 643 0C621.7 0 600.3 0 578.8 0C557.3 0 535.7 0 514.2 0C492.7 0 471.3 0 450 0C428.7 0 407.3 0 385.8 0C364.3 0 342.7 0 321.2 0C299.7 0 278.3 0 257 0C235.7 0 214.3 0 193 0C171.7 0 150.3 0 128.8 0C107.3 0 85.7 0 64.2 0C42.7 0 21.3 0 10.7 0L0 0Z"
              fill="#439e70"
            />
            <path
              d="M0 5L10.7 5.3C21.3 5.7 42.7 6.3 64.2 7.3C85.7 8.3 107.3 9.7 128.8 9.7C150.3 9.7 171.7 8.3 193 7.8C214.3 7.3 235.7 7.7 257 8C278.3 8.3 299.7 8.7 321.2 9.3C342.7 10 364.3 11 385.8 11.7C407.3 12.3 428.7 12.7 450 12.3C471.3 12 492.7 11 514.2 11C535.7 11 557.3 12 578.8 12.7C600.3 13.3 621.7 13.7 643 12.3C664.3 11 685.7 8 707 6.5C728.3 5 749.7 5 771.2 6.3C792.7 7.7 814.3 10.3 835.8 11C857.3 11.7 878.7 10.3 889.3 9.7L900 9L900 0L889.3 0C878.7 0 857.3 0 835.8 0C814.3 0 792.7 0 771.2 0C749.7 0 728.3 0 707 0C685.7 0 664.3 0 643 0C621.7 0 600.3 0 578.8 0C557.3 0 535.7 0 514.2 0C492.7 0 471.3 0 450 0C428.7 0 407.3 0 385.8 0C364.3 0 342.7 0 321.2 0C299.7 0 278.3 0 257 0C235.7 0 214.3 0 193 0C171.7 0 150.3 0 128.8 0C107.3 0 85.7 0 64.2 0C42.7 0 21.3 0 10.7 0L0 0Z"
              fill="#2d8a5b"
            />
          </svg>
          <div
            id="testimonials"
            className="absolute left-0 top-[38%] h-20"
          />
        </div>

        {/* Featured Media */}
        <div className="relative mb-28 md:mb-36">
          <animated.h2
            style={mediaTitleSpring}
            className="mb-12 text-center text-xl font-semibold md:text-3xl lg:text-5xl"
          >
            {t('index.featured_media')}
          </animated.h2>
          <div className="mx-5 grid grid-cols-1 grid-rows-3 md:mx-16 lg:mx-24 lg:grid-cols-2 lg:grid-rows-2">
            <animated.a
              style={mediaSpring1}
              href="https://www.neonscience.org/impact/observatory-blog/sciteens-data-science-and-ecology-gen-z"
              className="group col-span-1 row-span-1 mr-0 mb-4 overflow-hidden rounded-lg bg-white shadow lg:row-span-2 lg:mr-4 lg:mb-0"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="flex h-full flex-col md:flex-row lg:flex-col">
                <div className="relative h-full w-full overflow-hidden md:w-1/2 lg:w-auto">
                  <img
                    src={'./assets/featured_media/neon.png'}
                    alt="NSF Neon Logo"
                    className="absolute top-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="z-10 w-full bg-white p-4 md:w-1/2 md:p-10 lg:w-auto">
                  <p className="mb-1 text-base font-semibold md:text-2xl">
                    {t('index.data_science_and_ecology')}
                  </p>
                  <p className="text-sm text-gray-700 md:text-lg">
                    February 10, 2021
                  </p>
                </div>
              </div>
            </animated.a>
            <animated.a
              style={mediaSpring2}
              href="https://news.mit.edu/2019/ideas-challenge-social-ventures-0430"
              className="group  col-span-1 row-span-1 ml-0 mb-4 mt-4 overflow-hidden rounded-lg bg-white shadow lg:ml-4 lg:mt-0"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="flex h-full flex-col md:flex-row">
                <div className="relative h-full w-full md:w-1/2">
                  <img
                    src={
                      './assets/featured_media/ideas.jpg'
                    }
                    alt=""
                    className="absolute top-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="z-10 w-full bg-white p-4 md:w-1/2 md:p-10">
                  <p className="mb-1 text-base font-semibold md:text-2xl">
                    {t('index.ideas_challenge')}
                  </p>
                  <p className="text-sm text-gray-700 md:text-lg">
                    April 30, 2019
                  </p>
                </div>
              </div>
            </animated.a>
            <animated.a
              style={mediaSpring3}
              href="https://news.fsu.edu/multimedia/radio/2020/08/03/young-scholars-online-program-turns-students-into-scientists/"
              className="group col-span-1 row-span-1 ml-0 mt-4 h-72 overflow-hidden rounded-lg bg-white shadow md:h-auto lg:ml-4"
              target="_blank"
              rel="noopener noreferrer"
            >
              <div className="flex h-full flex-col md:flex-row lg:flex-row-reverse">
                <div className="relative h-full w-full md:w-1/2">
                  <img
                    src={'./assets/featured_media/ysp.jpg'}
                    alt=""
                    className="absolute top-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                </div>
                <div className="z-10 w-full bg-white p-4 md:w-1/2 md:p-10">
                  <p className="mb-1 text-base font-semibold md:text-2xl">
                    {t('index.young_scholars_program')}
                  </p>
                  <p className="pb-5 text-sm text-gray-700 md:text-lg">
                    August 3, 2020
                  </p>
                </div>
              </div>
            </animated.a>
          </div>
          <div
            id="media"
            className="absolute left-0 top-[40%] h-20"
          />
        </div>
      </div>
    </div>
  )
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      // Will be passed to the page component as props
    },
  }
}
