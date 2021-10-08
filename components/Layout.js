import NavBar from "./NavBar";
import Footer from "./Footer";
import { getAuth } from 'firebase/auth'
import { getFirestore } from '@firebase/firestore';
import { getStorage } from '@firebase/storage';
import { AuthProvider, AnalyticsProvider, FirestoreProvider, StorageProvider, useFirebaseApp } from 'reactfire';

export default function Layout({ children }) {
    const app = useFirebaseApp()
    const firestore = getFirestore(app);
    const auth = getAuth(app);
    const storage = getStorage(app)

    return (
        <AuthProvider sdk={auth}>
            <FirestoreProvider sdk={firestore}>
                <StorageProvider sdk={storage}>
                    <html className="w-full h-full font-sciteens bg-backgroundGreen">
                        <NavBar></NavBar>
                        <div className="min-h-screen">{children}</div>
                        <Footer></Footer>
                    </html>
                </StorageProvider>
            </FirestoreProvider>
        </AuthProvider>
    )
}