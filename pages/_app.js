import 'tailwindcss/tailwind.css'
import Layout from '../components/Layout'
import { AppWrapper } from '../context/AppContext';

function MyApp({ Component, pageProps }) {
  return (
    <AppWrapper>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </AppWrapper>
  )
}

export default MyApp
