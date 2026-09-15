import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, Firestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyCzQZoO1WciNd7DMEGZPr3PKMQxVRQCwgI",
    authDomain: "yogheartmarket.firebaseapp.com",
    projectId: "yogheartmarket",
    storageBucket: "yogheartmarket.firebasestorage.app",
    messagingSenderId: "637528008243",
    appId: "1:637528008243:web:5c82ccd60c2cde11286546"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

let db: Firestore;
if (typeof window !== "undefined" && !getApps().length) {
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() })
    });
} else {
    db = getFirestore(app);
}

const storage = getStorage(app);

export { auth, db, storage };
