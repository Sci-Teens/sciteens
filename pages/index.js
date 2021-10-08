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


        {/* Mission Statement & Information */}
        <div className="mb-48">
          <h2 className="ml-24 text-4xl font-semibold max-w-2xl mb-12">Furthering the accessibility of science, one
            student at a time.</h2>
          <div className="flex flex-col md:flex-row mx-24">
            <div className="flex flex-row md:flex-col">
              <div className="flex flex-row bg-white shadow p-5 rounded-lg mb-8 mr-0 md:mr-4">
                <p className="flex flex-shrink-0 justify-center items-center text-sciteensLightGreen-regular text-xl font-bold 
              bg-sciteensLightGreen-regular bg-opacity-25 rounded-full border-[3px] border-sciteensLightGreen-regular 
              border-opacity-40 h-12 w-12 mr-4 whitespace-nowrap">1</p>
                <p className="text-lg">We strive to bridge the gap between education and opportunity, particularly for
                  students from low-resource areas who do not have an extensive STEM support network.</p>
              </div>
              <div className="flex flex-row bg-white shadow p-5 rounded-lg mb-8 mr-0 md:mr-4">
                <p className="flex flex-shrink-0 justify-center items-center text-sciteensLightGreen-regular text-xl font-bold 
              bg-sciteensLightGreen-regular bg-opacity-25 rounded-full border-[3px] border-sciteensLightGreen-regular 
              border-opacity-40 h-12 w-12 mr-4 whitespace-nowrap">2</p>
                <p className="text-lg">SciTeens was started by a group of teens just like you trying to get started in the
                  STEM field. Because of this, we know how intimidating it can be trying to get started with your own research
                  projects. We want to put an end to this intimidation and make STEM research fun and easy for everyone.</p>
              </div>
            </div>
            <div className="flex flex-row md:flex-col">
              <div className="flex flex-row bg-white shadow p-5 rounded-lg  mb-8 ml-0 md:ml-4">
                <p className="flex flex-shrink-0 justify-center items-center text-sciteensLightGreen-regular text-xl font-bold 
              bg-sciteensLightGreen-regular bg-opacity-25 rounded-full border-[3px] border-sciteensLightGreen-regular 
              border-opacity-40 h-12 w-12 mr-4 whitespace-nowrap">3</p>
                <p className="text-lg">With SciTeens you can share your knowledge and research by writing articles or creating
                  projects. All of your work can be viewed by other SciTeens users, giving you access to unique opportunities
                  through collaboration with your peers or mentorship by accomplished scholars in the STEM fields.</p>
              </div>
              <div className="flex flex-row bg-white shadow p-5 rounded-lg mb-8 ml-0 md:ml-4">
                <p className="flex flex-shrink-0 justify-center items-center text-sciteensLightGreen-regular text-xl font-bold 
              bg-sciteensLightGreen-regular bg-opacity-25 rounded-full border-[3px] border-sciteensLightGreen-regular 
              border-opacity-40 h-12 w-12 mr-4 whitespace-nowrap">4</p>
                <p className="text-lg">All it takes is a spark of inspiration, the willingness to work with your peers in
                  the STEM field, and an account to get started doing scientific research and making a difference in your
                  area of study; so why not <a href='/signup' className="text-sciteensLightGreen-regular
                  hover:text-sciteensLightGreen-dark font-semibold">get started</a>.</p>
              </div>
            </div>
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
          <img src={'./assets/svgs/upper_block.svg'} alt="" className="-mt-32" />
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
          <img src={'./assets/svgs/lower_block.svg'} alt="" />
        </div>


        {/* Featured Media */}
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
              <img src={'../assets/logos/Google_fullsize.png'} className="m-auto h-20" alt="Google" />
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
