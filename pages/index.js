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
        <div className="flex flex-row justify-between bg-gray-100 rounded-xl mx-14 px-10 py-12">
          <div className="w-1/3">
            <h2 className="text-4xl font-semibold">We offer <span className="text-sciteensLightGreen-regular font-bold">science</span> for the masses.</h2>
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


        {/* Footer */}
        <footer className="w-full bg-gray-100 text-gray-700 py-12">
          <div className="flex flex-row justify-around">
            <div className="w-1/8">
              <p className="text-black font-semibold mb-2">ORGANIZATION</p>
              <ul>
                <li>
                  <a>About</a>
                </li>
                <li>
                  <a>FAQ</a>
                </li>
                <li>
                  <a>Contact</a>
                </li>
                <li>
                  <a>Get Involved</a>
                </li>
                <li>
                  <a>Feedback</a>
                </li>
              </ul>
            </div>
            <div className="w-1/8">
              <p className="text-black font-semibold mb-2">LEGAL</p>
              <ul>
                <li>
                  <a>Privacy</a>
                </li>
                <li>
                  <a>Terms</a>
                </li>
                <li>
                  <a>Cookies</a>
                </li>
              </ul>
            </div>
            <div className="w-1/8">
              <p className="text-black font-semibold mb-2">LANGUAGE</p>
              <ul>
                <li>
                  <a>English</a>
                </li>
                <li>
                  <a>Español</a>
                </li>
              </ul>
            </div>
            <div className="w-1/5">
              <p className="text-black font-semibold mb-2">PARTNERS</p>
              <div className="grid grid-rows-2 grid-cols-2 gap-6">
                <img src={'../public/assets/logos/Google.png'} alt="Google" />
                <p>Yale</p>
                <p>MIT</p>
                <p>FSU</p>
              </div>
            </div>
          </div>
          <div className="mt-8 mx-auto border-t-2 border-gray-300 w-11/12">
            <div className="flex flex-row justify-center my-4">
              <a href="https://www.facebook.com/SciTeensinfo" target="_blank" rel="noopener noreferrer">
                <img src="" alt="Facebook" />
              </a>
              <a href="https://www.instagram.com/sci.teens/" target="_blank" rel="noopener noreferrer">
                <img src="" alt="Instagram" />
              </a>
              <a href="https://www.linkedin.com/company/sciteens/" target="_blank" rel="noopener noreferrer">
                <img src="" alt="Linkedin" />
              </a>
              <a href="https://www.youtube.com/channel/UCXnyAT9TOrXywV0M6HbhaRA" target="_blank" rel="noopener noreferrer">
                <img src="" alt="YouTube" />
              </a>
            </div>
            <p className="text-center">© SciTeens Inc. 2021</p>
          </div>
        </footer>
      </main>


    </div>
  )
}
