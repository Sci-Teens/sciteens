import 'tailwindcss/tailwind.css'
import Layout from '../components/Layout'
import { AppWrapper } from '../context/state';
import { FirebaseAppProvider, FirestoreProvider, useFirestoreDocData, useFirestore, useFirebaseApp } from 'reactfire';
import firebaseConfig from '../firebaseConfig'

function MyApp({ Component, pageProps }) {
  return (
    <FirebaseAppProvider firebaseConfig={firebaseConfig}>
      <AppWrapper>
        <Layout>
          <Component {...pageProps} />
        </Layout>
      </AppWrapper>
    </FirebaseAppProvider>
  )
}

export default MyApp
