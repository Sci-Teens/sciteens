import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image';
import { useRouter } from "next/router"
import { useFirestore } from 'reactfire';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, limit } from '@firebase/firestore';
import { useSpring, animated, config } from '@react-spring/web'

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

    // REACT SPRING ANIMATIONS
    const [animate, setAnimate] = useState(false)

    useEffect(() => {
        setAnimate(true)
    }, [])

    const about_spring = useSpring({ opacity: animate ? 1 : 0, transform: animate ? 'scale(1)' : 'scale(0)', delay: 200 })

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

                    {/* Profile Pics */}
                    <h2 className="text-2xl md:text-3xl mb-6 font-bold text-center">
                        Get to know us.
                    </h2>
                    <div className="w-full h-full inline-grid grid-cols-2 lg:grid-cols-3 place-items-center mb-8">
                        {
                            members.map((member) => {
                                return <animated.div style={about_spring} className="relative w-11/12 h-[90%] bg-white p-4 md:p-8 mb-6 rounded-lg shadow">
                                    <img
                                        loading="lazy"
                                        src={`assets/headshots/${member.image}`}
                                        alt={member.name}
                                        className="w-20 h-20 lg:w-28 lg:h-28 rounded-full shadow m-auto mb-4" />
                                    <p className="text-base md:text-2xl text-center font-semibold mb-2">{member.name}</p>
                                    <p className={`hidden md:block text-center text-gray-700
                                    ${member.name === "Aya Khalaf" || member.name === "Angelica Castillejos" ||
                                            member.name === "Tasman Rosenfeld" ? "text-sm" : "text-base"}`}>{member.about}</p>
                                </animated.div>
                            })
                        }
                    </div>
                </div>
            </main >
        </div >

    )
}