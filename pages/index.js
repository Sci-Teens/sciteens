import Head from 'next/head'

export default function Home() {
  return (
    <div>
      <Head>
        <title>SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className="">
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
          <p className="my-56 text-center text-4xl">More stuff here</p>
        </div>
      </main>


    </div>
  )
}
