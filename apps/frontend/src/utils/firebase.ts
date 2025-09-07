// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: "collaborative-canvas-82217.firebaseapp.com",
  projectId: "collaborative-canvas-82217",
  storageBucket: "collaborative-canvas-82217.firebasestorage.app",
  messagingSenderId: "670640091192",
  appId: "1:670640091192:web:ead7cc973d453ee4db76cd",
  measurementId: "G-SSYKDN5GSR"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
