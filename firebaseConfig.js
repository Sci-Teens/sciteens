// Initialize Cloud Firestore through Firebase
import { initializeApp, getApps } from "firebase/app"
import { getFirestore } from "firebase/firestore"
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "@firebase/auth";
import { getStorage } from "@firebase/storage";

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

export default firebaseConfig

// console.log(getApps().length)
// let app = null;
// app = initializeApp(firebaseConfig);

// let a = null
// if (process.env.NODE_ENV == 'production' && process.browser === true) {
//     a = getAnalytics();
// }

// // export const auth = getAuth(app)
// // export const db = getFirestore(app)
// // export const storage = getStorage(app)
// // export const analytics = a

// export const auth = getAuth(app)
// export const db = getFirestore(app)
// export const storage = getStorage(app)