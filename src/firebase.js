import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set, get, update, remove, onValue } from 'firebase/database';
import { getAuth, signInAnonymously } from 'firebase/auth';

// Replace these with your Firebase config from console.firebase.google.com
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

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
