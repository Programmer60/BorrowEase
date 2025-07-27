// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, RecaptchaVerifier, signInWithPhoneNumber } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBNXmiPeruNlwxUmToNMcKdhQjNWn8E7AU",
  authDomain: "borrowease-32c45.firebaseapp.com",
  projectId: "borrowease-32c45",
  storageBucket: "borrowease-32c45.firebasestorage.app",
  messagingSenderId: "701097219173",
  appId: "1:701097219173:web:727824abc0429cdacee28c",
  measurementId: "G-M1BHVY5HNC"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();

export { auth, provider, signInWithPopup, signOut, RecaptchaVerifier, signInWithPhoneNumber };
