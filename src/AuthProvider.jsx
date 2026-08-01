import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { getFirebaseAuth, isFirebaseConfigured } from "./firebase.js";
import { AuthContext } from "./authContext.js";

export function AuthProvider({ children }) {
  const firebaseEnabled = isFirebaseConfigured();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(firebaseEnabled);

  useEffect(() => {
    const auth = getFirebaseAuth();
    if (!auth) return;
    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setLoading(false);
    });
  }, []);

  const login = (email, password) =>
    signInWithEmailAndPassword(getFirebaseAuth(), email, password);

  const signup = (email, password) =>
    createUserWithEmailAndPassword(getFirebaseAuth(), email, password);

  const logout = () => signOut(getFirebaseAuth());

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        firebaseEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
