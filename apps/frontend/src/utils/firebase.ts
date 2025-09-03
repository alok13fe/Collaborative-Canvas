// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "excalidraw-clone.firebaseapp.com",
  projectId: "excalidraw-clone",
  storageBucket: "excalidraw-clone.firebasestorage.app",
  messagingSenderId: "931334796925",
  appId: "1:931334796925:web:db737057e654c4d65ba314",
  measurementId: "G-L7WWZV821D"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
