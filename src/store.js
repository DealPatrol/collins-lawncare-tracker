import { getTodayKey } from "./utils.js";

// Single-key app state persisted to localStorage. Older releases stored
// jobs/workday/home under separate keys — migrate those on first load.

const STATE_KEY = "collins_lawncare_v2";
const LEGACY_JOBS_KEY = "collins_lawncare_jobs";
const LEGACY_DAY_KEY = "collins_workday";
const LEGACY_HOME_KEY = "collins_home";
const LEGACY_HOME_COORDS_KEY = "collins_home_coords";

export const EMPLOYEE_COLORS = ["#34d399", "#60a5fa", "#f59e0b", "#f472b6", "#a78bfa", "#22d3ee", "#fb923c", "#facc15"];

export const DEFAULT_SETTINGS = {
  homeAddress: "",
  homeCoords: null,
  geofenceRadius: 150, // meters
  autoStop: true,
  autoArriveDetect: true,
  weather: true,
};

function readJSON(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function migrateLegacy() {
  const jobs = readJSON(LEGACY_JOBS_KEY, []);
  const workday = readJSON(LEGACY_DAY_KEY, null);
  const homeAddress = localStorage.getItem(LEGACY_HOME_KEY) || "";
  const homeCoords = readJSON(LEGACY_HOME_COORDS_KEY, null);

  const workdays = {};
  if (workday?.date && workday?.start) {
    workdays[workday.date] = {
      unassigned: {
        start: workday.start,
        end: workday.end ?? null,
        startCoords: workday.startCoords ?? null,
        endCoords: workday.endCoords ?? null,
        stops: workday.stops || [],
        distanceMeters: 0,
      },
    };
  }

  return {
    version: 2,
    employees: [],
    activeEmployeeId: null,
    jobs: jobs.map((j) => ({ radius: null, ...j })),
    workdays,
    prospects: [],
    settings: { ...DEFAULT_SETTINGS, homeAddress, homeCoords },
  };
}

export function loadState() {
  const existing = readJSON(STATE_KEY, null);
  if (existing?.version === 2) {
    return {
      ...existing,
      settings: { ...DEFAULT_SETTINGS, ...existing.settings },
      employees: existing.employees || [],
      jobs: existing.jobs || [],
      workdays: existing.workdays || {},
      prospects: existing.prospects || [],
    };
  }
  return migrateLegacy();
}

export function saveState(state) {
  try {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
  } catch {
    // Storage may be full or unavailable; keep the app usable in memory.
  }
}

// ── Workday helpers ───────────────────────────────────────────
// workdays: { [dayKey]: { [employeeId]: { start, end, stops, distanceMeters, ... } } }

export function getWorkday(state, employeeId, dayKey = getTodayKey()) {
  if (!employeeId) return null;
  return state.workdays?.[dayKey]?.[employeeId] || null;
}

export function setWorkday(state, employeeId, day, dayKey = getTodayKey()) {
  return {
    ...state,
    workdays: {
      ...state.workdays,
      [dayKey]: { ...(state.workdays?.[dayKey] || {}), [employeeId]: day },
    },
  };
}

export function todaysCrewDays(state, dayKey = getTodayKey()) {
  return state.workdays?.[dayKey] || {};
}

// Keep only the trailing 90 days of workday history so storage stays small.
export function pruneWorkdays(workdays) {
  const keys = Object.keys(workdays || {}).sort();
  if (keys.length <= 90) return workdays;
  const keep = keys.slice(-90);
  const pruned = {};
  keep.forEach((k) => { pruned[k] = workdays[k]; });
  return pruned;
}

// ── Prospects (leads) ─────────────────────────────────────────
// prospect: { id, name, address, coords, targetMonthly, status, createdAt }
// status: "new" | "quoted" | "won" | "lost"

export function makeProspect(data) {
  return {
    id: `pros_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
    name: "",
    address: "",
    coords: null,
    targetMonthly: null,
    status: "new",
    createdAt: Date.now(),
    ...data,
  };
}

export function makeEmployee(name, role = "crew", existing = []) {
  return {
    id: `emp_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
    name: name.trim(),
    role, // "crew" | "manager"
    color: EMPLOYEE_COLORS[existing.length % EMPLOYEE_COLORS.length],
    createdAt: Date.now(),
  };
}

// ── Backup / restore ──────────────────────────────────────────

export function exportBackup(state) {
  return {
    version: 2,
    app: "collins-lawncare-tracker",
    exportedAt: new Date().toISOString(),
    ...state,
  };
}

export function parseBackup(raw) {
  const data = JSON.parse(raw);
  if (data.version === 2 && Array.isArray(data.jobs)) {
    return {
      version: 2,
      employees: data.employees || [],
      activeEmployeeId: data.activeEmployeeId ?? null,
      jobs: data.jobs,
      workdays: data.workdays || {},
      prospects: data.prospects || [],
      settings: { ...DEFAULT_SETTINGS, ...data.settings },
    };
  }
  // v1 backup from the previous release
  if (Array.isArray(data.jobs)) {
    const workdays = {};
    if (data.workday?.date && data.workday?.start) {
      workdays[data.workday.date] = {
        unassigned: { ...data.workday, stops: data.workday.stops || [], distanceMeters: 0 },
      };
    }
    return {
      version: 2,
      employees: [],
      activeEmployeeId: null,
      jobs: data.jobs.map((j) => ({ radius: null, ...j })),
      workdays,
      prospects: [],
      settings: {
        ...DEFAULT_SETTINGS,
        homeAddress: data.homeAddress || "",
        homeCoords: data.homeCoords || null,
      },
    };
  }
  throw new Error("Unrecognized backup format");
}
