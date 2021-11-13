import 'tailwindcss/tailwind.css'
import Layout from '../components/Layout'
import { AppContext } from '../context/context';
import firebaseConfig from '../firebaseConfig';
import { FirebaseAppProvider } from 'reactfire';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import "../styles/nprogress.css";
import dynamic from 'next/dynamic'

const TopProgressBar = dynamic(
  () => {
    return import("../components/TopProgressBar");
  },
  { ssr: false },
);

function MyApp({ Component, pageProps }) {
  const [profile, setUserProfile] = useState({})

  function setProfile(p) {
    setUserProfile(p)
    if (process.browser) {
      window.localStorage.setItem('profile', JSON.stringify(p))
    }
  }

  useEffect(() => {
    if (process.browser) {
      let p
      if (window.localStorage.getItem('profile') != 'undefined') {
        p = JSON.parse(window.localStorage.getItem('profile'))
      }

      if (p) {
        setUserProfile(p)
      }
    }
  }, [])

  return (
    <div className="w-full h-full font-sciteens bg-backgroundGreen">
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Nunito&display=swap" rel="stylesheet" />
        <title>Welcome to SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      < FirebaseAppProvider firebaseConfig={firebaseConfig} >
        <AppContext.Provider value={{ profile, setProfile }}>
          <TopProgressBar></TopProgressBar>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </AppContext.Provider>
      </FirebaseAppProvider >
    </div>
  )
}

export default MyApp
