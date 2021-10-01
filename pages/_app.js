import 'tailwindcss/tailwind.css'
import Layout from '../components/Layout'
import { AppContext } from '../context/context';
import firebaseConfig from '../firebaseConfig';
import { FirebaseAppProvider } from 'reactfire';
import { useState } from 'react';

function MyApp({ Component, pageProps }) {
  const [profile, setProfile] = useState({})

  return (
    < FirebaseAppProvider firebaseConfig={firebaseConfig} >
      <AppContext.Provider value={{ profile, setProfile }}>
        <Layout>
          <span>Profile is{Object.keys(profile)}</span>
          <Component {...pageProps} />
        </Layout>
      </AppContext.Provider>

    </FirebaseAppProvider >
  )
}

export default MyApp
