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

    return (
        <AuthProvider sdk={auth}>
            <FirestoreProvider sdk={firestore}>
                <StorageProvider sdk={storage}>
                    <div className="fixed z-50 w-full">
                        <NavBar />
                    </div>
                    <div className="pt-20">{children}</div>
                    <Footer />
                </StorageProvider>
            </FirestoreProvider>
        </AuthProvider >
    )
}