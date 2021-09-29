import { useAuthState } from 'react-firebase-hooks/auth'
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from '../firebaseConfig'
import { useEffect, useState } from 'react';
import { AppContext } from './context'

export function useProfileData() {
    const [user] = useAuthState(auth);
    const [profile, setProfile] = useState(AppContext);

    useEffect(() => {
        let unsubscribe;

        if (user) {
            const profileRef = doc(db, 'profiles', user.uid)
            unsubscribe = onSnapshot(profileRef, (doc) => {
                setProfile(doc.data())
            })
        }
        else {
            setProfile(null)
        }
        return unsubscribe
    }, [user])

    return { user, profile }
}