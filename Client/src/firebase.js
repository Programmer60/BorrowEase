// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  getIdToken, 
  fetchSignInMethodsForEmail, 
  sendEmailVerification, 
  sendPasswordResetEmail,
  browserSessionPersistence,
  setPersistence 
} from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  // Fallback: Ensure to set these environment variables in your .env file
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// 🔒 CRITICAL: Set Firebase Auth to use SESSION persistence instead of LOCAL (IndexedDB)
// This ensures auth state expires when browser tab closes, matching our sessionStorage approach
setPersistence(auth, browserSessionPersistence)
  .then(() => {
    console.log('🔐 Firebase Auth persistence set to SESSION mode');
  })
  .catch((error) => {
    console.error('❌ Failed to set Firebase persistence:', error);
  });

const provider = new GoogleAuthProvider();

export { 
  auth, 
  provider, 
  signInWithPopup, 
  signOut, 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  getIdToken, 
  fetchSignInMethodsForEmail, 
  sendEmailVerification, 
  sendPasswordResetEmail,
  browserSessionPersistence,
  setPersistence 
};
