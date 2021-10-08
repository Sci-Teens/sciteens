import Head from 'next/head'

export default function Home() {
  return (
    <div>
      <Head>
        <title>SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="-mt-10">
        {/* Landing screen */}
        <div className="h-screen flex flex-wrap flex-row items-center justify-between mx-24 mb-12 animate__animated animate__fadeInDown">
          <div className="w-min">
            <h1 className="text-6xl whitespace-nowrap">Science, Simplified 🧪</h1>
            <p className="text-lg mt-4 mb-8">Share your work, get feedback from mentors and peers, and find great scientific
              opportunities and resources available and accessible to you. Oh yeah, and it's free.
              Only here on SciTeens.
            </p>
            <div>
              <a className="bg-sciteensLightGreen-regular text-white text-xl 
            rounded-lg shadow-md p-4 mr-2 hover:bg-sciteensLightGreen-dark">Get Started</a>
              <a className="text-gray-700 text-xl p-4 ml-2 hover:underline active:bg-green-700">About</a>
            </div>
          </div>
          <div className="w-min">
            <div className="bg-black w-96 h-96 rounded-full" />
          </div>
        </div>


        {/* Open Source & Testimonials */}
        <div className="mb-48 bg-backgroundGreen">
          <h2 className="ml-24 text-4xl font-semibold max-w-2xl mb-12">SciTeens takes pride in its open source and
            collaborative platform, but let our users do the talking for us.</h2>
          <div className="relative flex flex-row justify-between mx-24 z-10">
            <div className="bg-white shadow p-5 rounded-lg w-[30%]">
              <img src={'./assets/zondicons/education.svg'} className="h-10 mb-6" alt="" />
              <p className="mb-4">
                "I want to first thank the members and founders of SciTeens for bringing such a wonderful and amazing opportunity
                we are having. I would love to thank all the mentors who were taking most of their time mentoring us as well
                helping us coming up with best projects."
              </p>
              <p className="text-xl">- <span className="font-semibold">Elisha M.</span>, Zimbabwe</p>
            </div>
            <div className="bg-white shadow p-5 rounded-lg w-[30%]">
              <img src={'./assets/zondicons/globe.svg'} className="h-10 mb-6" alt="" />
              <p className="mb-4">
                "Working with students across the world with SciTeens was amazing... I am super grateful that I was
                able to experience it."
              </p>
              <p className="text-xl">- <span className="font-semibold">David L.</span>, United States</p>
            </div>
            <div className="bg-white shadow p-5 rounded-lg w-[30%]">
              <p className="text-3xl">NEED 1 MORE TESTIMONIAL</p>
            </div>
          </div>
          <svg className="-mt-44" viewBox="0 0 960 75" width="100%" xmlns="http://www.w3.org/2000/svg" version="1.1">
            <path d="M0 25L20 30C40 35 80 45 120 50C160 55 200 55 240 51.7C280 48.3 320 41.7 360 37.7C400 33.7 440 32.3 480 
            35.8C520 39.3 560 47.7 600 52C640 56.3 680 56.7 720 52.7C760 48.7 800 40.3 840 38.2C880 36 920 40 940 42L960 44L960 
            76L940 76C920 76 880 76 840 76C800 76 760 76 720 76C680 76 640 76 600 76C560 76 520 76 480 76C440 76 400 76 360 
            76C320 76 280 76 240 76C200 76 160 76 120 76C80 76 40 76 20 76L0 76Z" fill="#2D8A5B" strokeLinecap="round"
              strokeLinejoin="miter">
            </path>
          </svg>
          <div className="flex flex-row justify-between px-24 pt-32 pb-10 text-white text-center bg-sciteensGreen-regular">
            <div className="w-[30%]">
              <p className="text-5xl font-semibold">400+</p>
              <p className="text-lg text-gray-100">Monthly Active Users</p>
            </div>
            <div className="w-[30%]">
              <p className="text-5xl font-semibold">50</p>
              <p className="text-lg text-gray-100">Schools</p>
            </div>
            <div className="w-[30%]">
              <p className="text-5xl font-semibold">7</p>
              <p className="text-lg text-gray-100">Countries</p>
            </div>
          </div>
          <svg viewBox="0 0 960 75" width="100%" xmlns="http://www.w3.org/2000/svg" version="1.1">
            <path d="M0 39L20 39.3C40 39.7 80 40.3 120 38.2C160 36 200 31 240 28C280 25 320 24 360 25.3C400 26.7 440 30.3 
            480 32.5C520 34.7 560 35.3 600 33.8C640 32.3 680 28.7 720 25.3C760 22 800 19 840 20.8C880 22.7 920 29.3 940 
            32.7L960 36L960 0L940 0C920 0 880 0 840 0C800 0 760 0 720 0C680 0 640 0 600 0C560 0 520 0 480 0C440 0 400 0 
            360 0C320 0 280 0 240 0C200 0 160 0 120 0C80 0 40 0 20 0L0 0Z" fill="#2D8A5B" strokeLinecap="round"
              strokeLinejoin="miter">
            </path>
          </svg>
        </div>


        {/* Mission statement & more */}
        <div className="flex flex-row justify-between bg-gray-100 rounded-xl shadow-md mx-14 px-10 py-12">
          <div className="w-1/3">
            <h2 className="text-5xl font-semibold">By <span className="text-sciteensLightGreen-regular font-bold">teens</span>, for <span className="text-sciteensLightGreen-regular font-bold"> teens</span> </h2>
          </div>
          <div className="w-1/4 rounded-lg">
            <h2 className="text-3xl font-semibold mx-auto mb-2">We're on a mission.</h2>
            <p className="text-lg">We strive to bridge the gap between education and opportunity,
              particularly for students from low-resource areas who do not have an extensive STEM support network.
            </p>
          </div>
          <div className="w-1/4 rounded-lg">
            <h2 className="text-3xl font-semibold mx-auto mb-2">What does it take?</h2>
            <p className="text-lg">For a high school student coming to our website, it only takes a spark of inspiration,
              the capability of leading research independently or among their peers, and most importantly,
              the capability of creating an impact.
            </p>
          </div>
        </div>


        {/* Some more stuff */}
        <div>
          <p className="my-56 text-center text-4xl">Featured media here</p>
        </div>


        {/* Partners */}
        <div className="flex flex-row justify-between mx-24 mb-24">
          <div className="">
            <h2 className="text-4xl font-semibold max-w-2xl mb-2">Partners & Programs</h2>
            <p className="text-lg">If you'd like to support us, please consider <a href='/donate'
              className="font-semibold text-sciteensLightGreen-regular hover:text-sciteensLightGreen-dark">donating</a>.</p>
          </div>
          <div className="w-[60%] grid grid-cols-2 grid-rows-2">
            <a href="https://www.google.com/nonprofits/" className="py-8 transition-shadow hover:shadow-2xl"
              target="_blank" rel="noopener noreferrer">
              <img src={'../assets/logos/Google.png'} className="m-auto h-20" alt="Google" />
            </a>
            <a href="https://innovation.mit.edu/opportunity/mit-ideas-global-challenge/"
              className="py-8 transition-shadow hover:shadow-2xl" target="_blank" rel="noopener noreferrer">
              <img src={'../assets/logos/MIT.png'} className="m-auto h-20" alt="MIT" />
            </a>
            <a href="https://city.yale.edu/" className="py-8 transition-shadow hover:shadow-2xl"
              target="_blank" rel="noopener noreferrer">
              <img src={'../assets/logos/Yale.png'} className="m-auto h-20" alt="Yale" />
            </a>
            <a href="https://www.bio.fsu.edu/ysp/" className="py-8 transition-shadow hover:shadow-2xl"
              target="_blank" rel="noopener noreferrer">
              <img src={'../assets/logos/FSU.png'} className="m-auto h-20" alt="FSU" />
            </a>
          </div>
        </div>
      </main>


    </div>
  )
}
