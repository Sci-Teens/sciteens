// Initialize Cloud Firestore through Firebase
import { initializeApp } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FB_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FB_PROJECT_ID + ".firebaseapp.com",
    databaseURL: "https://" + process.env.NEXT_PUBLIC_FB_PROJECT_ID + ".firebaseio.com",
    projectId: process.env.NEXT_PUBLIC_FB_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FB_PROJECT_ID + ".appspot.com",
    messagingSenderId: process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID,
    appId: "1:" + process.env.NEXT_PUBLIC_FB_MESSAGING_SENDER_ID + ":web:" + process.env.NEXT_PUBLIC_FB_APP_ID,
    measurementId: process.env.NEXT_PUBLIC_FB_MEASUREMENT_ID
};

let app = null;

if (!firebase.apps.length) {
    app = initializeApp(firebaseConfig);

    if (process.env.NODE_ENV == 'production' && process.client === true) {
        const analytics = getAnalytics();
    }
    const db = getFirestore();
}