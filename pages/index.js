import Head from 'next/head'
import { useState, useEffect } from 'react'
import render from '../components/LoadDesk'

export default function Home() {

  const [rendered, setRendered] = useState(false)

  async function renderDesk() {
    if (!rendered) {
      let target = document.getElementById("canvas")
      await render(target.offsetWidth, target.offsetHeight)
      await setRendered(true)
    }
  }

  useEffect(() => {
    renderDesk()
  }, [])

  return (
    <div>
      <Head>
        <title>SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="mt-0 lg:-mt-20">
        {/* Landing screen */}
        <div className="h-screen flex flex-wrap flex-row items-center justify-between mx-10 md:mx-16 lg:mx-24 mb-12 animate__animated animate__fadeInDown">
          <div className="w-min">
            <h1 className="text-3xl md:text-5xl lg:text-6xl whitespace-nowrap">Science, simplified.</h1>
            <p className="text-sm md:text-lg mt-4 mb-8">Share your work, get feedback from mentors and peers, and find great scientific
              opportunities and resources available and accessible to you. Oh yeah, and it's free.
              Only here on SciTeens.
            </p>
            <div>
              <a className="bg-sciteensLightGreen-regular text-white text-base md:text-xl 
            rounded-lg shadow-md p-3 md:p-4 mr-2 hover:bg-sciteensLightGreen-dark">Get Started</a>
              <a className="text-gray-700 text-base md:text-xl p-4 ml-2 hover:underline active:bg-green-700">About</a>
            </div>
          </div>
          <div className="relative w-full lg:w-1/2 h-1/2 lg:h-full">
            <div id="canvas" className="absolute top-8 lg:top-1/2 translate-y-0 lg:-translate-y-1/2 w-full aspect-w-4 aspect-h-3 z-0" />
          </div>
        </div>


        {/* Mission Statement & Information */}
        <div className="mb-32 md:mb-48">
          <h2 className="text-center text-xl md:text-3xl lg:text-5xl font-semibold mb-12 mx-12 md:mx-32 lg:mx-56">Furthering the accessibility of science, one
            student at a time.</h2>
          <div className="flex flex-col lg:flex-row mx-10 md:mx-16 lg:mx-24">
            <div className="flex flex-col">
              <div className="flex flex-row bg-white shadow p-5 rounded-lg mb-8 mr-0 lg:mr-4">
                <p className="flex flex-shrink-0 justify-center items-center text-sciteensLightGreen-regular text-base md:text-lg lg:text-xl font-bold 
              bg-sciteensLightGreen-regular bg-opacity-25 rounded-full border-[3px] border-sciteensLightGreen-regular 
              border-opacity-40 h-9 lg:h-12 w-9 lg:w-12 mr-4 whitespace-nowrap">1</p>
                <p className="text-xs md:text-base lg:text-lg">We strive to bridge the gap between education and opportunity, particularly for
                  students from low-resource areas who do not have an extensive STEM support network.</p>
              </div>
              <div className="flex flex-row bg-white shadow p-5 rounded-lg mb-8 mr-0 lg:mr-4">
                <p className="flex flex-shrink-0 justify-center items-center text-sciteensLightGreen-regular text-base md:text-lg lg:text-xl font-bold 
              bg-sciteensLightGreen-regular bg-opacity-25 rounded-full border-[3px] border-sciteensLightGreen-regular 
              border-opacity-40 h-9 lg:h-12 w-9 lg:w-12 mr-4 whitespace-nowrap">2</p>
                <p className="text-xs md:text-base lg:text-lg">SciTeens was started by a group of teens just like you trying to get started in the
                  STEM fields. Because of this, we know how intimidating it can be to begin your own research projects. We
                  want to put an end to this intimidation and make STEM research accesible and rewarding for everyone.</p>
              </div>
            </div>
            <div className="flex flex-col">
              <div className="flex flex-row bg-white shadow p-5 rounded-lg  mb-8 ml-0 lg:ml-4">
                <p className="flex flex-shrink-0 justify-center items-center text-sciteensLightGreen-regular text-base md:text-lg lg:text-xl font-bold 
              bg-sciteensLightGreen-regular bg-opacity-25 rounded-full border-[3px] border-sciteensLightGreen-regular 
              border-opacity-40 h-9 lg:h-12 w-9 lg:w-12 mr-4 whitespace-nowrap">3</p>
                <p className="text-xs md:text-base lg:text-lg">With SciTeens you can share your knowledge and research by writing articles or
                  creating projects. Your work can be viewed by other SciTeens users, giving you access to unique opportunities
                  through collaboration with your peers and mentorship by accomplished scholars in the STEM fields.</p>
              </div>
              <div className="flex flex-row bg-white shadow p-5 rounded-lg mb-8 ml-0 lg:ml-4">
                <p className="flex flex-shrink-0 justify-center items-center text-sciteensLightGreen-regular text-base md:text-lg lg:text-xl font-bold 
              bg-sciteensLightGreen-regular bg-opacity-25 rounded-full border-[3px] border-sciteensLightGreen-regular 
              border-opacity-40 h-9 lg:h-12 w-9 lg:w-12 mr-4 whitespace-nowrap">4</p>
                <p className="text-xs md:text-base lg:text-lg">All it takes is a spark of inspiration, the willingness to work with your peers, and
                  an account to get started doing scientific research and making a difference in your area of study.</p>
              </div>
            </div>
          </div>
        </div>


        {/* Open Source & Testimonials */}
        <div className="mb-32 md:mb-48">
          <h2 className="text-center text-xl md:text-3xl lg:text-5xl font-semibold mb-12 mx-12 md:mx-28 lg:mx-48">SciTeens takes pride in its open source and
            collaborative platform, but let our users do the talking for us.</h2>
          <div className="relative flex flex-col md:flex-row items-center md:items-stretch justify-between mx-10 md:mx-16 lg:mx-24 z-10">
            <div className="bg-white shadow p-5 rounded-lg w-auto md:w-[45%] lg:w-[30%] mb-8 md:mb-0">
              <img src={'./assets/zondicons/education.svg'} className="h-10 mb-6" alt="" />
              <p className="text-sm lg:text-base mb-4">
                "I want to first thank the members and founders of SciTeens for bringing such a wonderful and amazing opportunity
                we are having. I would love to thank all the mentors who were taking most of their time mentoring us as well
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
              <p className="text-3xl">NEED 1 MORE TESTIMONIAL</p>
            </div>
          </div>
          <img src={'./assets/svgs/upper_block.svg'} alt="" className="-mt-32" />
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
          <img src={'./assets/svgs/lower_block.svg'} alt="" />
        </div>


        {/* Featured Media */}
        <div className="mb-32 md:mb-48">
          <h2 className="text-center text-xl md:text-3xl lg:text-5xl font-semibold mb-12">Featured Media</h2>
          <div className="grid grid-rows-3 grid-cols-1 lg:grid-rows-2 lg:grid-cols-2 mx-10 md:mx-16 lg:mx-24">
            <a href="https://www.neonscience.org/impact/observatory-blog/sciteens-data-science-and-ecology-gen-z"
              className="col-span-1 row-span-1 lg:row-span-2 bg-white rounded-lg shadow overflow-hidden mr-0 lg:mr-4 mb-4 lg:mb-0"
              target="_blank" rel="noopener noreferrer">
              <div className="h-full flex flex-col md:flex-row lg:flex-col">
                <div className="relative h-full overflow-hidden w-full md:w-1/2 lg:w-auto">
                  <img src={'./assets/featured_media/neon.png'} alt="NSF Neon Logo" className="absolute top-0 w-full h-full object-cover transition hover:scale-105 duration-700" />
                </div>
                <div className="p-4 md:p-10 bg-white z-10 w-full md:w-1/2 lg:w-auto">
                  <p className="text-base md:text-2xl font-semibold mb-1">SciTeens: Data Science and Ecology for Gen Z</p>
                  <p className="text-sm md:text-lg text-gray-700">February 10, 2021</p>
                </div>
              </div>
            </a>
            <a href="https://news.mit.edu/2019/ideas-challenge-social-ventures-0430"
              className="relative row-span-1 col-span-1 bg-white rounded-lg shadow overflow-hidden ml-0 lg:ml-4 mb-4 mt-4 lg:mt-0"
              target="_blank" rel="noopener noreferrer">
              <div className="h-full flex flex-col md:flex-row">
                <div className="relative h-full w-full md:w-1/2">
                  <img src={'./assets/featured_media/ideas.jpg'} alt="" className="absolute top-0 w-full h-full object-cover transition hover:scale-105 duration-700" />
                </div>
                <div className="p-4 md:p-10 bg-white z-10 w-full md:w-1/2">
                  <p className="text-base md:text-2xl font-semibold mb-1">IDEAS challenge showcases social ventures at MIT</p>
                  <p className="text-sm md:text-lg text-gray-700">April 30, 2019</p>
                </div>
              </div>
            </a>
            <a href="https://news.fsu.edu/multimedia/radio/2020/08/03/young-scholars-online-program-turns-students-into-scientists/"
              className="row-span-1 col-span-1 bg-white rounded-lg shadow overflow-hidden h-60 md:h-60 lg:h-72 ml-0 lg:ml-4 mt-4"
              target="_blank" rel="noopener noreferrer">
              <div className="h-full flex flex-col md:flex-row lg:flex-row-reverse">
                <div className="relative h-full w-full md:w-1/2">
                  <img src={'./assets/featured_media/ysp.jpg'} alt="" className="absolute top-0 w-full h-full object-cover transition hover:scale-105 duration-700" />
                </div>
                <div className="p-4 md:p-10 bg-white z-10 w-full md:w-1/2">
                  <p className="text-base md:text-2xl font-semibold mb-1">Young Scholars Online Program turns students into
                    scientists</p>
                  <p className="text-sm md:text-lg text-gray-700">August 3, 2020</p>
                </div>
              </div>
            </a>
          </div>
        </div>


        {/* Partners */}
        <div className="flex flex-col lg:flex-row justify-between mx-10 md:mx-16 lg:mx-24 mb-24">
          <div>
            <h2 className="text-center lg:text-left text-xl md:text-3xl lg:text-5xl font-semibold max-w-2xl mb-2">Partners & Programs</h2>
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
      </main>


    </div>
  )
}
