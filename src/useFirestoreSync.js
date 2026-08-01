import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { getDb } from "./firebase.js";

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

export function useFirestoreSync(user, data, setters) {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const remoteLoaded = useRef(!user);
  const skipSave = useRef(true);
  const initialLocal = useRef(null);

  const { jobs, workday, homeAddress, homeCoords } = data;
  const { setJobs, setWorkday, setHomeAddress, setHomeCoords, restoreTimerState } = setters;

  useEffect(() => {
    if (user) {
      initialLocal.current = { jobs, workday, homeAddress, homeCoords };
    }
  }, [user?.uid]); // capture local data once per login

  useEffect(() => {
    const db = getDb();
    if (!user || !db) {
      remoteLoaded.current = true;
      skipSave.current = false;
      return;
    }

    remoteLoaded.current = false;
    skipSave.current = true;

    const docRef = doc(db, "users", user.uid, "data", "app");

    const unsubscribe = onSnapshot(
      docRef,
      async (snapshot) => {
        try {
          if (!snapshot.exists()) {
            const payload = initialLocal.current ?? { jobs, workday, homeAddress, homeCoords };
            await setDoc(docRef, {
              ...payload,
              updatedAt: serverTimestamp(),
            });
            remoteLoaded.current = true;
            skipSave.current = false;
            return;
          }

          const remote = snapshot.data();
          skipSave.current = true;
          if (Array.isArray(remote.jobs)) setJobs(remote.jobs);
          const remoteWorkday = remote.workday?.date === getTodayKey() ? remote.workday : null;
          setWorkday(remoteWorkday);
          if (remote.homeAddress != null) setHomeAddress(remote.homeAddress);
          if (remote.homeCoords !== undefined) setHomeCoords(remote.homeCoords);
          if (Array.isArray(remote.jobs)) restoreTimerState(remote.jobs);
          remoteLoaded.current = true;
          skipSave.current = false;
        } catch (err) {
          setSyncError(err?.message || "Cloud sync failed");
          remoteLoaded.current = true;
          skipSave.current = false;
        }
      },
      (err) => {
        setSyncError(err?.message || "Cloud sync failed");
        remoteLoaded.current = true;
        skipSave.current = false;
      }
    );

    return unsubscribe;
  }, [user?.uid, setJobs, setWorkday, setHomeAddress, setHomeCoords, restoreTimerState]);

  useEffect(() => {
    const db = getDb();
    if (!user || !db || !remoteLoaded.current) return;
    if (skipSave.current) return;

    setSyncing(true);
    const timer = setTimeout(async () => {
      try {
        const docRef = doc(db, "users", user.uid, "data", "app");
        await setDoc(
          docRef,
          { jobs, workday, homeAddress, homeCoords, updatedAt: serverTimestamp() },
          { merge: true }
        );
        setSyncError("");
      } catch (err) {
        setSyncError(err?.message || "Could not save to cloud");
      } finally {
        setSyncing(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [user?.uid, jobs, workday, homeAddress, homeCoords]);

  return { syncing, syncError };
}
