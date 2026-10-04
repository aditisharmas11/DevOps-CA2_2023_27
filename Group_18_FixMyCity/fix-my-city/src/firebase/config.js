// src/firebase/config.js
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics } from "firebase/analytics";



// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyABVPuIRBRIcpivOJDYg4UWaZAeSEKBoCA",
  authDomain: "fix-my-city-4.firebaseapp.com",
  projectId: "fix-my-city-4",
  storageBucket: "fix-my-city-4.appspot.com",
  messagingSenderId: "265141189738",
  appId: "1:265141189738:web:a02ec72f8e31725fd89e13",
  measurementId: "G-MYCWM7MZNE"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);


// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;