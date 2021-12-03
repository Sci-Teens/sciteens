import Head from 'next/head'
import { useState, useEffect } from 'react'
import render from '../components/LoadDesk.js'
import Link from 'next/link'
import { useSpring, animated, config } from '@react-spring/web'

export default function Home() {

  const [rendered, setRendered] = useState(false)
  const [animate, setAnimate] = useState(false)

  function renderDesk(canvas) {
    if (!rendered) {
      render(canvas.offsetWidth, canvas.offsetWidth)
      setRendered(true)
    }
  }

  useEffect(() => {
    let canvas = document.getElementById("canvas")
    renderDesk(canvas)
    setAnimate(true)
  }, [])

  // REACT SPRING ANIMATIONS
  const landing_spring = useSpring({ opacity: animate ? 1 : 0, transform: animate ? 'translateY(0)' : 'translateY(80px)', delay: 200, config: config.slow })


  return (
    <div>
      <Head>
        <title>Welcome to SciTeens! | SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
        <meta name="description" content="SciTeens Home Page" />
        <meta name="keywords" content="SciTeens, sciteens, home, teen science" />
      </Head>

      <div className="mt-0 lg:-mt-20">
        {/* Landing screen */}
        <div className="relative h-screen text-center xl:text-left">
          <animated.div style={landing_spring} className="relative z-20 h-full w-auto lg:max-w-2xl flex flex-col lg:justify-center mx-5 md:mx-16 lg:ml-24 mb-12 pt-24">
            <h1 className="text-4xl md:text-5xl lg:text-6xl whitespace-nowrap">🧪 Science, simplified.</h1>
            <p className="text-sm md:text-2xl mt-4 mb-8">Share your work, get feedback from mentors and peers, and find great scientific
              opportunities and resources available and accessible to you. Oh yeah, and it's free.
              Only here on SciTeens.
            </p>
            <div>
              <Link href="/signup">
                <a className="bg-sciteensLightGreen-regular text-white text-base md:text-xl rounded-lg shadow-md p-3 md:p-4 mr-2 hover:bg-sciteensLightGreen-dark">
                  Get Started
                </a>
              </Link>
              <Link href="/about">
                <a className="text-gray-700 text-base md:text-xl p-4 ml-2 hover:underline active:bg-green-700">About</a>
              </Link>
            </div>
          </animated.div>
          <div id="canvas-container" className="absolute grid grid-rows-1 grid-cols-1 items-center right-10 left-10 md:right-24 md:left-24 lg:right-16 lg:left-auto top-28 lg:top-0 h-full lg:w-[40%]">
            <div id="loading-screen" className="absolute z-10 transition-all duration-300 bg-backgroundGreen">
              <img src={'./assets/desktop-preview.png'} alt="" className="scale-75" />
            </div>
            <div id="canvas" className="transition-all duration-[1300ms] scale-75" />
          </div>
        </div>


        {/* Mission Statement & Information */}
        <div className="mb-32 md:mb-48">
          <h2 className="text-center text-xl md:text-3xl lg:text-5xl font-semibold mb-12 mx-12 md:mx-32 lg:mx-56">
            Furthering the accessibility of science, one
            student at a time.
          </h2>
          <div className="flex flex-col lg:flex-row mx-5 md:mx-16 lg:mx-24">
            <div className="flex flex-col">
              <div className="flex flex-row bg-white shadow p-5 rounded-lg mb-8 mr-0 lg:mr-4">
                <p className="flex flex-shrink-0 justify-center items-center text-sciteensLightGreen-regular text-base md:text-lg lg:text-xl font-bold 
        bg-sciteensLightGreen-regular bg-opacity-25 rounded-full border-[3px]border-sciteensLightGreen-regular
        border-opacity-40 h-9 lg:h-12 w-9 lg:w-12 mr-4 whitespace-nowrap">1</p>
                <p className="text-xs md:text-base lg:text-lg">
                  We strive to bridge the gap between education and opportunity, particularly for
                  students from low-resource areas who do not have an extensive STEM support network.</p>
              </div>
              <div className="flex flex-row bg-white shadow p-5 rounded-lg mb-8 mr-0 lg:mr-4">
                <p className="flex flex-shrink-0 justify-center items-center text-sciteensLightGreen-regular text-base md:text-lg lg:text-xl font-bold 
        bg-sciteensLightGreen-regular bg-opacity-25 rounded-full border-[3px]border-sciteensLightGreen-regular
        border-opacity-40 h-9 lg:h-12 w-9 lg:w-12 mr-4 whitespace-nowrap">2</p>
                <p className="text-xs md:text-base lg:text-lg">
                  SciTeens was started by a group of teens just like you trying to get started in the
                  STEM fields. Because of this, we know how intimidating it can be to begin your own research projects. We
                  want to put an end to this intimidation and make STEM research accesible and rewarding for everyone.
                </p>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-row bg-white shadow p-5 rounded-lg  mb-8 ml-0 lg:ml-4">
                <p className="flex flex-shrink-0 justify-center items-center text-sciteensLightGreen-regular text-base md:text-lg lg:text-xl font-bold 
        bg-sciteensLightGreen-regular bg-opacity-25 rounded-full border-[3px]border-sciteensLightGreen-regular
        border-opacity-40 h-9 lg:h-12 w-9 lg:w-12 mr-4 whitespace-nowrap">3</p>
                <p className="text-xs md:text-base lg:text-lg">
                  With SciTeens you can share your knowledge and research by writing articles or
                  creating projects. Your work can be viewed by other SciTeens users, giving you access to unique opportunities
                  through collaboration with your peers and mentorship by accomplished scholars in the STEM fields.
                </p>
              </div>
              <div className="flex flex-row bg-white shadow p-5 rounded-lg mb-8 ml-0 lg:ml-4">
                <p className="flex flex-shrink-0 justify-center items-center text-sciteensLightGreen-regular text-base md:text-lg lg:text-xl font-bold 
        bg-sciteensLightGreen-regular bg-opacity-25 rounded-full border-[3px]border-sciteensLightGreen-regular
        border-opacity-40 h-9 lg:h-12 w-9 lg:w-12 mr-4 whitespace-nowrap">4</p>
                <p className="text-xs md:text-base lg:text-lg">
                  All it takes is a spark of inspiration, the willingness to work with your peers, and
                  an account to get started doing scientific research and making a difference in your area of study.
                </p>
              </div>
            </div>
          </div>
        </div>


        {/* Open Source & Testimonials */}
        <div className="mb-32 md:mb-48">
          <h2 className="text-center text-xl md:text-3xl lg:text-5xl font-semibold mb-12 mx-12 md:mx-28 lg:mx-48">
            SciTeens takes pride in its open source and
            collaborative platform, but let our users do the talking for us.
          </h2>
          <div className="relative flex flex-col md:flex-row items-center md:items-stretch justify-between mx-5 md:mx-16 lg:mx-24 z-10">
            <div className="bg-white shadow p-5 rounded-lg w-auto md:w-[45%] lg:w-[30%] mb-8 md:mb-0">
              <img src={'./assets/zondicons/education.svg'} className="h-10 mb-6" alt="" />
              <p className="text-sm lg:text-base mb-4">
                "I want to first thank the members and founders of SciTeens for bringing such a wonderful and amazing opportunity
                we are having.I would love to thank all the mentors who were taking most of their time mentoring us as well
                helping us coming up with best projects."
              </p>
              <p className="text-lg lg:text-xl">- <span className="font-semibold">Elisha M.</span>, Zimbabwe</p>
            </div>
            <div className="bg-white shadow p-5 rounded-lg w-auto md:w-[45%] lg:w-[30%]">
              <img src={'./assets/zondicons/globe.svg'} className="h-10 mb-6" alt="" />
              <p className="text-sm lg:text-base mb-4">
                "Working with students across the world with SciTeens was amazing... I am super grateful that I was
                able to experience it."
              </p>
              <p className="text-lg lg:text-xl">- <span className="font-semibold">David L.</span>, United States</p>
            </div>
            <div className="hidden lg:flex flex-col bg-white shadow p-5 rounded-lg w-[30%]">
              <img src={'./assets/zondicons/education.svg'} className="h-10 mb-6" alt="" />
              <p className="text-sm lg:text-base mb-4">
                "Because of the coding boot camp I did with SciTeens, I was able to find my passion for coding and
                further expand my knowledge in the STEM field."
              </p>
              <p className="text-lg lg:text-xl">- <span className="font-semibold">Melissa R.</span>, United States</p>
            </div>
          </div>
          <svg viewBox="0 0 900 40" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" version="1.1" className="-mt-32">
            <rect x="0" y="0" width="100%" height="100%" fill="#F5FFF5" />
            <path d="M0 7L10.7 8C21.3 9 42.7 11 64.2 11.7C85.7 12.3 107.3 11.7 128.8 11.3C150.3 11 171.7 11 193 12.3C214.3 13.7 235.7 16.3 257 16.2C278.3 16 299.7 13 321.2 10.8C342.7 8.7 364.3 7.3 385.8 8C407.3 8.7 428.7 11.3 450 11.8C471.3 12.3 492.7 10.7 514.2 11.5C535.7 12.3 557.3 15.7 578.8 15.3C600.3 15 621.7 11 643 8.8C664.3 6.7 685.7 6.3 707 7.8C728.3 9.3 749.7 12.7 771.2 14.3C792.7 16 814.3 16 835.8 14.7C857.3 13.3 878.7 10.7 889.3 9.3L900 8L900 41L889.3 41C878.7 41 857.3 41 835.8 41C814.3 41 792.7 41 771.2 41C749.7 41 728.3 41 707 41C685.7 41 664.3 41 643 41C621.7 41 600.3 41 578.8 41C557.3 41 535.7 41 514.2 41C492.7 41 471.3 41 450 41C428.7 41 407.3 41 385.8 41C364.3 41 342.7 41 321.2 41C299.7 41 278.3 41 257 41C235.7 41 214.3 41 193 41C171.7 41 150.3 41 128.8 41C107.3 41 85.7 41 64.2 41C42.7 41 21.3 41 10.7 41L0 41Z" fill="#58b386" />
            <path d="M0 18L10.7 17.8C21.3 17.7 42.7 17.3 64.2 17.3C85.7 17.3 107.3 17.7 128.8 18.7C150.3 19.7 171.7 21.3 193 22.5C214.3 23.7 235.7 24.3 257 24C278.3 23.7 299.7 22.3 321.2 21C342.7 19.7 364.3 18.3 385.8 19.2C407.3 20 428.7 23 450 24.5C471.3 26 492.7 26 514.2 24.3C535.7 22.7 557.3 19.3 578.8 19.5C600.3 19.7 621.7 23.3 643 24.3C664.3 25.3 685.7 23.7 707 22.2C728.3 20.7 749.7 19.3 771.2 18.5C792.7 17.7 814.3 17.3 835.8 17.2C857.3 17 878.7 17 889.3 17L900 17L900 41L889.3 41C878.7 41 857.3 41 835.8 41C814.3 41 792.7 41 771.2 41C749.7 41 728.3 41 707 41C685.7 41 664.3 41 643 41C621.7 41 600.3 41 578.8 41C557.3 41 535.7 41 514.2 41C492.7 41 471.3 41 450 41C428.7 41 407.3 41 385.8 41C364.3 41 342.7 41 321.2 41C299.7 41 278.3 41 257 41C235.7 41 214.3 41 193 41C171.7 41 150.3 41 128.8 41C107.3 41 85.7 41 64.2 41C42.7 41 21.3 41 10.7 41L0 41Z" fill="#439e70" />
            <path d="M0 32L10.7 31C21.3 30 42.7 28 64.2 28C85.7 28 107.3 30 128.8 29.8C150.3 29.7 171.7 27.3 193 26.7C214.3 26 235.7 27 257 27.3C278.3 27.7 299.7 27.3 321.2 28.3C342.7 29.3 364.3 31.7 385.8 32.2C407.3 32.7 428.7 31.3 450 30C471.3 28.7 492.7 27.3 514.2 27.7C535.7 28 557.3 30 578.8 31.3C600.3 32.7 621.7 33.3 643 33.2C664.3 33 685.7 32 707 31.2C728.3 30.3 749.7 29.7 771.2 29.3C792.7 29 814.3 29 835.8 28.8C857.3 28.7 878.7 28.3 889.3 28.2L900 28L900 41L889.3 41C878.7 41 857.3 41 835.8 41C814.3 41 792.7 41 771.2 41C749.7 41 728.3 41 707 41C685.7 41 664.3 41 643 41C621.7 41 600.3 41 578.8 41C557.3 41 535.7 41 514.2 41C492.7 41 471.3 41 450 41C428.7 41 407.3 41 385.8 41C364.3 41 342.7 41 321.2 41C299.7 41 278.3 41 257 41C235.7 41 214.3 41 193 41C171.7 41 150.3 41 128.8 41C107.3 41 85.7 41 64.2 41C42.7 41 21.3 41 10.7 41L0 41Z" fill="#2d8a5b" />
          </svg>
          <div className="flex flex-row justify-evenly md:justify-between px-0 md:px-24 pt-32 pb-10 text-white text-center bg-sciteensGreen-regular">
            <div className="w-[30%] md:w-[45%] lg:w-[30%] mr-10">
              <p className="text-3xl md:text-4xl lg:text-5xl font-semibold">400+</p>
              <p className="text-sm md:text-base text-gray-300">Monthly Active Users</p>
            </div>
            <div className="w-[30%] md:w-[45%] lg:w-[30%]">
              <p className="text-3xl md:text-4xl lg:text-5xl font-semibold">50</p>
              <p className="text-sm md:text-base text-gray-300">Schools</p>
            </div>
            <div className="hidden lg:flex flex-col w-[45%] lg:w-[30%]">
              <p className="text-4xl lg:text-5xl font-semibold">7</p>
              <p className="text-base text-gray-300">Countries</p>
            </div>
          </div>
          <svg viewBox="0 0 900 40" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" version="1.1">
            <rect x="0" y="0" width="100%" height="100%" fill="#F5FFF5" />
            <path d="M0 31L10.7 29.8C21.3 28.7 42.7 26.3 64.2 26.2C85.7 26 107.3 28 128.8 28.2C150.3 28.3 171.7 26.7 193 25C214.3 23.3 235.7 21.7 257 21.7C278.3 21.7 299.7 23.3 321.2 24.5C342.7 25.7 364.3 26.3 385.8 25.2C407.3 24 428.7 21 450 21.2C471.3 21.3 492.7 24.7 514.2 25.3C535.7 26 557.3 24 578.8 23.7C600.3 23.3 621.7 24.7 643 25.3C664.3 26 685.7 26 707 25.2C728.3 24.3 749.7 22.7 771.2 22.3C792.7 22 814.3 23 835.8 23.8C857.3 24.7 878.7 25.3 889.3 25.7L900 26L900 0L889.3 0C878.7 0 857.3 0 835.8 0C814.3 0 792.7 0 771.2 0C749.7 0 728.3 0 707 0C685.7 0 664.3 0 643 0C621.7 0 600.3 0 578.8 0C557.3 0 535.7 0 514.2 0C492.7 0 471.3 0 450 0C428.7 0 407.3 0 385.8 0C364.3 0 342.7 0 321.2 0C299.7 0 278.3 0 257 0C235.7 0 214.3 0 193 0C171.7 0 150.3 0 128.8 0C107.3 0 85.7 0 64.2 0C42.7 0 21.3 0 10.7 0L0 0Z" fill="#58b386" />
            <path d="M0 12L10.7 13.7C21.3 15.3 42.7 18.7 64.2 19.3C85.7 20 107.3 18 128.8 18C150.3 18 171.7 20 193 20C214.3 20 235.7 18 257 16.8C278.3 15.7 299.7 15.3 321.2 14.7C342.7 14 364.3 13 385.8 13.5C407.3 14 428.7 16 450 16.5C471.3 17 492.7 16 514.2 15.8C535.7 15.7 557.3 16.3 578.8 16.8C600.3 17.3 621.7 17.7 643 18.3C664.3 19 685.7 20 707 19.2C728.3 18.3 749.7 15.7 771.2 14.3C792.7 13 814.3 13 835.8 14C857.3 15 878.7 17 889.3 18L900 19L900 0L889.3 0C878.7 0 857.3 0 835.8 0C814.3 0 792.7 0 771.2 0C749.7 0 728.3 0 707 0C685.7 0 664.3 0 643 0C621.7 0 600.3 0 578.8 0C557.3 0 535.7 0 514.2 0C492.7 0 471.3 0 450 0C428.7 0 407.3 0 385.8 0C364.3 0 342.7 0 321.2 0C299.7 0 278.3 0 257 0C235.7 0 214.3 0 193 0C171.7 0 150.3 0 128.8 0C107.3 0 85.7 0 64.2 0C42.7 0 21.3 0 10.7 0L0 0Z" fill="#439e70" />
            <path d="M0 5L10.7 5.3C21.3 5.7 42.7 6.3 64.2 7.3C85.7 8.3 107.3 9.7 128.8 9.7C150.3 9.7 171.7 8.3 193 7.8C214.3 7.3 235.7 7.7 257 8C278.3 8.3 299.7 8.7 321.2 9.3C342.7 10 364.3 11 385.8 11.7C407.3 12.3 428.7 12.7 450 12.3C471.3 12 492.7 11 514.2 11C535.7 11 557.3 12 578.8 12.7C600.3 13.3 621.7 13.7 643 12.3C664.3 11 685.7 8 707 6.5C728.3 5 749.7 5 771.2 6.3C792.7 7.7 814.3 10.3 835.8 11C857.3 11.7 878.7 10.3 889.3 9.7L900 9L900 0L889.3 0C878.7 0 857.3 0 835.8 0C814.3 0 792.7 0 771.2 0C749.7 0 728.3 0 707 0C685.7 0 664.3 0 643 0C621.7 0 600.3 0 578.8 0C557.3 0 535.7 0 514.2 0C492.7 0 471.3 0 450 0C428.7 0 407.3 0 385.8 0C364.3 0 342.7 0 321.2 0C299.7 0 278.3 0 257 0C235.7 0 214.3 0 193 0C171.7 0 150.3 0 128.8 0C107.3 0 85.7 0 64.2 0C42.7 0 21.3 0 10.7 0L0 0Z" fill="#2d8a5b" />
          </svg>
        </div>


        {/* Featured Media */}
        <div className="mb-32 md:mb-48">
          <h2 className="text-center text-xl md:text-3xl lg:text-5xl font-semibold mb-12">Featured Media</h2>
          <div className="grid grid-rows-3 grid-cols-1 lg:grid-rows-2 lg:grid-cols-2 mx-5 md:mx-16 lg:mx-24">
            <a href="https://www.neonscience.org/impact/observatory-blog/sciteens-data-science-and-ecology-gen-z"
              className="group col-span-1 row-span-1 lg:row-span-2 bg-white rounded-lg shadow overflow-hidden mr-0 lg:mr-4 mb-4 lg:mb-0"
              target="_blank" rel="noopener noreferrer">
              <div className="h-full flex flex-col md:flex-row lg:flex-col">
                <div className="relative h-full overflow-hidden w-full md:w-1/2 lg:w-auto">
                  <img src={'./assets/featured_media/neon.png'} alt="NSF Neon Logo" className="absolute top-0 w-full h-full object-cover transition group-hover:scale-105 duration-700" />
                </div>
                <div className="p-4 md:p-10 bg-white z-10 w-full md:w-1/2 lg:w-auto">
                  <p className="text-base md:text-2xl font-semibold mb-1">SciTeens: Data Science and Ecology for Gen Z</p>
                  <p className="text-sm md:text-lg text-gray-700">February 10, 2021</p>
                </div>
              </div>
            </a>
            <a href="https://news.mit.edu/2019/ideas-challenge-social-ventures-0430"
              className="group  row-span-1 col-span-1 bg-white rounded-lg shadow overflow-hidden ml-0 lg:ml-4 mb-4 mt-4 lg:mt-0"
              target="_blank" rel="noopener noreferrer">
              <div className="h-full flex flex-col md:flex-row">
                <div className="relative h-full w-full md:w-1/2">
                  <img src={'./assets/featured_media/ideas.jpg'} alt="" className="absolute top-0 w-full h-full object-cover transition group-hover:scale-105 duration-700" />
                </div>
                <div className="p-4 md:p-10 bg-white z-10 w-full md:w-1/2">
                  <p className="text-base md:text-2xl font-semibold mb-1">IDEAS challenge showcases social ventures at MIT</p>
                  <p className="text-sm md:text-lg text-gray-700">April 30, 2019</p>
                </div>
              </div>
            </a>
            <a href="https://news.fsu.edu/multimedia/radio/2020/08/03/young-scholars-online-program-turns-students-into-scientists/"
              className="group row-span-1 col-span-1 bg-white rounded-lg shadow overflow-hidden h-72 md:h-auto ml-0 lg:ml-4 mt-4"
              target="_blank" rel="noopener noreferrer">
              <div className="h-full flex flex-col md:flex-row lg:flex-row-reverse">
                <div className="relative h-full w-full md:w-1/2">
                  <img src={'./assets/featured_media/ysp.jpg'} alt="" className="absolute top-0 w-full h-full object-cover transition group-hover:scale-105 duration-700" />
                </div>
                <div className="p-4 md:p-10 bg-white z-10 w-full md:w-1/2">
                  <p className="text-base md:text-2xl font-semibold mb-1">Young Scholars Online Program turns students into
                    scientists</p>
                  <p className="text-sm md:text-lg text-gray-700 pb-5">August 3, 2020</p>
                </div>
              </div>
            </a>
          </div>
        </div>


        {/* Partners */}
        <div className="flex flex-col lg:flex-row justify-between mx-5 md:mx-16 lg:mx-24 mb-24">
          <div>
            <h2 className="text-center lg:text-left text-xl md:text-3xl lg:text-5xl font-semibold max-w-2xl mb-2">Partners and Programs</h2>
            <p className="text-center lg:text-left text-sm md:text-xl">If you'd like to support us, please consider <a href='/donate'
              className="font-semibold text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark">donating</a>.</p>
          </div>
          <div className="mx-auto lg:mr-auto w-[95%] md:w-[60%] grid grid-cols-2 grid-rows-2">
            <a href="https://www.google.com/nonprofits/" className="py-5 md:py-8 transition-shadow hover:shadow-2xl"
              target="_blank" rel="noopener noreferrer">
              <img src={'../assets/logos/Google_fullsize.png'} className="m-auto h-10 md:h-16 lg:h-20" alt="Google" />
            </a>
            <a href="https://innovation.mit.edu/opportunity/mit-ideas-global-challenge/"
              className="py-5 md:py-8 transition-shadow hover:shadow-2xl" target="_blank" rel="noopener noreferrer">
              <img src={'../assets/logos/MIT.png'} className="m-auto h-10 md:h-16 lg:h-20" alt="MIT" />
            </a>
            <a href="https://city.yale.edu/" className="py-5 md:py-8 transition-shadow hover:shadow-2xl"
              target="_blank" rel="noopener noreferrer">
              <img src={'../assets/logos/Yale.png'} className="m-auto h-10 md:h-16 lg:h-20" alt="Yale" />
            </a>
            <a href="https://www.bio.fsu.edu/ysp/" className="py-5 md:py-8 transition-shadow hover:shadow-2xl"
              target="_blank" rel="noopener noreferrer">
              <img src={'../assets/logos/FSU.png'} className="m-auto h-10 md:h-16 lg:h-20" alt="FSU" />
            </a>
          </div>
        </div>
      </div >
    </div >
  )
}
