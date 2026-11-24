import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  EmailAuthProvider,
  reauthenticateWithCredential,
  deleteUser,
} from "firebase/auth";
import { deleteDoc, doc } from "firebase/firestore";
import { auth, db, getFirebaseAuth, isFirebaseConfigured } from "./firebase.js";
import { AuthContext } from "./authContext.js";
import { deleteAccount as runDeleteAccount } from "./accountDeletion.js";

export function AuthProvider({ children }) {
  const firebaseEnabled = isFirebaseConfigured();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(firebaseEnabled);

  useEffect(() => {
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

  /**
   * Permanently delete the signed-in account and its cloud data.
   * Resolves { status: "deleted" | "needs-password" }; throws
   * AccountDeletionError with a user-facing message on failure.
   */
  const deleteAccount = ({ password, clearLocal } = {}) => {
    const current = getFirebaseAuth()?.currentUser;
    if (!current) return Promise.reject(new Error("Not signed in"));
    return runDeleteAccount({
      password,
      deps: {
        getAuthTime: async () => (await current.getIdTokenResult()).authTime,
        reauthenticate: (pw) =>
          reauthenticateWithCredential(current, EmailAuthProvider.credential(current.email, pw)),
        // Firestore rules already allow the owner to delete users/{uid}/data/app.
        deleteCloudData: () => (db ? deleteDoc(doc(db, "users", current.uid, "data", "app")) : Promise.resolve()),
        deleteAuthUser: () => deleteUser(current),
        clearLocal: () => clearLocal?.(),
      },
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        signup,
        logout,
        deleteAccount,
        firebaseEnabled,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
