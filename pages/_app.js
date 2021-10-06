import 'tailwindcss/tailwind.css'
import Layout from '../components/Layout'
import { AppContext } from '../context/context';
import firebaseConfig from '../firebaseConfig';
import { FirebaseAppProvider } from 'reactfire';
import { useState } from 'react';
import Head from 'next/head';

function MyApp({ Component, pageProps }) {
  const [profile, setProfile] = useState({})

  return (
    <>
      <Head>
        <link href="https://fonts.googleapis.com/css2?family=Nunito&display=swap" rel="stylesheet" />
        <title>Welcome to SciTeens</title>
        <link rel="icon" href="/favicon.ico" />
      </Head>
      < FirebaseAppProvider firebaseConfig={firebaseConfig} >
        <AppContext.Provider value={{ profile, setProfile }}>
          <Layout>
            <span>Profile is{Object.keys(profile)}</span>
            <Component {...pageProps} />
          </Layout>
        </AppContext.Provider>
      </FirebaseAppProvider >
    </>
  )
}

export default MyApp
