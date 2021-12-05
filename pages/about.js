import Head from 'next/head'
import Link from 'next/link'
import Image from 'next/image';
import { useRouter } from "next/router"
import { useFirestore } from 'reactfire';
import { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, limit } from '@firebase/firestore';
import { useSpring, animated, config } from '@react-spring/web'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';

export default function About() {
    const { t } = useTranslation('common')
    const [members, setMembers] = useState([
        {
            name: "Sri Kondapalli",
            image: "sri.jpg",
            about: t("about.about_sri")
        },
        {
            name: "Rohan Bolle",
            image: "rohan.jpg",
            about:
                t("about.about_rohan")
        },
        {
            name: "Aneesha Acharya",
            image: "aneesha.jpg",
            about:
                t("about.about_aneesha")
        },
        {
            name: "Eduard Shkulipa",
            image: "eduard.jpg",
            about: t("about.about_eduard")
        },
        {
            name: "Angelo Chen",
            image: "angelo.jpg",
            about: t("about.about_angelo")
        },
        {
            name: "Aya Khalaf",
            image: "aya.jpg",
            about:
                t("about.about_aya")
        },
        {
            name: "Sonica Prakash",
            image: "sonica.jpg",
            about: t("about.about_sonica")
        },
        {
            name: "Angelica Castillejos",
            image: "angelica.jpg",
            about:
                t("about.about_angelica")
        },
        {
            name: "John Sutor",
            image: "john.jpg",
            about:
                t("about.about_john")
        },
        {
            name: "Shang Chen",
            image: "shang.jpg",
            about:
                t("about.about_shang")
        },
        {
            name: "Akash Patel",
            image: "akash.jpg",
            about: t("about.about_akash")
        },
        {
            name: "Carlos Mercado-Lara",
            image: "carlos.jpg",
            about: t("about.about_carlos")
        },
        {
            name: "Erin Kang",
            image: "erin.jpg",
            about: t("about.about_erin")
        },
        {
            name: "Grace Jiang",
            image: "grace.jpg",
            about:
                t("about.about_grace")
        },
        {
            name: "Aarti Kalamangalam",
            image: "aarti.jpg",
            about: t("about.about_aarti")
        },
        {
            name: "Iman Khalid",
            image: "iman.jpg",
            about:
                t("about.about_iman")
        },
        {
            name: "Hannah Scaglione",
            image: "hannah.jpg",
            about:
                t("about.about_hannah")
        },
        {
            name: "Liane Xu",
            image: "liane.jpg",
            about:
                t("about.about_liane")
        },
        {
            name: "Ashley Pelton",
            image: "ashley.jpg",
            about:
                t("about.about_ashley")
        },
        {
            name: "Ohm Parikh ",
            image: "ohm.jpg",
            about: t("about.about_ohm")
        },
        {
            name: "Tasman Rosenfeld",
            image: "tasman.jpg",
            about:
                t("about.about_tasman")
        },].sort(() => Math.random() - 0.5))

    // REACT SPRING ANIMATIONS
    const about_spring = useSpring({
        transform: 'scale(1)',
        from: {
            transform: 'scale(0)'
        },
        config: config.stiff,
        delay: 100
    })

    return (
        <div>
            <Head>
                <title>About Us | SciTeens</title>
                <link rel="icon" href="/favicon.ico" />
                <meta name="description" content="SciTeens About Page" />
                <meta name="keywords" content="SciTeens, sciteens, science, teen science" />
            </Head>
            <main>
                <div className="text-left px-4 py-8 md:p-8 w-full lg:w-5/6 mx-auto">
                    <h1 className="text-3xl md:text-5xl text-center font-semibold my-4">
                        {t('about.on_a_mission')}
                    </h1>
                    <p className="text-base md:text-xl text-center mb-12 mx-0 lg:mx-24">
                        {t('about.we_strive')}
                    </p>

                    {/* Profile Pics */}
                    <h2 className="text-2xl md:text-3xl mb-6 font-bold text-center">
                        {t('about.get_to_know_us')}
                    </h2>
                    <div className="w-full h-full inline-grid grid-cols-2 lg:grid-cols-3 place-items-center mb-8">
                        {
                            members.map((member) => {
                                return <animated.div style={about_spring} key={member.name} className="relative w-11/12 h-[90%] bg-white p-4 md:p-8 mb-6 rounded-lg shadow">
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

export async function getServerSideProps({ locale }) {
    return {
        props: {
            ...(await serverSideTranslations(locale, ['common'])),
            // Will be passed to the page component as props
        },
    };
}