import 'tailwindcss/tailwind.css'
import Layout from '../components/Layout'
import { AppContext } from '../context/context';
import { useProfileData } from '../context/hooks'

// import { FirebaseAppProvider } from 'reactfire';

function MyApp({ Component, pageProps }) {
  const profileData = useProfileData()

  return (
    // <FirebaseAppProvider firebaseConfig={firebaseConfig}>
    <AppContext.Provider value={profileData}>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AppContext.Provider>
    // </FirebaseAppProvider>
  )
}

export default MyApp
