import Head from 'next/head'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function gdpr() {
  const { t } = useTranslation('common')
  return (
    <div>
      <Head>
        <title>Policies, Terms, GDPR | SciTeens</title>
      </Head>

      <main>
        <div className="flex flex-row justify-evenly py-8">
          <div className="hidden w-1/4 lg:flex lg:flex-col">
            <div className="sticky top-1/2 -translate-y-1/2 transform ">
              <h2 className="mb-1 text-xl font-semibold">
                Table of Contents
              </h2>
              <ul className="ml-2 text-sm text-sciteensGreen-dark">
                <li>
                  <a
                    href="#policy1"
                    className="hover:underline"
                  >
                    What Are Cookies?
                  </a>
                </li>
                <li>
                  <a
                    href="#policy2"
                    className="hover:underline"
                  >
                    Why Do We Use Cookies?
                  </a>
                </li>
                <li>
                  <a
                    href="#policy3"
                    className="hover:underline"
                  >
                    How Can I Control Cookies?
                  </a>
                </li>
                <li>
                  <a
                    href="#policy4"
                    className="hover:underline"
                  >
                    What About Other Tracking Technologies?
                  </a>
                </li>
                <li>
                  <a
                    href="#policy5"
                    className="hover:underline"
                  >
                    Do We Use Flash Cookies Or Local Shared
                    Objects?
                  </a>
                </li>
                <li>
                  <a
                    href="#policy6"
                    className="hover:underline"
                  >
                    Do We Serve Targeted Advertising
                  </a>
                </li>
                <li>
                  <a
                    href="#policy7"
                    className="hover:underline"
                  >
                    How Often Will We Update This Cookie
                    Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#policy8"
                    className="hover:underline"
                  >
                    Contact Us
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="mx-8 md:mx-12 lg:mx-0 lg:w-2/3">
            <h1 className="text-3xl">COOKIE POLICY</h1>
            <p className="mt-1 mb-8 whitespace-pre-line text-gray-700">
              Last Updated 9/30/2021
            </p>
            <p className="mb-10 text-gray-700">
              This Cookie Policy explains how SciTeens Inc.
              ("Company", "we", "us", and "our") uses
              cookies and similar technologies to recognize
              you when you visit our websites at
              http://sciteens.org, ("Websites"). It explains
              what these technologies are and why we use
              them, as well as your rights to control our
              use of them. In some cases we may use cookies
              to collect personal information, or that
              becomes personal information if we combine it
              with other information.
            </p>

            {/* Policy 1 */}
            <div>
              <h2 id="policy1" className="mb-2 text-2xl">
                WHAT ARE COOKIES?
              </h2>
              <p className="mb-10 text-gray-700">
                Cookies are small data files that are placed
                on your computer or mobile device when you
                visit a website. Cookies are widely used by
                website owners in order to make their
                websites work, or to work more efficiently,
                as well as to provide reporting information.
                Cookies set by the website owner (in this
                case, SciTeens Inc.) are called "first party
                cookies". Cookies set by parties other than
                the website owner are called "third party
                cookies". Third party cookies enable third
                party features or functionality to be
                provided on or through the website (e.g.
                like advertising, interactive content and
                analytics). The parties that set these third
                party cookies can recognize your computer
                both when it visits the website in question
                and also when it visits certain other
                websites.
              </p>
            </div>

            {/* Policy 2 */}
            <div>
              <h2 id="policy2" className="mb-2 text-2xl">
                WHY DO WE USE COOKIES?
              </h2>
              <p className="mb-10 text-gray-700">
                We use first and third party cookies for
                several reasons. Some cookies are required
                for technical reasons in order for our
                Websites to operate, and we refer to these
                as "essential" or "strictly necessary"
                cookies. Other cookies also enable us to
                track and target the interests of our users
                to enhance the experience on our Online
                Properties. Third parties serve cookies
                through our Websites for advertising,
                analytics and other purposes. This is
                described in more detail below. The specific
                types of first and third party cookies
                served through our Websites and the purposes
                they perform are described below (please
                note that the specific cookies served may
                vary depending on the specific Online
                Properties you visit).
              </p>
            </div>

            {/* Policy 3 */}
            <div>
              <h2 id="policy3" className="mb-2 text-2xl">
                HOW CAN I CONTROL COOKIES?
              </h2>
              <p className="mb-4 text-gray-700">
                You have the right to decide whether to
                accept or reject cookies. You can exercise
                your cookie rights by setting your
                preferences in the Cookie Consent Manager.
                The Cookie Consent Manager allows you to
                select which categories of cookies you
                accept or reject. Essential cookies cannot
                be rejected as they are strictly necessary
                to provide you with services. The Cookie
                Consent Manager can be found in the
                notification banner and on our website. If
                you choose to reject cookies, you may still
                use our website though your access to some
                functionality and areas of our website may
                be restricted. You may also set or amend
                your web browser controls to accept or
                refuse cookies. As the means by which you
                can refuse cookies through your web browser
                controls vary from browser-to-browser, you
                should visit your browser's help menu for
                more information. In addition, most
                advertising networks offer you a way to opt
                out of targeted advertising. If you would
                like to find out more information, please
                visit http://www.aboutads.info/choices/ or
                http://www.youronlinechoices.com. The
                specific types of first and third party
                cookies served through our Websites and the
                purposes they perform are described in the
                table below (please note that the specific
                cookies served may vary depending on the
                specific Online Properties you visit).
              </p>
              <p className="mb-2 text-lg">
                Essential website cookies:
              </p>
              <p className="mb-4 text-gray-700">
                These cookies are strictly necessary to
                provide you with services available through
                our Websites and to use some of its
                features, such as access to secure areas.
              </p>
              <p className="mb-10 ml-4 text-gray-700">
                <b>__tlbcpv:</b>
                <br />
                Used to record unique visitor views of the
                consent banner.
                <br />
                termly.io
                <br />
                Termly View Service Privacy Policy
                <br />
                United States
                <br />
                <b>http_cookie:</b>
                <br />
                Expires in 1 year
              </p>
            </div>

            {/* Policy 4 */}
            <div>
              <h2 id="policy4" className="mb-2 text-2xl">
                WHAT ABOUT OTHER TRACKING TECHNOLOGES, LIKE
                WEB BEACONS?
              </h2>
              <p className="mb-10 text-gray-700">
                Cookies are not the only way to recognize or
                track visitors to a website. We may use
                other, similar technologies from time to
                time, like web beacons (sometimes called
                "tracking pixels" or "clear gifs"). These
                are tiny graphics files that contain a
                unique identifier that enable us to
                recognize when someone has visited our
                Websites or opened an e-mail including them.
                This allows us, for example, to monitor the
                traffic patterns of users from one page
                within a website to another, to deliver or
                communicate with cookies, to understand
                whether you have come to the website from an
                online advertisement displayed on a
                third-party website, to improve site
                performance, and to measure the success of
                e-mail marketing campaigns. In many
                instances, these technologies are reliant on
                cookies to function properly, and so
                declining cookies will impair their
                functioning.
              </p>
            </div>

            {/* Policy 5 */}
            <div>
              <h2 id="policy5" className="mb-2 text-2xl">
                DO WE USE FLASH COOKIES OR LOCAL SHARED
                OBJECTS?
              </h2>
              <p className="mb-10 text-gray-700">
                Websites may also use so-called "Flash
                Cookies" (also known as Local Shared Objects
                or "LSOs") to, among other things, collect
                and store information about your use of our
                services, fraud prevention and for other
                site operations. If you do not want Flash
                Cookies stored on your computer, you can
                adjust the settings of your Flash player to
                block Flash Cookies storage using the tools
                contained in the Website Storage Settings
                Panel. You can also control Flash Cookies by
                going to the Global Storage Settings Panel
                and following the instructions (which may
                include instructions that explain, for
                example, how to delete existing Flash
                Cookies (referred to "information" on the
                Macromedia site), how to prevent Flash LSOs
                from being placed on your computer without
                your being asked, and (for Flash Player 8
                and later) how to block Flash Cookies that
                are not being delivered by the operator of
                the page you are on at the time). Please
                note that setting the Flash Player to
                restrict or limit acceptance of Flash
                Cookies may reduce or impede the
                functionality of some Flash applications,
                including, potentially, Flash applications
                used in connection with our services or
                online content.
              </p>
            </div>

            {/* Policy 6 */}
            <div>
              <h2 id="policy6" className="mb-2 text-2xl">
                DO WE SERVE TARGETED ADVERTISING?
              </h2>
              <p className="mb-10 text-gray-700">
                Third parties may serve cookies on your
                computer or mobile device to serve
                advertising through our Websites. These
                companies may use information about your
                visits to this and other websites in order
                to provide relevant advertisements about
                goods and services that you may be
                interested in. They may also employ
                technology that is used to measure the
                effectiveness of advertisements. This can be
                accomplished by them using cookies or web
                beacons to collect information about your
                visits to this and other sites in order to
                provide relevant advertisements about goods
                and services of potential interest to you.
                The information collected through this
                process does not enable us or them to
                identify your name, contact details or other
                details that directly identify you unless
                you choose to provide these.
              </p>
            </div>

            {/* Policy 7 */}
            <div>
              <h2 id="policy7" className="mb-2 text-2xl">
                HOW OFTEN WILL WE UPDATE THIS COOKIE POLICY?
              </h2>
              <p className="mb-10 text-gray-700">
                We may update this Cookie Policy from time
                to time in order to reflect, for example,
                changes to the cookies we use or for other
                operational, legal or regulatory reasons.
                Please therefore re-visit this Cookie Policy
                regularly to stay informed about our use of
                cookies and related technologies. The date
                at the top of this Cookie Policy indicates
                when it was last updated.
              </p>
            </div>

            {/* Policy 8 */}
            <div>
              <h2 id="policy8" className="mb-2 text-2xl">
                CONTACT US
              </h2>
              <p className="mb-4 text-gray-700">
                If you have any questions about our use of
                cookies or other technologies, please email
                us at support@sciteens.org or by post to:
              </p>
              <p className="my-4 text-sciteensGreen-regular">
                SciTeens Inc.
                <br />
                John Sutor
                <br />
                2195 W Tennessee St
                <br />
                Unit 217
                <br />
                Talahassee, FL 32304
                <br />
                United States
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
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
