// Import the functions you need from the SDKs you need
import { initializeApp, getApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = { // For Firebase JS SDK v7.20.0 and later, measurementId is optional
    apiKey: "AIzaSyCruZkmkjMrt8L4DtvSvOTIuCGchuADHnQ",
    authDomain: "jdeirrigation-9dd4b.firebaseapp.com",
    projectId: "jdeirrigation-9dd4b",
    storageBucket: "jdeirrigation-9dd4b.firebasestorage.app",
    messagingSenderId: "314231905579",
    appId: "1:314231905579:web:14b8156425ed5430c2396e"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Initialize Firebase Authentication and get a reference to the service
const auth = getAuth(app);

// Export the db and auth instances so you can use them in other files
export { db, auth, app };
