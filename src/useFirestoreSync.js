import { useCallback, useEffect, useRef, useState } from "react";
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
  // Account deletion/sign-out must stop *both* writes and the initial-document
  // recreation listener before deleting data. Track in-flight writes so pause
  // can drain them before the caller deletes the cloud document.
  const suspended = useRef(false);
  const unsubscribeRef = useRef(null);
  const saveTimerRef = useRef(null);
  const pendingWrites = useRef(new Set());
  const [syncEpoch, setSyncEpoch] = useState(0);
  const trackedWrite = useCallback((promise) => {
    pendingWrites.current.add(promise);
    promise.finally(() => pendingWrites.current.delete(promise)).catch(() => {});
    return promise;
  }, []);
  const pauseSync = useCallback(async ({ drain = true, timeoutMs = 8000 } = {}) => {
    suspended.current = true;
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    clearTimeout(saveTimerRef.current);
    if (!drain) return;
    // Let already-submitted writes settle before the caller deletes the cloud
    // document. Firestore applies one client's writes in order anyway, so the
    // timeout only bounds how long a slow connection can stall the UI.
    await Promise.race([
      Promise.allSettled([...pendingWrites.current]),
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ]);
  }, []);
  const resumeSync = useCallback(() => {
    suspended.current = false;
    setSyncEpoch((e) => e + 1);
  }, []);

  useEffect(() => {
    if (user) initialLocal.current = serializeState(state);
    // Capture local state once when the signed-in user changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  useEffect(() => {
    if (suspended.current) return;
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
        if (suspended.current) return;
        try {
          if (!snapshot.exists()) {
            const payload = initialLocal.current ?? serializeState(state);
            await trackedWrite(setDoc(docRef, { ...payload, updatedAt: serverTimestamp() }));
            if (suspended.current) return;
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
          // Keep skipSave = true here. setState(remote) above schedules a
          // re-render whose save effect must observe skipSave === true and
          // bail out. Resetting the flag is done inside the save effect's
          // early-return path so the remote-loaded state does not echo back
          // to Firestore and cause an infinite write loop.
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

    unsubscribeRef.current = unsubscribe;
    return () => {
      unsubscribe();
      if (unsubscribeRef.current === unsubscribe) unsubscribeRef.current = null;
    };
    // Snapshot listener is tied to the signed-in user only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, setState, syncEpoch]);

  useEffect(() => {
    if (suspended.current || !user || !db || !remoteLoaded.current) return;
    if (skipSave.current) {
      // A remote snapshot just populated local state; consume the guard so
      // this render's data isn't written back (which would re-trigger the
      // listener and cause an infinite echo-write loop). Subsequent local
      // edits will proceed to save normally.
      skipSave.current = false;
      return;
    }

    setSyncing(true);
    const timer = setTimeout(async () => {
      if (suspended.current) return;
      try {
        const docRef = doc(db, "users", user.uid, "data", "app");
        await trackedWrite(setDoc(
          docRef,
          { ...serializeState(state), updatedAt: serverTimestamp() },
          { merge: true }
        ));
        setSyncError("");
        setCloudActive(true);
      } catch (err) {
        setSyncError(err?.message || "Could not save to cloud");
        setCloudActive(false);
      } finally {
        setSyncing(false);
      }
    }, 600);

    saveTimerRef.current = timer;
    return () => clearTimeout(timer);
    // Debounced push of full app state while signed in.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid, state, syncEpoch]);

  return { syncing, syncError, cloudActive, pauseSync, resumeSync };
}
