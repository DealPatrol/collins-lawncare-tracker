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
  bizPhone: "", // callback number merged into outreach messages
  regridToken: "", // parcel-records API key that powers the Prospector
  mileageRate: 0.7, // $/mile for the mileage export — IRS rate changes yearly
  notifyWebhookUrl: "", // fires when a job's timer stops, if the job opts in
  notifyMessageTemplate: "Hey {customer}, {crew} from Collins Lawncare just finished up at {job}. Thanks for choosing us!",
  anthropicApiKey: "", // powers AI satellite yard quoting on Prospector leads
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
    expenses: [],
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
      expenses: existing.expenses || [],
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
// prospect: { id, name, address, coords, targetMonthly, status, createdAt,
//   owner, phone, email, value, mailAddress, source, lastContactedAt,
//   aiEstimate }
// status: "new" | "quoted" | "won" | "lost"
// owner/value/mailAddress come from public county parcel records when the
// lead was found by the Prospector; phone/email are only ever user-entered.
// aiEstimate (optional): { sizeBucket, estimatedSqFt, complexity, obstacles,
//   confidence, notes, imageUrl, priceLow, priceHigh, estimatedAt } from the
//   satellite quoting tool — see quoting.js.

export function makeProspect(data) {
  return {
    id: `pros_${Date.now()}_${Math.floor(Math.random() * 1e4)}`,
    name: "",
    address: "",
    coords: null,
    targetMonthly: null,
    status: "new",
    createdAt: Date.now(),
    owner: "",
    phone: "",
    email: "",
    value: null,
    mailAddress: "",
    source: "manual", // "manual" | "parcel"
    lastContactedAt: null,
    aiEstimate: null,
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
      expenses: data.expenses || [],
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
      expenses: [],
      settings: {
        ...DEFAULT_SETTINGS,
        homeAddress: data.homeAddress || "",
        homeCoords: data.homeCoords || null,
      },
    };
  }
  throw new Error("Unrecognized backup format");
}

// ── Crew invites ──────────────────────────────────────────────
// A compact, shareable stand-in for real cross-device sync: one crew member
// generates a code from their current jobs + roster, another pastes it in
// and gets those merged onto their phone. Each phone still tracks its own
// time after that — there's no live sharing — but everyone starts from the
// same job list, and employee ids stay consistent for when real sync lands.

function jobKey(job) {
  return `${(job.name || "").trim().toLowerCase()}|${(job.address || "").trim().toLowerCase()}`;
}

export function buildCrewInvite(state) {
  return {
    kind: "crew-invite",
    version: 1,
    exportedAt: new Date().toISOString(),
    employees: state.employees.map(({ id, name, role, color }) => ({ id, name, role, color })),
    jobs: state.jobs.map((j) => ({
      id: j.id,
      name: j.name,
      address: j.address || "",
      coords: j.coords || null,
      pay: j.pay ?? 0,
      billing: j.billing || "visit",
      monthlyRate: j.monthlyRate ?? null,
      radius: j.radius ?? null,
    })),
  };
}

// btoa/atob only handle Latin1, so UTF-8 text (names with accents, etc.)
// needs escaping through both ends of the round trip.
export function encodeCrewInvite(state) {
  const json = JSON.stringify(buildCrewInvite(state));
  return btoa(unescape(encodeURIComponent(json)));
}

export function decodeCrewInvite(code) {
  let data;
  try {
    data = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
  } catch {
    throw new Error("That doesn't look like a valid invite code.");
  }
  if (data?.kind !== "crew-invite" || !Array.isArray(data.jobs) || !Array.isArray(data.employees)) {
    throw new Error("That doesn't look like a valid invite code.");
  }
  return data;
}

// Merges an invite into local state without touching anything already here —
// skips employees/jobs that match by id or by name (+address, for jobs).
export function applyCrewInvite(state, invite) {
  const existingEmpIds = new Set(state.employees.map((e) => e.id));
  const existingEmpNames = new Set(state.employees.map((e) => e.name.trim().toLowerCase()));
  const newEmployees = invite.employees.filter(
    (e) => !existingEmpIds.has(e.id) && !existingEmpNames.has((e.name || "").trim().toLowerCase())
  );

  const existingJobIds = new Set(state.jobs.map((j) => j.id));
  const existingJobKeys = new Set(state.jobs.map(jobKey));
  const newJobs = invite.jobs
    .filter((j) => !existingJobIds.has(j.id) && !existingJobKeys.has(jobKey(j)))
    .map((j) => ({ ...j, sessions: [], weeklyMows: {} }));

  return {
    state: {
      ...state,
      employees: [...state.employees, ...newEmployees],
      jobs: [...state.jobs, ...newJobs],
    },
    addedEmployees: newEmployees.length,
    addedJobs: newJobs.length,
  };
}
