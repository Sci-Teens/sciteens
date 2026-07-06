import Link from 'next/link'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'

export default function FourOhFour() {
  return (
    <>
      <div className="mx-auto mt-20 min-h-screen w-full text-center">
        <img
          src="/assets/404.png"
          alt="404"
          className="mx-auto w-1/2"
        />
        <h1 className="py-4 text-4xl font-semibold">
          Page not found
        </h1>
        <p className="mb-6 text-xl">
          This page may not exist or may have been deleted.
        </p>
        <Link
          href="/"
          className="bg-sciteensLightGreen-regular hover:bg-sciteensLightGreen-dark rounded-lg px-4 py-2 text-xl text-white shadow-sm"
        >
          Return Home
        </Link>
        {/* <iframe
              width="500"
              height="300"
              src="https://www.youtube.com/embed/wiDpO99BT3w"
              title="YouTube video player"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="mx-auto overflow-hidden max-w-full">
          </iframe> */}
      </div>
    </>
  )
}

export async function getStaticProps({ locale }) {
  return {
    props: {
      ...(await serverSideTranslations(locale, ['common'])),
      // Will be passed to the page component as props
    },
  }
}
