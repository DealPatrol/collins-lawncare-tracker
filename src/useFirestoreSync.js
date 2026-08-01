import { useEffect, useRef, useState } from "react";
import { doc, onSnapshot, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "./firebase.js";
import { DEFAULT_SETTINGS } from "./store.js";

function normalizeRemoteState(data) {
  if (!data || data.version !== 2) return null;
  return {
    version: 2,
    employees: data.employees || [],
    activeEmployeeId: data.activeEmployeeId ?? null,
    jobs: data.jobs || [],
    workdays: data.workdays || {},
    prospects: data.prospects || [],
    expenses: data.expenses || [],
    settings: { ...DEFAULT_SETTINGS, ...data.settings },
  };
}

/** Migrate a v1 cloud document (flat jobs/workday/home fields) into v2 state. */
function migrateLegacyRemote(data) {
  if (!Array.isArray(data?.jobs)) return null;
  const workdays = {};
  if (data.workday?.date && data.workday?.start) {
    workdays[data.workday.date] = {
      unassigned: {
        start: data.workday.start,
        end: data.workday.end ?? null,
        startCoords: data.workday.startCoords ?? null,
        endCoords: data.workday.endCoords ?? null,
        stops: data.workday.stops || [],
        distanceMeters: 0,
      },
    };
  }
  return {
    version: 2,
    employees: [],
    activeEmployeeId: null,
    jobs: data.jobs.map((j) => ({ radius: null, ...j })),
    workdays,
    prospects: [],
    expenses: [],
    settings: {
      ...DEFAULT_SETTINGS,
      homeAddress: data.homeAddress || "",
      homeCoords: data.homeCoords ?? null,
    },
  };
}

function parseRemote(data) {
  return normalizeRemoteState(data) ?? migrateLegacyRemote(data);
}

function serializeState(state) {
  return {
    version: state.version,
    employees: state.employees,
    activeEmployeeId: state.activeEmployeeId,
    jobs: state.jobs,
    workdays: state.workdays,
    prospects: state.prospects || [],
    expenses: state.expenses || [],
    settings: state.settings,
  };
}

/**
 * Syncs v2 app state to Firestore when signed in.
 * localStorage (via saveState in App.jsx) remains the offline fallback.
 */
export function useFirestoreSync(user, state, setState) {
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const [cloudActive, setCloudActive] = useState(false);
  const remoteLoaded = useRef(!user);
  const skipSave = useRef(true);
  const initialLocal = useRef(null);

  useEffect(() => {
    if (user) initialLocal.current = serializeState(state);
    // Capture local state once when the signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
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
            const payload = initialLocal.current ?? serializeState(state);
            await setDoc(docRef, { ...payload, updatedAt: serverTimestamp() });
            remoteLoaded.current = true;
            skipSave.current = false;
            setCloudActive(true);
            setSyncError("");
            return;
          }

          const remote = parseRemote(snapshot.data());
          skipSave.current = true;
          if (remote) setState(remote);
          remoteLoaded.current = true;
          skipSave.current = false;
          setCloudActive(true);
          setSyncError("");
        } catch (err) {
          setSyncError(err?.message || "Cloud sync failed");
          setCloudActive(false);
          remoteLoaded.current = true;
          skipSave.current = false;
        }
      },
      (err) => {
        setSyncError(err?.message || "Cloud sync failed");
        setCloudActive(false);
        remoteLoaded.current = true;
        skipSave.current = false;
      }
    );

    return unsubscribe;
    // Snapshot listener is tied to the signed-in user only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, setState]);

  useEffect(() => {
    if (!user || !db || !remoteLoaded.current) return;
    if (skipSave.current) return;

    setSyncing(true);
    const timer = setTimeout(async () => {
      try {
        const docRef = doc(db, "users", user.uid, "data", "app");
        await setDoc(
          docRef,
          { ...serializeState(state), updatedAt: serverTimestamp() },
          { merge: true }
        );
        setSyncError("");
        setCloudActive(true);
      } catch (err) {
        setSyncError(err?.message || "Could not save to cloud");
        setCloudActive(false);
      } finally {
        setSyncing(false);
      }
    }, 600);

    return () => clearTimeout(timer);
    // Debounced push of full app state while signed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, state]);

  return { syncing, syncError, cloudActive };
}
