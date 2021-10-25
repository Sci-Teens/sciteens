import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image';
import { useRouter } from "next/router"
import { useFirestore } from 'reactfire';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, limit } from '@firebase/firestore';

export default function About() {
    const [members, setMembers] = useState([
        {
            name: "Sri Kondapalli",
            image: "sri.jpg",
            about:
                "Sri has a golden retriever and can talk with her mouth closed.",
        },
        {
            name: "Rohan Bolle",
            image: "rohan.jpg",
            about:
                "Rohan is an amateur photographer and that typical anime watching kid.",
        },
        {
            name: "Aneesha Acharya",
            image: "aneesha.jpg",
            about:
                "Aneesha attends the University of Florida and she can do a cartwheel.",
        },
        {
            name: "Eduard Shkulipa",
            image: "eduard.jpg",
            about: "Eduard wants to create a robot that would conquer the world.",
        },
        {
            name: "Angelo Chen",
            image: "angelo.jpg",
            about: "Angelo is a student at Suncoast High School.",
        },
        {
            name: "Aya Khalaf",
            image: "aya.jpg",
            about:
                "*inserts Pewdiepie line* Good morning gamers, Aya here. I may look intimidating in that picture above but I promise I'm anything but that :p",
        },
        {
            name: "Sonica Prakash",
            image: "sonica.jpg",
            about: "Sonica loves learning new things.",
        },
        {
            name: "Angelica Castillejos",
            image: "angelica.jpg",
            about:
                "Angelica is a student at Massachusetts Institute of Technology passionate about data science and Python.",
        },
        {
            name: "John Sutor",
            image: "john.jpg",
            about:
                "John isn't a mad scientist and doesn't do biology research (despite the photo).",
        },
        {
            name: "Shang Chen",
            image: "shang.jpg",
            about:
                "Shang's hobbies include cooking, working out, and playing the piano.",
        },
        {
            name: "Akash Patel",
            image: "akash.jpg",
            about: "Akash is a current computer engineering student at USC.",
        },
        {
            name: "Carlos Mercado-Lara",
            image: "carlos.jpg",
            about: "Carlos has collected rocks since elementary school.",
        },
        {
            name: "Erin Kang",
            image: "erin.jpg",
            about: "Erin has an intense fear of squirrels.",
        },
        {
            name: "Grace Jiang",
            image: "grace.jpg",
            about:
                "Grace's favorite food is ice cream, and she can fold an epic origami bird.",
        },
        {
            name: "Aarti Kalamangalam",
            image: "aarti.jpg",
            about: "Aarti likes to write.",
        },
        {
            name: "Iman Khalid",
            image: "iman.jpg",
            about:
                "Iman runs, horseback rides, and is on her school's weightlifting team.",
        },
        {
            name: "Hannah Scaglione",
            image: "hannah.jpg",
            about:
                "Hannah likes to work out and is interested in pursuing robotic engineering.",
        },
        {
            name: "Liane Xu",
            image: "liane.jpg",
            about:
                "Liane is a college freshman who enjoys traveling, eating, and telling dad jokes.",
        },
        {
            name: "Ashley Pelton",
            image: "ashley.jpg",
            about:
                "Ashley enjoys playing Sudoku and is interested in pursuing Neuroscience.",
        },
        {
            name: "Ohm Parikh ",
            image: "ohm.jpg",
            about: "Ohm lived in New Jersey for thirteen years.",
        },
        {
            name: "Tasman Rosenfeld",
            image: "tasman.jpg",
            about:
                "Taz's passions consist of aggressively screaming into microphones and catching salamanders.",
        },])
    members.sort(() => Math.random() - 0.5);
    useEffect(setMembers(setMembers, [""]))
    return (
        <div>
            <main className="w-full">

                <div className="text-left px-4 py-8 md:p-8 w-full lg:w-2/3 mx-auto">
                    <h1 className="text-4xl mb-4">
                        Our Journey
                    </h1>
                    <div className="flex flex-col-reverse lg:flex-row items-center mb-8">
                        <p className="text-base lg:text-lg mb-4">
                            Inspired and driven by our curiosity towards the sciences, we participated in science fairs across South Florida throughout high school. With every competition, we met more of our remarkably bright and motivated peers from all backgrounds. They felt that doing research and competing in science fairs came with many barriers to entry, particularly as their schools lacked the necessary frameworks and guidance. This apparent unequal distribution of resources troubled us, so we came together and created SciTeens.
                        </p>
                        <img src={'./assets/beaker_purple.jpg'} className="rounded-full w-56 h-56 ml-4 object-cover mb-4 lg:mb-0" alt="" />

                    </div>
                    <div className="flex flex-col lg:flex-row items-center mb-16">
                        <img src={'./assets/student_laptop.jpg'} className="rounded-full w-56 h-56 mr-4 object-cover mb-4 lg:mb-0" alt="" />

                        <p className="text-base lg:text-lg mb-4 mr-4">
                            Our mission is to bridge the gap between education and opportunity—particularly for under-resourced students—by providing them with mentorship and community on our free online platform. We envision an educational environment where students from all backgrounds have equal access to the resources and network necessary to pursue careers in STEM. By helping students find niche STEM programs in their area to connect them to mentors who can remotely guide them through a project, we’re here to usher in a diverse generation of STEM leaders. We support projects and programs in almost every scientific field and seek to foster an inclusive and supportive virtual environment for learning and growth.
                        </p>
                    </div>
                    <div className="flex flex-col lg:flex-row items-center mb-8">
                        <div>
                            <p className="text-base lg:text-lg mb-4 font-bold">
                                New to our platform? Sign up today as a student or mentor. Let’s revolutionize the way pre-collegiate science is conducted.
                            </p>
                            <p className="text-base lg:text-lg mb-4">
                                SciTeens Inc. is a registered 501(c)(3) not-for-profit entity. If we are not meeting expectations on how we can best serve you at any time, please
                                <a
                                    href="mailto:support@sciteens.org"
                                    class="text-sciteensGreen-regular font-bold"
                                >
                                    reach out
                                </a>
                                to us to let us know how we can do better.
                            </p>
                        </div>
                        <nuxt-link
                            // this link needs to be fixed
                            to="localePath({ name: 'signup' })"
                            class="bg-sciteensLightGreen-regular text-white text-lg text-center rounded-lg shadow-md p-4 ml-4 hover:bg-sciteensLightGreen-dark w-2/3 lg:w-1/3"
                        >
                            Sign Up Today
                        </nuxt-link>
                    </div>


                    {/* Profile Pics */}
                    <h2 class="text-2xl mb-4 font-bold">
                        Meet the Team
                    </h2>
                    <div class="w-full flex flex-wrap">
                        <div class="w-full lg:w-1/2 lg:pr-8">
                            <div class="flex justify-end my-2 flex-row odd:flex-row-reverse items-center">





                            </div>
                        </div>
                    </div>



                    {/* Sponsors */}
                    {/* IDEAS */}
                    <div class="flex flex-wrap w-full">
                        <div class="flex w-full lg:w-1/2 justify-start mt-2 items-center">
                            <img
                                loading="lazy"
                                src="https://base.imgix.net/files/base/ebm/asumag/image/2019/04/asumag_8781_mit_logo.png?auto=format&fit=crop&h=432&w=768"
                                alt="IDEAS"
                                class="w-32 h-32 rounded-full shadow object-cover"
                            />
                            <div class="text-left ml-2">
                                <a
                                    href="http://news.mit.edu/2019/ideas-challenge-social-ventures-0430"
                                    target="_blank"
                                    class="text-xl"
                                >
                                    MIT IDEAS Grant Recipient
                                    <p class="text-sm">
                                        Click here for more information
                                    </p>
                                </a>
                            </div>
                        </div>

                        {/* TSAI */}
                        <div
                            class="flex flex-row-reverse lg:flex-row w-full lg:w-1/2 justify-end items-center mt-2"
                        >
                            <img
                                src="https://static1.squarespace.com/static/5a04b3bcedaed85148f6c11c/t/5a0c8cdc8165f525ba016a6a/1510771933144/logo.png?format=1500w"
                                alt="TSAI"
                                loading="lazy"
                                class="w-32 h-32 rounded-full shadow"
                            />
                            <div class="text-right mr-2">
                                <a
                                    class="text-xl"
                                    href="https://city.yale.edu/stories/2018/10/11/introducing-citys-fall-2018-accelerator-cohort"
                                    target="_blank"
                                >
                                    Yale TSAI CITY Accelerator
                                    <p class="text-sm">
                                        Click here for more information
                                    </p>
                                </a>
                            </div>
                        </div>
                    </div>


                </div>

            </main>
        </div>

    )
}



//           <div
//             v-for="member in team.slice(0, Math.floor(team.length / 2))"
//             :key="member.name"
//             class="flex justify-end my-2 flex-row odd:flex-row-reverse items-center"
//           >
//             <div class="text-left mx-2">
//               <h4 class="text-xl">
//                 {{ member.name }}
//               </h4>
//               <p class="text-gray">
//                 {{ member.about }}
//               </p>
//             </div>
//             <img
//               loading="lazy"
//               :src="getHeadshot(member.image)"
//               :alt="member.name"
//               class="w-32 h-32 rounded-full shadow"
//             />
//           </div>
//         </div>
//         <div class="w-full lg:w-1/2 lg:pl-8">
//           <div
//             v-for="member in team.slice(
//               Math.floor(team.length / 2),
//               team.length
//             )"
//             :key="member.name"
//             class="flex justify-end my-2 flex-row odd:flex-row-reverse items-center"
//           >
//             <div class="text-left mx-2">
//               <h4 class="text-xl">
//                 {{ member.name }}
//               </h4>
//               <p class="text-gray">
//                 {{ member.about }}
//               </p>
//             </div>
//             <img
//               loading="lazy"
//               :src="getHeadshot(member.image)"
//               :alt="member.name"
//               class="w-32 h-32 rounded-full shadow"
//             />






// export default {
//     name: "ViewAbout",
//     mounted() {
//         this.team = this.team.sort(() => Math.random() - 0.5);
//     },
//     data() {
//         return {
//             // All current team members
//             team: [

//             ],
//         };
//     },
//     methods: {
//         // Fetches the user's headshot
//         getHeadshot(file) {
//             var images = require.context("../assets/headshots", false, /\.jpg$/);
//             return images(`./${file}`);
//         },
//     },
//     head() {
//         const i18nSeo = this.$nuxtI18nSeo();

//         return {
//             title: "About",
//             titleTemplate: "%s | SciTeens",
//             htmlAttrs: [i18nSeo.htmlAttrs],
//             meta: [
//                 {
//                     hid: "description",
//                     name: "description",
//                     content: "Find out what we do, and what we're all about.",
//                 },
//                 {
//                     hid: "twitter:card",
//                     name: "twitter:card",
//                     content: "Find out what we do, and what we're all about.",
//                 },
//                 {
//                     hid: "twitter:title",
//                     name: "twitter:title",
//                     content: "About SciTeens",
//                 },
//                 {
//                     hid: "twitter:description",
//                     name: "twitter:description",
//                     content: "Find out what we do, and what we're all about.",
//                 },
//                 {
//                     hid: "twitter:image",
//                     name: "twitter:image",
//                     content: "https://sciteens.org/sciteens_logo_og.jpg",
//                 },
//                 {
//                     hid: "og:title",
//                     name: "og:title",
//                     content: "About SciTeens",
//                 },
//                 {
//                     hid: "og:description",
//                     name: "og:description",
//                     content: "Find out what we do, and what we're all about.",
//                 },
//                 {
//                     hid: "og:image",
//                     name: "og:image",
//                     content: "https://sciteens.org/sciteens_logo_og.jpg",
//                 },
//                 ...i18nSeo.meta,
//             ],
//             link: [
//                 { rel: "canonical", href: `https://sciteens.org/about` },
//                 ...i18nSeo.link,
//             ],
//         };
//     },
// };
