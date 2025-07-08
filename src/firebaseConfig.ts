// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
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
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and get a reference to the service
const db = getFirestore(app);

// Export the db instance so you can use it in other files
export { db };