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
        },].sort(() => Math.random() - 0.5))

    return (
        <div>
            <main>

                <div className="text-left px-4 py-8 md:p-8 w-full lg:w-5/6 mx-auto">
                    <h1 className="text-3xl md:text-5xl text-center font-semibold my-4">
                        We're on a mission.
                    </h1>
                    <p className="text-base md:text-xl text-center mb-12 mx-0 lg:mx-24">
                        We strive to bridge the gap between education and opportunity, particularly for students from low-resource areas who do not have an extensive STEM support network.


                    </p>
                    {/* <div className="flex flex-col-reverse lg:flex-row items-center mb-8">
                        <p className="text-base lg:text-lg mb-4">
                            Inspired and driven by our curiosity towards the sciences, we participated in science fairs across South Florida throughout high school. With every competition, we met more of our remarkably bright and motivated peers from all backgrounds. They felt that doing research and competing in science fairs came with many barriers to entry, particularly as their schools lacked the necessary frameworks and guidance. This apparent unequal distribution of resources troubled us, so we came together and created SciTeens.
                        </p>
                        <img src={'./assets/beaker_purple.jpg'} className="rounded-full w-56 h-56 ml-4 object-cover mb-4 lg:mb-0" alt="" />

                    </div>
                    <div className="flex flex-col lg:flex-row items-center mb-16">
                        <img src={'./assets/student_laptop.jpg'} className="rounded-full w-56 h-56 mr-4 object-cover mb-4 lg:mb-0" alt="" />

                        <p className="text-base lg:text-lg mb-4 mr-4">
                            Our mission is to bridge the gap between education and opportunity—particularly for under-resourced students—by providing them with mentorship and community on our free online platform. We envision an educational environment where students from all backgrounds have equal access to the resources and network necessary to pursue careers in STEM.By helping students find niche STEM programs in their area to connect them to mentors who can remotely guide them through a project, we’re here to usher in a diverse generation of STEM leaders. We support projects and programs in almost every scientific field and seek to foster an inclusive and supportive virtual environment for learning and growth.
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
                                    className="text-sciteensGreen-regular font-bold"
                                >
                                    &nbsp;reach out&nbsp;
                                </a>
                                to us to let us know how we can do better.
                            </p>
                        </div>
                        <Link href="/signup">
                            <a className="bg-sciteensLightGreen-regular text-white text-lg text-center rounded-lg shadow-md p-4 ml-4 hover:bg-sciteensLightGreen-dark w-2/3 lg:w-1/3">
                                Sign Up Today
                            </a>
                        </Link>
                    </div> */}



                    {/* Profile Pics */}
                    <h2 className="text-2xl md:text-3xl mb-6 font-bold text-center">
                        Meet the Team
                    </h2>
                    <div className="w-full h-full inline-grid grid-cols-2 lg:grid-cols-3 place-items-center mb-8">
                        {
                            members.map((member) => {
                                return <div className="relative w-11/12 h-[90%] bg-white p-4 md:p-8 mb-6 rounded-lg shadow">
                                    <img
                                        loading="lazy"
                                        src={`assets/headshots/${member.image}`}
                                        alt={member.name}
                                        className="w-20 h-20 lg:w-28 lg:h-28 rounded-full shadow m-auto mb-4" />
                                    <p className="text-base md:text-2xl text-center font-semibold mb-2">{member.name}</p>
                                    <p className={`hidden md:block text-center text-gray-700
                                    ${member.name === "Aya Khalaf" || member.name === "Angelica Castillejos" ||
                                            member.name === "Tasman Rosenfeld" ? "text-sm" : "text-base"}`}>{member.about}</p>
                                </div>
                            })
                        }
                        {/* {
                                members.slice(0, Math.floor(members.length / 2)).map((member, index) => {
                                    return (
                                        <div key={member.name} className="flex justify-end my-2 flex-row odd:flex-row-reverse items-center">
                                            <div className="text-left mx-2">
                                                <h4 className="text-xl">
                                                    {member.name}
                                                </h4>
                                                <p className="text-gray">
                                                    {member.about}
                                                </p>
                                            </div>
                                            <img
                                                loading="lazy"
                                                src={`/assets/headshots/${member.image}`}
                                                alt={member.name}
                                                className="w-32 h-32 rounded-full shadow"
                                            />
                                        </div>
                                    )
                                })
                            } */}
                        {/* <div className="w-full lg:w-1/2 lg:pr-8">
                            {
                                members.slice(Math.floor(members.length / 2), members.length).map((member, index) => {
                                    return (
                                        <div key={member.name} className="flex justify-end my-2 flex-row odd:flex-row-reverse items-center">
                                            <div className="text-left mx-2">
                                                <h4 className="text-xl">
                                                    {member.name}
                                                </h4>
                                                <p className="text-gray">
                                                    {member.about}
                                                </p>
                                            </div>
                                            <img
                                                loading="lazy"
                                                src={`/assets/headshots/${member.image}`}
                                                alt={member.name}
                                                className="w-32 h-32 rounded-full shadow"
                                            />
                                        </div>
                                    )
                                })
                            }
                        </div> */}
                    </div>



                    {/* Sponsors */}
                    {/* IDEAS */}
                    <div className="flex flex-wrap w-full">
                        {/* <div className="flex w-full lg:w-1/2 justify-start mt-2 items-center">
                            <img
                                loading="lazy"
                                src="https://base.imgix.net/files/base/ebm/asumag/image/2019/04/asumag_8781_mit_logo.png?auto=format&fit=crop&h=432&w=768"
                                alt="IDEAS"
                                className="w-32 h-32 rounded-full shadow object-cover"
                            />
                            <div className="text-left ml-2">
                                <a
                                    href="http://news.mit.edu/2019/ideas-challenge-social-ventures-0430"
                                    target="_blank"
                                    className="text-xl"
                                >
                                    MIT IDEAS Grant Recipient
                                    <p className="text-sm">
                                        Click here for more information
                                    </p>
                                </a>
                            </div>
                        </div> */}

                        {/* TSAI */}
                        {/* <div
                            className="flex flex-row-reverse lg:flex-row w-full lg:w-1/2 justify-end items-center mt-2"
                        >
                            <img
                                src="https://static1.squarespace.com/static/5a04b3bcedaed85148f6c11c/t/5a0c8cdc8165f525ba016a6a/1510771933144/logo.png?format=1500w"
                                alt="TSAI"
                                loading="lazy"
                                className="w-32 h-32 rounded-full shadow"
                            />
                            <div className="text-right mr-2">
                                <a
                                    className="text-xl"
                                    href="https://city.yale.edu/stories/2018/10/11/introducing-citys-fall-2018-accelerator-cohort"
                                    target="_blank"
                                >
                                    Yale TSAI CITY Accelerator
                                    <p className="text-sm">
                                        Click here for more information
                                    </p>
                                </a>
                            </div>
                        </div> */}
                    </div>
                </div>
            </main >
        </div >

    )
}