import Head from 'next/head'
import { useEffect, useState } from 'react'
import { serverSideTranslations } from 'next-i18next/serverSideTranslations'
import { useTranslation } from 'next-i18next'

export default function About() {
    const { t } = useTranslation('common')
    const [members, setMembers] = useState(
        [
            {
                name: 'Sri Kondapalli',
                image: 'sri.jpg',
                about: t('about.about_sri'),
                current: true,
            },
            {
                name: 'Rohan Bolle',
                image: 'rohan.jpg',
                about: t('about.about_rohan'),
                current: true,
            },
            {
                name: 'Aneesha Acharya',
                image: 'aneesha.jpg',
                about: t('about.about_aneesha'),
                current: false,
            },
            {
                name: 'Angelo Chen',
                image: 'angelo.jpg',
                about: t('about.about_angelo'),
                current: false,
            },
            {
                name: 'Sonica Prakash',
                image: 'sonica.jpg',
                about: t('about.about_sonica'),
                current: false,
            },
            {
                name: 'John Sutor',
                image: 'john.jpg',
                about: t('about.about_john'),
                current: false,
            },
            {
                name: 'Haley Gardner',
                image: 'haley.jpg',
                about:
                    'Haley is a member of five Dungeons & Dragons groups.',
                current: true,
            },
            {
                name: 'Carlos Mercado-Lara',
                image: 'carlos.jpg',
                about: t('about.about_carlos'),
                current: false,
            },
            {
                name: 'Erin Kang',
                image: 'erin.jpg',
                about: t('about.about_erin'),
                current: true,
            },
            {
                name: 'Grace Jiang',
                image: 'grace.jpg',
                about: t('about.about_grace'),
                current: true,
            },
            {
                name: 'Aarti Kalamangalam',
                image: 'aarti.jpg',
                about: t('about.about_aarti'),
                current: true,
            },
            {
                name: 'Iman Khalid',
                image: 'iman.jpg',
                about: t('about.about_iman'),
                current: true,
            },
            {
                name: 'Liane Xu',
                image: 'liane.jpg',
                about: t('about.about_liane'),
                current: false,
            },
            {
                name: 'Alae Belkhadir',
                image: 'alae.jpg',
                about: t('about.about_alae'),
                current: true,
            },
            {
                name: 'Sanjana Gade',
                image: 'sanjana.jpg',
                about: t('about.about_sanjana'),
                current: true,
            },
            {
                name: 'Joud Abdul Baki',
                image: 'joud.jpg',
                about: t('about.about_joud'),
                current: true,
            },
            {
                name: 'Philip Antonopoulos',
                image: 'philip.jpg',
                about: t('about.about_philip'),
                current: true,
            },
            {
                name: 'Srishti Swaminathan',
                image: 'srishti.jpg',
                about: t('about.about_srishti'),
                current: true,
            },
            {
                name: 'Grace Nyakarombo',
                image: 'grace2.jpg',
                about: t('about.about_grace2'),
                current: true,
            },
            {
                name: 'Tasman Rosenfeld',
                image: 'tasman.jpg',
                about: t('about.about_tasman'),
                current: false,
            },
            {
                name: "Luke Sutor",
                image: "luke.jpg",
                about: t("about.about_luke"),
                current: false
            },
            {
                name: "Hannah Scaglione",
                image: "hannah.jpg",
                about:
                    t("about.about_hannah"),
                current: false
            },
            {
                name: "Ohm Parikh ",
                image: "ohm.jpg",
                about: t("about.about_ohm"),
                current: false
            },
            {
                name: "Akash Patel",
                image: "akash.jpg",
                about: t("about.about_akash"),
                current: false
            },
            {
                name: "Eduard Shkulipa",
                image: "eduard.jpg",
                about: t("about.about_eduard"),
                current: false
            },
            {
                name: "Aya Khalaf",
                image: "aya.jpg",
                about:
                    t("about.about_aya"),
                current: false
            },
            {
                name: "Angelica Castillejos",
                image: "angelica.jpg",
                about:
                    t("about.about_angelica"),
                current: false
            },
            {
                name: "Ashley Pelton",
                image: "ashley.jpg",
                about:
                    t("about.about_ashley"),
                current: false
            },
        ]
    )

    useEffect(() => {
        // Randomize the order of the members
        let randomized_members = [...members]
        randomized_members.sort(() => Math.random() - 0.5)
        setMembers(randomized_members)
    }, [])

    // Intersection Observer Stuff
    useEffect(() => {
        const member_elements =
            document.querySelectorAll('.member')
        console.log(member_elements)

        const observor = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.remove('scale-0')
                        observor.unobserve(entry.target)
                    }
                })
            },
            {
                threshold: 0.85,
            }
        )

        member_elements.forEach((member) => {
            observor.observe(member)
        })
    }, [])

    return (
        <div>
            <Head>
                <title>About Us | SciTeens</title>
                <link rel="icon" href="/favicon.ico" />
                <meta
                    name="description"
                    content="SciTeens About Page"
                />
                <meta
                    name="keywords"
                    content="SciTeens, sciteens, science, teen science"
                />
                <meta property="og:type" content="website" />
                <meta
                    name="og:image"
                    content="/assets/sciteens_initials.jpg"
                />
            </Head>
            <main>
                <div className="mx-auto w-full px-4 py-8 text-left md:p-8 lg:w-5/6">
                    <h1 className="my-4 text-center text-3xl font-semibold md:text-5xl">
                        {t('about.on_a_mission')}
                    </h1>
                    <p className="mx-0 mb-12 text-center text-base md:text-xl lg:mx-24">
                        {t('about.we_strive')}
                    </p>

                    {/* Profile Pics */}
                    <h2 className="mb-6 text-center text-2xl font-bold md:text-3xl">
                        Current Members
                    </h2>
                    <div className="mb-8 inline-grid h-full w-full grid-cols-2 place-items-center lg:grid-cols-3">
                        {members.filter(m => m.current == true).map((member) => {
                            return (
                                <div
                                    key={member.name}
                                    className="member relative mb-6 h-[90%] w-11/12 scale-0 rounded-lg bg-white p-4 shadow transition-all duration-500 md:p-8"
                                >
                                    <img
                                        loading="lazy"
                                        src={`assets/headshots/${member.image}`}
                                        alt={member.name}
                                        className="m-auto mb-4 h-20 w-20 rounded-full shadow lg:h-28 lg:w-28"
                                    />
                                    <p className="mb-2 text-center text-base font-semibold md:text-2xl">
                                        {member.name}
                                    </p>
                                    <p
                                        className={`hidden text-center text-gray-700 md:block
                                    ${member.name ===
                                                'Angelica Castillejos' ||
                                                member.name ===
                                                'Tasman Rosenfeld'
                                                ? 'text-sm'
                                                : 'text-base'
                                            }`}
                                    >
                                        {member.about}
                                    </p>
                                </div>
                            )
                        })}
                    </div>

                    <h2 className="mb-6 text-center text-2xl font-bold md:text-3xl">
                        Previous Members
                    </h2>
                    <div className="mb-8 inline-grid h-full w-full grid-cols-2 place-items-center lg:grid-cols-3">
                        {members.filter(m => m.current == false).map((member) => {
                            return (
                                <div
                                    key={member.name}
                                    className="member relative mb-6 h-[90%] w-11/12 scale-0 rounded-lg bg-white p-4 shadow transition-all duration-500 md:p-8"
                                >
                                    <img
                                        loading="lazy"
                                        src={`assets/headshots/${member.image}`}
                                        alt={member.name}
                                        className="m-auto mb-4 h-20 w-20 rounded-full shadow lg:h-28 lg:w-28"
                                    />
                                    <p className="mb-2 text-center text-base font-semibold md:text-2xl">
                                        {member.name}
                                    </p>
                                    <p
                                        className={`hidden text-center text-gray-700 md:block
                                    ${member.name ===
                                                'Angelica Castillejos' ||
                                                member.name ===
                                                'Tasman Rosenfeld'
                                                ? 'text-sm'
                                                : 'text-base'
                                            }`}
                                    >
                                        {member.about}
                                    </p>
                                </div>
                            )
                        })}
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
