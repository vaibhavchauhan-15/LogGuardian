import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";

/**
 * Firebase web configuration.
 *
 * These values are public by design (Firebase web config is meant to ship to
 * the browser). We read them from NEXT_PUBLIC_* env vars when available and
 * fall back to the project's config so Google sign-in works out of the box.
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyAGA5wwKs_vmQhfun8tv9kvy4X3C83c3Os",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "loggaurdian.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "loggaurdian",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "loggaurdian.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "1065051959794",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:1065051959794:web:62dcd0ffcdfd601e5e7b6b",
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? "G-ERM7DEG89B",
};

/** Whether enough config is present for Firebase auth to function. */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain);

/** Returns the singleton Firebase app, initializing it on first use. */
export function getFirebaseApp(): FirebaseApp {
  return getApps().length ? getApp() : initializeApp(firebaseConfig);
}

/** Browser-side Firebase Auth instance. */
export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}
