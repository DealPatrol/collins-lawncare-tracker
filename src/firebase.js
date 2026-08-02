import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, onValue } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Firebase config loaded from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Check if Firebase is configured
if (!firebaseConfig.apiKey) {
  console.warn("[v0] Firebase not configured. Copy .env.firebase.example to .env.local and add your credentials from firebase.google.com");
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const auth = getAuth(app);

// Sign in anonymously on load
let currentUser = null;
signInAnonymously(auth)
  .then(() => {
    currentUser = auth.currentUser;
    console.log("[v0] Anonymous user signed in:", currentUser.uid);
  })
  .catch(error => {
    console.error("[v0] Firebase auth error:", error);
  });

// Helper to get user data path
function getUserPath(collection) {
  if (!currentUser) return null;
  return `users/${currentUser.uid}/${collection}`;
}

// Complete app state sync functions
export const firebaseState = {
  save: async (state) => {
    try {
      const path = getUserPath('state');
      if (!path) return false;
      await set(ref(database, path), state);
      console.log("[v0] State saved to Firebase");
      return true;
    } catch (error) {
      console.error("[v0] Error saving state to Firebase:", error);
      return false;
    }
  },

  load: async () => {
    try {
      const path = getUserPath('state');
      if (!path) return null;
      const snapshot = await get(ref(database, path));
      return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
      console.error("[v0] Error loading state from Firebase:", error);
      return null;
    }
  },

  subscribe: (callback) => {
    try {
      const path = getUserPath('state');
      if (!path) return null;
      return onValue(ref(database, path), (snapshot) => {
        const data = snapshot.exists() ? snapshot.val() : null;
        if (data) callback(data);
      }, (error) => {
        console.error("[v0] Error subscribing to state:", error);
      });
    } catch (error) {
      console.error("[v0] Error setting up state subscription:", error);
      return null;
    }
  }
};

// Firebase status checker
export const isFirebaseReady = () => {
  return currentUser !== null;
};

export const getCurrentUserID = () => {
  return currentUser?.uid || null;
};
