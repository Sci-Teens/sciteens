import NavBar from "./NavBar";
import Footer from "./Footer";
import { useState, useEffect } from 'react'
import { getAuth } from 'firebase/auth'
import { getFirestore } from '@firebase/firestore';
import { getStorage } from '@firebase/storage';
import { AuthProvider, AnalyticsProvider, FirestoreProvider, StorageProvider, useFirebaseApp } from 'reactfire';
import { set } from "lodash";

export default function Layout({ children }) {
    const app = useFirebaseApp()
    const firestore = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app)

    // Functionality for showing/removing navbar based on scroll behavior
    const [visibleNav, setVisibleNav] = useState(true)

    useEffect(() => {
        let previousY = document.documentElement.scrollTop
        document.addEventListener('scroll', function () {
            let currentY = document.documentElement.scrollTop
            if (currentY - previousY >= 200) {
                setVisibleNav(false)
                previousY = currentY
            }
            if (previousY - currentY >= 200) {
                setVisibleNav(true)
                previousY = currentY
            }
        })
        return () => {
            document.removeEventListener('scroll', function () { })
        }
    }, [])

    return (
        <AuthProvider sdk={auth}>
            <FirestoreProvider sdk={firestore}>
                <StorageProvider sdk={storage}>
                    <html className="w-full h-full font-sciteens bg-backgroundGreen">
                        <div className={`fixed z-50 w-full transition-transform duration-300 transform 
                        ${visibleNav ? "translate-y-0" : "-translate-y-32"}`}>
                            <NavBar />
                        </div>
                        <div className="min-h-screen">{children}</div>
                        <Footer />
                    </html>
                </StorageProvider>
            </FirestoreProvider>
        </AuthProvider>
    )
}