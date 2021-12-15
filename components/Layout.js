import NavBar from "./NavBar";
import Footer from "./Footer";
import { useState, useEffect } from 'react'
import { getAuth } from 'firebase/auth'
import { getFirestore } from '@firebase/firestore';
import { getStorage } from '@firebase/storage';
import { AuthProvider, AnalyticsProvider, FirestoreProvider, StorageProvider, useFirebaseApp } from 'reactfire';
import { set } from "lodash";

import Banner from '../components/Banner'

export default function Layout({ children }) {
    const app = useFirebaseApp()
    const firestore = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app)

    const [visibleNav, setVisibleNav] = useState(true)

    useEffect(() => {
        // Functionality for showing/removing navbar based on scroll behavior
        let previousY = document.documentElement.scrollTop
        document.addEventListener('scroll', function () {
            let currentY = document.documentElement.scrollTop

            // If you're within 350px from the top of the page, the scrollbar is always visible
            if (currentY <= 350) {
                setVisibleNav(true)
                previousY = currentY
            } else {
                if (currentY - previousY >= 200) {
                    setVisibleNav(false)
                    previousY = currentY
                }
                if (previousY - currentY >= 200) {
                    setVisibleNav(true)
                    previousY = currentY
                }
            }
        })

        return () => {
            document.removeEventListener('scroll', function () { })
        };
    }, [])


    return (
        <AuthProvider sdk={auth}>
            <FirestoreProvider sdk={firestore}>
                <StorageProvider sdk={storage}>
                    <Banner></Banner>
                    <div className={`fixed z-50 w-full transform transition-transform duration-300 ${visibleNav ? "translate-y-0" : "-translate-y-32"}`}>
                        <NavBar />
                    </div>
                    <div className="pt-20">{children}</div>
                    <Footer />
                </StorageProvider>
            </FirestoreProvider>
        </AuthProvider >
    )
}