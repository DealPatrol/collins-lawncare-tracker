import { initializeApp } from "firebase/app";
import { Capacitor } from "@capacitor/core";
import { connectAuthEmulator, getAuth, indexedDBLocalPersistence, initializeAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || undefined,
};

export function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );
}

/** Initialized Firebase app, or null when env vars are missing. */
export const firebaseApp = isFirebaseConfigured() ? initializeApp(firebaseConfig) : null;

/**
 * Firebase Auth — used for email/password sign-in.
 * Inside the native iOS WebView, getAuth() tries to load the popup/redirect
 * helper iframe, which never resolves under capacitor://localhost and leaves
 * onAuthStateChanged hanging. initializeAuth with IndexedDB persistence and no
 * popup resolver is the supported setup for Capacitor.
 */
function createAuth(app) {
  if (!app) return null;
  if (Capacitor.isNativePlatform()) {
    return initializeAuth(app, { persistence: indexedDBLocalPersistence });
  }
  return getAuth(app);
}

export const auth = createAuth(firebaseApp);

/** Cloud Firestore — used for per-user data sync. */
export const db = firebaseApp ? getFirestore(firebaseApp) : null;

// Local testing only: VITE_USE_FIREBASE_EMULATORS=true points the app at
// `firebase emulators:start --only auth,firestore`. Never set in production.
if (firebaseApp && import.meta.env.VITE_USE_FIREBASE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
}

export function getFirebaseApp() {
  return firebaseApp;
}

export function getDb() {
  return db;
}

export function getFirebaseAuth() {
  return auth;
}
