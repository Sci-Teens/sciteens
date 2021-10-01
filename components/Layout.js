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
                    <html className="w-full h-full font-sciteens">
                        <link href="https://fonts.googleapis.com/css2?family=Nunito:ital,wght@0,200;0,300;0,400;0,600;0,700;0,800;0,900;1,200;1,300;1,400;1,600;1,700;1,800;1,900&display=swap" rel="stylesheet" />
                        <NavBar></NavBar>
                        <div>{children}</div>
                        <Footer></Footer>
                    </html>
                </StorageProvider>
            </FirestoreProvider>
        </AuthProvider>
    )
}