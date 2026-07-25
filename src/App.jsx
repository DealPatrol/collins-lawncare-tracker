import { useCallback, useEffect, useRef, useState } from "react";
import {
  loadState, saveState, getWorkday, setWorkday, pruneWorkdays, makeEmployee, makeProspect,
  encodeCrewInvite, decodeCrewInvite, applyCrewInvite,
} from "./store.js";
import { makeExpense } from "./reports.js";
import { buildCompletionMessage, sendCompletionWebhook } from "./notify.js";
import { getTodayKey, getWeekKey } from "./utils.js";
import { getCurrentCoords } from "./location.js";

const STORAGE_KEY = "collins_lawncare_jobs";
const DAY_KEY = "collins_workday";
const HOME_KEY = "collins_home";
const HOME_COORDS_KEY = "collins_home_coords";
const CREW_NAME_KEY = "collins_crew_name";
const ONBOARDED_KEY = "collins_onboarded";
const CREW_KEY = "collins_crew_members";
const DEFAULT_CENTER = { lat: 34.0632, lng: -86.7686 };

function loadCrew() {
  try { return JSON.parse(localStorage.getItem(CREW_KEY)) || []; } catch { return []; }
}

function saveCrew(crew) {
  localStorage.setItem(CREW_KEY, JSON.stringify(crew));
}

function getWeekKey(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function formatDuration(seconds) {
  if (!seconds) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

function formatTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatMoney(val) {
  return `$${parseFloat(val || 0).toFixed(2)}`;
}

function getRateColor(rate) {
  if (rate >= 60) return "#4ade80";
  if (rate >= 40) return "#facc15";
  return "#f87171";
}

function getPriorityColor(priority) {
  if (priority === "high") return "#f87171";
  if (priority === "medium") return "#facc15";
  return "#60a5fa";
}

function getPriorityLabel(priority) {
  const labels = { high: "🔴 High", medium: "🟡 Medium", low: "🔵 Low" };
  return labels[priority] || "🟡 Medium";
}

function loadJobs() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); }
  catch { return []; }
}

function getRunningJob(jobs) {
  return jobs.find(j => j.currentSessionStart) || null;
}

function loadWorkday() {
  try {
    const wd = JSON.parse(localStorage.getItem(DAY_KEY) || "null");
    if (wd && wd.date !== getTodayKey()) return null;
    return wd;
  }
  catch { return null; }
}

function jobRouteLocation(job) {
  if (job.address) return job.address;
  if (job.coords) return `${job.coords.lat},${job.coords.lng}`;
  return null;
}

function buildMapBounds(jobs, homeCoords) {
  const coords = [];
  if (homeCoords) coords.push(homeCoords);
  jobs.forEach(j => { if (j.coords) coords.push(j.coords); });
  if (!coords.length) return null;
  const lats = coords.map(c => c.lat);
  const lngs = coords.map(c => c.lng);
  const padding = 0.02;
  return {
    centerLat: lats.reduce((a, b) => a + b, 0) / lats.length,
    centerLng: lngs.reduce((a, b) => a + b, 0) / lngs.length,
    minLat: Math.min(...lats) - padding,
    maxLat: Math.max(...lats) + padding,
    minLng: Math.min(...lngs) - padding,
    maxLng: Math.max(...lngs) + padding,
    markerCount: coords.length,
  };
}

export default function LawncareTracker() {
  const [jobs, setJobs] = useState(loadJobs);

  const [workday, setWorkday] = useState(loadWorkday);

  const [hasOnboarded, setHasOnboarded] = useState(() => {
    return localStorage.getItem(ONBOARDED_KEY) === "true";
  });
  const [crewName, setCrewName] = useState(() => {
    return localStorage.getItem(CREW_NAME_KEY) || "";
  });
  const [onboardingCrewName, setOnboardingCrewName] = useState("");

  const [view, setView] = useState("dashboard"); // dashboard | add | detail | route | settings | priority | analytics | invoice | crew | billing | clientPortal | reports
  const [selectedJob, setSelectedJob] = useState(null);
  const [crew, setCrew] = useState(loadCrew);
  const [routeOrder, setRouteOrder] = useState([]);
  const [businessInfo, setBusinessInfo] = useState({ name: "Collins Lawncare", phone: "", address: "" });
  const [crewFormName, setCrewFormName] = useState("");
  const [crewFormRole, setCrewFormRole] = useState("Worker");
  const [gpsLocations, setGpsLocations] = useState([]);
  const [subscription, setSubscription] = useState({ plan: "free", status: "active", startDate: new Date().toLocaleDateString(), payments: [] });
  const runningOnLoad = getRunningJob(loadJobs());
  const [activeTimer, setActiveTimer] = useState(runningOnLoad?.id ?? null);
  const [timerStart, setTimerStart] = useState(runningOnLoad?.currentSessionStart ?? null);
  const [elapsed, setElapsed] = useState(() => {
    if (!runningOnLoad?.currentSessionStart) return 0;
    return Math.floor((Date.now() - runningOnLoad.currentSessionStart) / 1000);
  });
  const [dayElapsed, setDayElapsed] = useState(() => {
    const wd = loadWorkday();
    if (!wd?.start) return 0;
    const end = wd.end ?? Date.now();
    return Math.floor((end - wd.start) / 1000);
  });
  const [locStatus, setLocStatus] = useState(() => {
    const loc = runningOnLoad?.currentSessionLoc;
    return loc ? `📍 ${loc.lat.toFixed(4)}, ${loc.lng.toFixed(4)}` : "";
  });
  const importInputRef = useRef(null);

  const [form, setForm] = useState({ name: "", address: "", pay: "", notes: "", lat: "", lng: "", priority: "medium", clientName: "", clientPhone: "" });
  const [editingId, setEditingId] = useState(null);
  const [homeAddress, setHomeAddress] = useState(() => localStorage.getItem(HOME_KEY) || "");
  const [homeCoords, setHomeCoords] = useState(() => {
    try { return JSON.parse(localStorage.getItem(HOME_COORDS_KEY) || "null"); }
    catch { return null; }
  });
  const [geoError, setGeoError] = useState("");

  // Persist jobs
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
  }, [jobs]);

  // Persist workday
  useEffect(() => {
    localStorage.setItem(DAY_KEY, JSON.stringify(workday));
  }, [workday]);

  // Persist crew name
  useEffect(() => {
    if (crewName) {
      localStorage.setItem(CREW_NAME_KEY, crewName);
    }
  }, [crewName]);

  // Persist crew members
  useEffect(() => {
    saveCrew(crew);
  }, [crew]);


  useEffect(() => {
    if (!activeTimer || !timerStart) return;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - timerStart) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [activeTimer, timerStart]);

  useEffect(() => {
    if (!workday?.start || workday?.end) return;
    const id = setInterval(() => {
      setDayElapsed(Math.floor((Date.now() - workday.start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [workday?.start, workday?.end]);

  const saveJobs = (updated) => setJobs(updated);

  // ── WORKDAY CONTROLS ──
import { useGpsTracking } from "./useGpsTracking.js";
import { IconHome, IconLeaf, IconMap, IconUsers, IconGear } from "./icons.jsx";
import TodayView from "./views/TodayView.jsx";
import JobsView from "./views/JobsView.jsx";
import JobDetail from "./views/JobDetail.jsx";
import JobForm from "./views/JobForm.jsx";
import RouteView from "./views/RouteView.jsx";
import CrewView from "./views/CrewView.jsx";
import SettingsView from "./views/SettingsView.jsx";
import Onboarding from "./views/Onboarding.jsx";

const TABS = [
  { id: "today", label: "Today", Icon: IconHome },
  { id: "jobs", label: "Jobs", Icon: IconLeaf },
  { id: "route", label: "Route", Icon: IconMap },
  { id: "crew", label: "Crew", Icon: IconUsers },
  { id: "settings", label: "Settings", Icon: IconGear },
];

export default function App() {
  const [state, setState] = useState(loadState);
  const [tab, setTab] = useState("today");
  // subview: null | { kind: "detail", jobId } | { kind: "form", jobId? }
  const [subview, setSubview] = useState(null);
  const [toast, setToast] = useState(null); // { text, tone }
  const [now, setNow] = useState(0); // shared wall clock, ticks while anything runs

  useEffect(() => saveState(state), [state]);

  const me = state.employees.find((e) => e.id === state.activeEmployeeId) || null;
  const meId = me?.id;
  const todayKey = getTodayKey();
  const myDay = getWorkday(state, meId, todayKey);
  const workdayRunning = !!(myDay?.start && !myDay?.end);

  const activeJob =
    state.jobs.find((j) => j.currentSessionStart && (!j.currentSessionEmployeeId || j.currentSessionEmployeeId === meId)) || null;

  // Shared clock: 1s ticks while a timer/workday runs, lazy otherwise.
  useEffect(() => {
    const active = !!activeJob || workdayRunning;
    const kickoff = setTimeout(() => setNow(Date.now()), 0);
    const id = setInterval(() => setNow(Date.now()), active ? 1000 : 30000);
    return () => { clearTimeout(kickoff); clearInterval(id); };
  }, [activeJob, workdayRunning]);

  const showToast = useCallback((text, tone = "green") => {
    setToast({ text, tone });
    setTimeout(() => setToast((t) => (t?.text === text ? null : t)), 4500);
  }, []);

  // ── Workday ──
  const startWorkday = async () => {
    let coords = null;
    try { coords = await getCurrentCoords(); } catch { /* GPS optional to start the day */ }
    setState((s) =>
      setWorkday(s, meId, {
        start: Date.now(), end: null, startCoords: coords, endCoords: null,
        stops: [], distanceMeters: 0,
      })
    );
  };

  const endWorkday = async () => {
    let coords = null;
    try { coords = await getCurrentCoords(); } catch { /* GPS optional to end the day */ }
    setState((s) => {
      const day = getWorkday(s, meId);
      if (!day) return s;
      const next = setWorkday(s, meId, { ...day, end: Date.now(), endCoords: coords });
      return { ...next, workdays: pruneWorkdays(next.workdays) };
    });
  };

  // ── Jobs ──
  const upsertJob = (jobData, jobId) => {
    setState((s) => {
      if (jobId) {
        return { ...s, jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, ...jobData } : j)) };
      }
      const newJob = {
        id: Date.now().toString(),
        sessions: [], weeklyMows: {}, radius: null,
        ...jobData,
      };
      return { ...s, jobs: [...s.jobs, newJob] };
    });
    setSubview(jobId ? { kind: "detail", jobId } : null);
  };

  // ── CREW MANAGEMENT ──
  const addCrewMember = () => {
    if (!crewFormName.trim()) return;
    const newMember = {
      id: Date.now().toString(),
      name: crewFormName.trim(),
      role: crewFormRole,
      addedDate: new Date().toLocaleDateString(),
      totalEarnings: 0,
      totalHours: 0,
      jobsCompleted: 0,
    };
    setCrew([...crew, newMember]);
    setCrewFormName("");
    setCrewFormRole("Worker");
  };

  const deleteCrewMember = (crewId) => {
    setCrew(crew.filter(c => c.id !== crewId));
  };

  const captureGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        const { latitude, longitude, accuracy } = pos.coords;
        const newLocation = {
          id: Date.now().toString(),
          lat: latitude,
          lng: longitude,
          accuracy,
          time: new Date().toLocaleTimeString(),
          date: new Date().toLocaleDateString(),
          jobId: activeTimer,
        };
        setGpsLocations([...gpsLocations, newLocation]);
      });
    }
  };

  // ── STRIPE SUBSCRIPTION ──
  const upgradeSubscription = (plan) => {
    const planPrices = { pro: 49, business: 99, enterprise: 199 };
    const price = planPrices[plan] || 0;
    
    setSubscription({
      plan,
      status: "active",
      startDate: new Date().toLocaleDateString(),
      payments: [...subscription.payments, {
        id: Date.now().toString(),
        plan,
        amount: price,
        date: new Date().toLocaleDateString(),
        status: "completed"
      }]
    });
  };

  // ── EXPORT & ANALYTICS ──
  const exportToCSV = () => {
    const headers = ["Job Name", "Client", "Sessions", "Revenue", "Hours", "Rate"];
    const data = jobs.map(j => {
      const sessions = j.sessions || [];
      const revenue = sessions.reduce((s, sess) => s + (sess.pay || 0), 0);
      const hours = sessions.reduce((s, sess) => s + (sess.duration || 0), 0) / 3600;
      const rate = hours > 0 ? revenue / hours : 0;
      return [j.name, j.clientName || "", sessions.length, revenue.toFixed(2), hours.toFixed(1), rate.toFixed(0)];
    });

    const csv = [headers, ...data].map(row => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `collins-lawncare-${new Date().toLocaleDateString()}.csv`;
    link.click();
  };

  // ── JOB CRUD ──
  const addJob = () => {
    if (!form.name || !form.pay) return;
    const coords = form.lat && form.lng ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) } : null;
    const newJob = {
      id: Date.now().toString(),
      name: form.name, address: form.address, pay: parseFloat(form.pay),
      notes: form.notes, coords, priority: form.priority || "medium", clientName: form.clientName || "", clientPhone: form.clientPhone || "",
      sessions: [], weeklyMows: {}, photos: [], completionNotes: "",
    };
    saveJobs([...jobs, newJob]);
    setForm({ name: "", address: "", pay: "", notes: "", lat: "", lng: "", priority: "medium", clientName: "", clientPhone: "" });
    setView("dashboard");
  };

  const updateJob = () => {
    if (!form.name || !form.pay) return;
    const coords = form.lat && form.lng ? { lat: parseFloat(form.lat), lng: parseFloat(form.lng) } : null;
    saveJobs(jobs.map(j => j.id === editingId
      ? { ...j, name: form.name, address: form.address, pay: parseFloat(form.pay), notes: form.notes, coords: coords || j.coords, priority: form.priority || "medium", clientName: form.clientName || "", clientPhone: form.clientPhone || "" }
      : j
    ));
    setEditingId(null);
    setForm({ name: "", address: "", pay: "", notes: "", lat: "", lng: "", priority: "medium", clientName: "", clientPhone: "" });
    setView("detail");
  const deleteJob = (jobId) => {
    setState((s) => ({ ...s, jobs: s.jobs.filter((j) => j.id !== jobId) }));
    setSubview(null);
  };

  // Lightweight patch for fields outside the full JobForm save flow (e.g.
  // seasonal outreach recording contact info / lastUpsellContactedAt).
  const updateJob = (jobId, patch) => {
    setState((s) => ({ ...s, jobs: s.jobs.map((j) => (j.id === jobId ? { ...j, ...patch } : j)) }));
  };

  // ── Prospects (Growth Zones leads) ──
  const addProspect = (data) => {
    setState((s) => ({ ...s, prospects: [...(s.prospects || []), makeProspect(data)] }));
  };

  const updateProspect = (id, patch) => {
    setState((s) => ({
      ...s,
      prospects: (s.prospects || []).map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));
  };

  const deleteProspect = (id) => {
    setState((s) => ({ ...s, prospects: (s.prospects || []).filter((p) => p.id !== id) }));
  };

  // ── Expenses ──
  const addExpense = (data) => {
    setState((s) => ({ ...s, expenses: [...(s.expenses || []), makeExpense(data)] }));
  };

  const deleteExpense = (id) => {
    setState((s) => ({ ...s, expenses: (s.expenses || []).filter((e) => e.id !== id) }));
  };

  // A won lead becomes a job: open the form prefilled as a monthly contract.
  const convertProspect = (prospect) => {
    updateProspect(prospect.id, { status: "won" });
    setSubview({
      kind: "form",
      prefill: {
        name: prospect.name,
        address: prospect.address || "",
        coords: prospect.coords || null,
        billing: prospect.targetMonthly ? "monthly" : "visit",
        monthlyRate: prospect.targetMonthly || null,
      },
    });
  };

  const toggleMow = (jobId) => {
    const weekKey = getWeekKey();
    setState((s) => ({
      ...s,
      jobs: s.jobs.map((j) =>
        j.id === jobId ? { ...j, weeklyMows: { ...(j.weeklyMows || {}), [weekKey]: !j.weeklyMows?.[weekKey] } } : j
      ),
    }));
  };

  // ── Timer ──
  const startTimer = async (jobId) => {
    if (activeJob) return;
    let loc = null;
    try { loc = await getCurrentCoords(); } catch { /* timer still works without a fix */ }
    const now = Date.now();
    setState((s) => {
      const job = s.jobs.find((j) => j.id === jobId);
      if (!job) return s;
      let next = {
        ...s,
        jobs: s.jobs.map((j) =>
          j.id === jobId
            ? { ...j, currentSessionStart: now, currentSessionLoc: loc, currentSessionEmployeeId: meId }
            : j
        ),
      };
      const day = getWorkday(next, meId);
      if (day?.start && !day.end) {
        next = setWorkday(next, meId, {
          ...day,
          stops: [...(day.stops || []), { jobId, jobName: job.name, arrivalTime: now, coords: loc, employeeId: meId }],
        });
      }
      return next;
    });
  };
  const isMowedThisWeek = (job) => !!(job.weeklyMows?.[getWeekKey()]);

  const totalWeeklyRevenue = jobs.reduce((a, j) => isMowedThisWeek(j) ? a + j.pay : a, 0);
  const jobsDoneThisWeek = jobs.filter(j => isMowedThisWeek(j)).length;
  const ratedJobs = jobs.filter(j => getHourlyRate(j) > 0);
  const avgRate = ratedJobs.length ? ratedJobs.reduce((a, j) => a + getHourlyRate(j), 0) / ratedJobs.length : 0;

  const openDetail = (job) => { setSelectedJob(job.id); setView("detail"); };
  const job = jobs.find(j => j.id === selectedJob);

  const workdayRunning = workday?.start && !workday?.end;
  const workdayDone = workday?.start && workday?.end;
  const todayRevenue = workday?.stops
    ? jobs.filter(j => workday.stops.some(s => s.jobId === j.id)).reduce((a, j) => a + j.pay, 0)
    : 0;

  // ── ONBOARDING SCREEN ──
  if (!hasOnboarded) {
    return (
      <div style={styles.page}>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "20px", textAlign: "center" }}>
          <div style={{ fontSize: 48, marginBottom: 20 }}>🌱</div>
          <h1 style={{ ...styles.headerTitle, fontSize: 28, marginBottom: 12 }}>Collins Lawncare</h1>
          <div style={{ ...styles.sectionTitle, color: "#64748b", fontSize: 16, marginBottom: 20, fontWeight: 400 }}>
            Track jobs, manage your crew, and grow your business.
          </div>
          
          <div style={styles.card}>
            <div style={styles.sectionTitle}>Enter Your Crew Name</div>
            <input 
              style={styles.input} 
              placeholder="e.g., Collins Crew, Smith Brothers..." 
              value={onboardingCrewName}
              onChange={e => setOnboardingCrewName(e.target.value)}
              onKeyPress={e => {
                if (e.key === "Enter" && onboardingCrewName.trim()) {
                  setCrewName(onboardingCrewName.trim());
                  localStorage.setItem(ONBOARDED_KEY, "true");
                  setHasOnboarded(true);
                }
              }}
            />
            <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>This will appear at the top of your dashboard.</div>
          </div>

          <button 
            style={{ ...styles.primaryBtn, marginTop: 24, opacity: onboardingCrewName.trim() ? 1 : 0.5, cursor: onboardingCrewName.trim() ? "pointer" : "not-allowed" }}
            onClick={() => {
              if (onboardingCrewName.trim()) {
                setCrewName(onboardingCrewName.trim());
                localStorage.setItem(ONBOARDED_KEY, "true");
                setHasOnboarded(true);
              }
            }}
          >
            Get Started
          </button>

          <div style={{ marginTop: 24, fontSize: 11, color: "#475569" }}>
            <div>Local storage only • No account needed</div>
            <div style={{ marginTop: 4 }}>Your data stays on your device</div>
          </div>
        </div>
      </div>
    );
  }

  // ── PRIORITY & SMART ROUTING VIEW ──
  if (view === "priority") {
    const jobsWithPriority = [...jobs].sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const orderA = priorityOrder[a.priority] ?? 1;
      const orderB = priorityOrder[b.priority] ?? 1;
      if (orderA !== orderB) return orderA - orderB;
      return (b.pay || 0) - (a.pay || 0);
    });

    // Build the ordered list of jobs based on routeOrder, keeping it in sync
    // with the current set of jobs (drop removed ids, append new ones in
    // priority order). This is the single source of truth for the rendered list.
    const orderedJobs = [
      ...routeOrder
        .map(id => jobs.find(j => j.id === id))
        .filter(Boolean),
      ...jobsWithPriority.filter(j => !routeOrder.includes(j.id)),
    ];

    // Persist the reconciled order when it drifts from the stored routeOrder
    // (initial load, jobs added/removed).
    const reconciledOrder = orderedJobs.map(j => j.id);
    const orderChanged =
      reconciledOrder.length !== routeOrder.length ||
      reconciledOrder.some((id, i) => id !== routeOrder[i]);
    if (orderChanged) {
      setRouteOrder(reconciledOrder);
    }

    const reorderJobs = (fromIdx, toIdx) => {
      if (
        fromIdx < 0 || toIdx < 0 ||
        fromIdx >= reconciledOrder.length || toIdx >= reconciledOrder.length
      ) return;
      const newOrder = [...reconciledOrder];
      const [moved] = newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, moved);
      setRouteOrder(newOrder);
    };

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => setView("dashboard")}>← Back</button>
          <h1 style={styles.headerTitle}>Smart Routing</h1>
          <div style={{ width: 40 }} />
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Reorder Your Route</div>
          <div style={{ fontSize: 11, color: "#64748b", marginBottom: 12 }}>Drag to adjust order. Sorted by priority and pay.</div>
          {jobs.length === 0 && <div style={styles.empty}>No jobs added yet</div>}
          {orderedJobs.map((job, idx) => {
            const orderedIdx = idx;
            return (
              <div key={job.id} style={{
                ...styles.routeJobRow,
                background: "#fff",
                padding: "12px 10px",
                marginBottom: 8,
                borderRadius: 8,
                borderLeft: `3px solid ${getPriorityColor(job.priority)}`,
                cursor: "grab",
                border: "1px solid #e2e8f0"
              }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#64748b", minWidth: 30 }}>#{orderedIdx + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{job.name}</div>
                  <div style={{ color: "#64748b", fontSize: 11 }}>
                    {getPriorityLabel(job.priority)} · {formatMoney(job.pay)}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {orderedIdx > 0 && (
                    <button style={{ ...styles.checkBtn, background: "#e2e8f0", border: "1px solid #374151", padding: "4px 8px", fontSize: 11 }}
                      onClick={() => reorderJobs(orderedIdx, orderedIdx - 1)}>↑</button>
                  )}
                  {orderedIdx < orderedJobs.length - 1 && (
                    <button style={{ ...styles.checkBtn, background: "#e2e8f0", border: "1px solid #374151", padding: "4px 8px", fontSize: 11 }}
                      onClick={() => reorderJobs(orderedIdx, orderedIdx + 1)}>↓</button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ padding: "0 16px" }}>
          <button style={styles.primaryBtn} onClick={() => setView("dashboard")}>✓ Start Day</button>
        </div>
      </div>
    );
  }

  // ── ANALYTICS DASHBOARD ──
  if (view === "analytics") {
    const totalRevenue = jobs.reduce((sum, j) => sum + (j.sessions || []).reduce((s, sess) => s + (sess.pay || 0), 0), 0);
    const totalHours = jobs.reduce((sum, j) => sum + (j.sessions || []).reduce((s, sess) => s + (sess.duration || 0), 0), 0) / 3600;
    const avgHourlyRate = totalHours > 0 ? totalRevenue / totalHours : 0;
    const jobsCompleted = jobs.reduce((sum, j) => sum + (j.sessions || []).length, 0);
    const avgTimePerJob = jobsCompleted > 0 ? (totalHours * 60) / jobsCompleted : 0;
    
    const jobStats = jobs.map(j => {
      const sessions = j.sessions || [];
      const revenue = sessions.reduce((s, sess) => s + (sess.pay || 0), 0);
      const hours = sessions.reduce((s, sess) => s + (sess.duration || 0), 0) / 3600;
      const rate = hours > 0 ? revenue / hours : 0;
      return { id: j.id, name: j.name, visits: sessions.length, revenue, hours, rate };
    }).sort((a, b) => b.revenue - a.revenue);

    const todayRevenue = jobs.reduce((sum, j) => {
      const today = new Date().toLocaleDateString();
      return sum + (j.sessions || []).filter(s => s.date === today).reduce((s, sess) => s + (sess.pay || 0), 0);
    }, 0);

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => setView("dashboard")}>← Back</button>
          <h1 style={styles.headerTitle}>Analytics</h1>
          <div style={{ width: 40 }} />
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Overall Performance</div>
          <div style={styles.statRow}>
            <div style={styles.stat}>
              <div style={{ ...styles.statVal, color: "#4ade80" }}>{formatMoney(totalRevenue)}</div>
              <div style={styles.statLbl}>Total Revenue</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statVal}>{totalHours.toFixed(1)}h</div>
              <div style={styles.statLbl}>Total Hours</div>
            </div>
            <div style={styles.stat}>
              <div style={{ ...styles.statVal, color: getRateColor(avgHourlyRate) }}>${avgHourlyRate.toFixed(0)}/hr</div>
              <div style={styles.statLbl}>Avg Rate</div>
            </div>
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #2a2a2a", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Today's Earnings</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#4ade80" }}>{formatMoney(todayRevenue)}</div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: "#64748b" }}>Avg Time/Job</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e" }}>{avgTimePerJob.toFixed(0)}m</div>
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Job Performance</div>
          {jobStats.length === 0 && <div style={styles.empty}>No session data yet</div>}
          {jobStats.map(stat => (
            <div key={stat.id} style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <div style={{ fontWeight: 600 }}>{stat.name}</div>
                <div style={{ color: "#4ade80", fontWeight: 600 }}>{formatMoney(stat.revenue)}</div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, fontSize: 12, color: "#64748b" }}>
                <div>{stat.visits} visit{stat.visits !== 1 ? "s" : ""}</div>
                <div>{stat.hours.toFixed(1)}h worked</div>
                <div style={{ color: getRateColor(stat.rate) }}>${stat.rate.toFixed(0)}/hr</div>
              </div>
            </div>
          ))}
        </div>

        <div style={{ padding: "0 16px" }}>
          <button style={{ ...styles.primaryBtn, background: "#10b981", marginBottom: 8 }} onClick={() => setView("reports")}>
            📊 Advanced Reports
          </button>
          <button style={styles.primaryBtn} onClick={() => setView("dashboard")}>✓ Done</button>
        </div>
      </div>
    );
  }

  // ── INVOICE GENERATION ──
  if (view === "invoice") {
    const generateInvoice = (jobId) => {
      const job = jobs.find(j => j.id === jobId);
      if (!job) return;

      const sessions = job.sessions || [];
      const totalMinutes = sessions.reduce((s, sess) => s + (sess.duration || 0), 0) / 60;
      const totalRevenue = sessions.reduce((s, sess) => s + (sess.pay || 0), 0);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>Invoice - ${job.name}</title>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #333; background: white; }
            .container { max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #ddd; background: #fff; }
            .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .company { }
            .company h1 { font-size: 24px; margin-bottom: 5px; }
            .company p { font-size: 12px; color: #666; }
            .invoice-title { text-align: right; }
            .invoice-title h2 { font-size: 28px; margin-bottom: 10px; color: #22c55e; }
            .invoice-title p { font-size: 12px; color: #666; margin: 2px 0; }
            .details { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px; }
            .detail-block h3 { font-size: 12px; color: #666; text-transform: uppercase; margin-bottom: 8px; font-weight: bold; }
            .detail-block p { font-size: 14px; margin: 3px 0; line-height: 1.5; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background: #f5f5f5; padding: 10px; text-align: left; font-weight: bold; font-size: 12px; text-transform: uppercase; color: #333; border-bottom: 1px solid #ddd; }
            td { padding: 12px 10px; border-bottom: 1px solid #eee; font-size: 14px; }
            tr:last-child td { border-bottom: 2px solid #333; }
            .total-row { display: grid; grid-template-columns: 1fr 150px; gap: 20px; justify-items: end; margin-bottom: 30px; }
            .total-row div { font-size: 14px; }
            .total-row .label { text-align: right; }
            .total-row .amount { font-weight: bold; font-size: 18px; color: #22c55e; }
            .notes { background: #f9f9f9; padding: 15px; border-radius: 4px; font-size: 12px; line-height: 1.5; color: #666; margin-bottom: 20px; }
            .footer { text-align: center; font-size: 11px; color: #999; border-top: 1px solid #ddd; padding-top: 15px; }
            @media print { body { background: white; } .container { border: none; box-shadow: none; } }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="company">
                <h1>${businessInfo.name}</h1>
                ${businessInfo.phone ? `<p>📞 ${businessInfo.phone}</p>` : ""}
                ${businessInfo.address ? `<p>📍 ${businessInfo.address}</p>` : ""}
              </div>
              <div class="invoice-title">
                <h2>INVOICE</h2>
                <p>Invoice Date: ${new Date().toLocaleDateString()}</p>
                <p>Invoice #: ${job.id.substring(0, 8).toUpperCase()}</p>
              </div>
            </div>

            <div class="details">
              <div class="detail-block">
                <h3>Bill To</h3>
                <p><strong>${job.clientName || job.name}</strong></p>
                ${job.clientPhone ? `<p>📞 ${job.clientPhone}</p>` : ""}
                ${job.address ? `<p>📍 ${job.address}</p>` : ""}
              </div>
              <div class="detail-block">
                <h3>Service Details</h3>
                <p><strong>${job.name}</strong></p>
                <p>${sessions.length} visit${sessions.length !== 1 ? "s" : ""}</p>
                <p>Total Time: ${totalMinutes.toFixed(1)} minutes</p>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Duration</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                ${sessions.map(s => `
                  <tr>
                    <td>${s.date}</td>
                    <td>${formatDuration(s.duration)}</td>
                    <td>$${(s.pay || 0).toFixed(2)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>

            <div class="total-row">
              <div class="label">TOTAL DUE:</div>
              <div class="amount">$${totalRevenue.toFixed(2)}</div>
            </div>

            ${job.notes ? `<div class="notes"><strong>Notes:</strong> ${job.notes}</div>` : ""}
            ${job.completionNotes ? `<div class="notes"><strong>Completion Notes:</strong> ${job.completionNotes}</div>` : ""}

            <div class="footer">
              <p>Thank you for your business!</p>
              <p style="margin-top: 10px; font-size: 10px;">Generated on ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const printWindow = window.open("", "", "width=800,height=600");
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 250);
      }
    };

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => setView("dashboard")}>← Back</button>
          <h1 style={styles.headerTitle}>Invoices</h1>
          <div style={{ width: 40 }} />
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Business Information</div>
          <label style={styles.label}>Business Name</label>
          <input style={styles.input} placeholder="Collins Lawncare" value={businessInfo.name}
            onChange={e => setBusinessInfo(b => ({ ...b, name: e.target.value }))} />
          <label style={styles.label}>Phone (optional)</label>
          <input style={styles.input} placeholder="(256) 555-0100" value={businessInfo.phone}
            onChange={e => setBusinessInfo(b => ({ ...b, phone: e.target.value }))} />
          <label style={styles.label}>Address (optional)</label>
          <input style={styles.input} placeholder="Hanceville, AL" value={businessInfo.address}
            onChange={e => setBusinessInfo(b => ({ ...b, address: e.target.value }))} />
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Select Job to Invoice</div>
          {jobs.length === 0 && <div style={styles.empty}>No jobs available</div>}
          {jobs.filter(j => (j.sessions || []).length > 0).length === 0 ? (
            <div style={styles.empty}>No jobs with recorded sessions</div>
          ) : (
            <div>
              {jobs.filter(j => (j.sessions || []).length > 0).map(j => {
                const revenue = (j.sessions || []).reduce((s, sess) => s + (sess.pay || 0), 0);
                return (
                  <div key={j.id} style={{ ...styles.jobCard, cursor: "pointer" }} onClick={() => generateInvoice(j.id)}>
                    <div style={styles.jobCardLeft}>
                      <div style={styles.jobName}>{j.name}</div>
                      {j.clientName && <div style={{ color: "#64748b", fontSize: 12 }}>Client: {j.clientName}</div>}
                      <div style={{ color: "#64748b", fontSize: 11 }}>
                        {(j.sessions || []).length} session{(j.sessions || []).length !== 1 ? "s" : ""} recorded
                      </div>
                    </div>
                    <div style={styles.jobCardRight}>
                      <div style={{ color: "#4ade80", fontWeight: 600 }}>{formatMoney(revenue)}</div>
                      <button style={{ ...styles.checkBtn, background: "#e2e8f0", border: "1px solid #374151", fontSize: 11 }}>
                        Generate →
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div style={{ padding: "0 16px" }}>
          <button style={styles.primaryBtn} onClick={() => setView("dashboard")}>← Back to Dashboard</button>
        </div>
      </div>
    );
  }

  // ── ROUTE MAP VIEW ──
  if (view === "route") {
    const mapBounds = buildMapBounds(jobs, homeCoords);
    const centerLat = mapBounds?.centerLat ?? DEFAULT_CENTER.lat;
    const centerLng = mapBounds?.centerLng ?? DEFAULT_CENTER.lng;
    const bbox = mapBounds
      ? `${mapBounds.minLng}%2C${mapBounds.minLat}%2C${mapBounds.maxLng}%2C${mapBounds.maxLat}`
      : `${centerLng - 0.05}%2C${centerLat - 0.05}%2C${centerLng + 0.05}%2C${centerLat + 0.05}`;

    const jobsForRouting = jobs.filter(j => jobRouteLocation(j));
    const buildGoogleMapsUrl = () => {
      if (!jobsForRouting.length) return null;
      const origin = homeAddress || (homeCoords ? `${homeCoords.lat},${homeCoords.lng}` : "Hanceville, AL");
      const dest = homeAddress || (homeCoords ? `${homeCoords.lat},${homeCoords.lng}` : "Hanceville, AL");
      const waypoints = jobsForRouting.map(j => encodeURIComponent(jobRouteLocation(j))).join("|");
      return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(dest)}&waypoints=${waypoints}&travelmode=driving`;
    };

    const mapsUrl = buildGoogleMapsUrl();

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => setView("dashboard")}>← Back</button>
          <h1 style={styles.headerTitle}>Route Map</h1>
          <div style={{ width: 40 }} />
        </div>

        {/* Today's stops timeline */}
        {workday?.stops?.length > 0 && (
          <div style={{ ...styles.card, marginTop: 12 }}>
            <div style={styles.sectionTitle}>Today's Stops</div>
            {workday.stops.map((stop, i) => (
              <div key={i} style={styles.routeStop}>
                <div style={styles.routeDot} />
                <div style={{ flex: 1 }}>
                  <div style={{ color: "#fff", fontWeight: 600, fontSize: 14 }}>{stop.jobName}</div>
                  <div style={{ color: "#64748b", fontSize: 12 }}>
                    Arrived {formatTime(stop.arrivalTime)}
                    {stop.departTime && ` · Left ${formatTime(stop.departTime)}`}
                    {stop.duration && ` · ${formatDuration(stop.duration)}`}
                  </div>
                </div>
                <div style={{ color: "#22c55e", fontWeight: 700, fontSize: 13 }}>
                  {stop.duration ? formatDuration(stop.duration) : "—"}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Job list with coords */}
        <div style={{ ...styles.card, marginTop: workday?.stops?.length ? 0 : 12 }}>
          <div style={styles.sectionTitle}>All Yards</div>
          {jobs.length === 0 && <div style={styles.empty}>No jobs added yet</div>}
          {jobs.map((j, i) => (
            <div key={j.id} style={styles.routeJobRow}>
              <div style={{ ...styles.routeNumBadge, background: isMowedThisWeek(j) ? "#16a34a" : "#e2e8f0" }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 600 }}>{j.name}</div>
                {j.address && <div style={{ color: "#64748b", fontSize: 11 }}>{j.address}</div>}
                {!j.address && <div style={{ color: "#4b5563", fontSize: 11, fontStyle: "italic" }}>No address saved</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: isMowedThisWeek(j) ? "#4ade80" : "#94a3b8", fontSize: 12 }}>
                  {isMowedThisWeek(j) ? "✅ Done" : "Pending"}
                </div>
                <div style={{ color: "#22c55e", fontSize: 13, fontWeight: 600 }}>{formatMoney(j.pay)}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Open in Google Maps */}
        {mapsUrl && (
          <div style={{ padding: "0 16px" }}>
            <a href={mapsUrl} target="_blank" rel="noreferrer" style={styles.mapsBtn}>
              🗺 Open Full Route in Google Maps
            </a>
          </div>
        )}

        {/* Embed OpenStreetMap for visual reference */}
        <div style={{ padding: "12px 16px 0" }}>
          <div style={styles.sectionTitle}>Map Preview</div>
          <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e2e8f0" }}>
            <iframe
              title="Route Map"
              width="100%"
              height="280"
              style={{ border: "none", display: "block" }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${centerLat}%2C${centerLng}`}
            />
          </div>
          <div style={{ fontSize: 11, color: "#4b5563", textAlign: "center", marginTop: 6 }}>
            {mapBounds
              ? `Showing ${mapBounds.markerCount} saved location${mapBounds.markerCount === 1 ? "" : "s"} on the map`
              : "Add addresses or GPS coords to jobs to use routing and map preview"}
          </div>
        </div>
      </div>
    );
  }

  // ── SETTINGS ──
  if (view === "settings") {
    const exportData = () => {
      const data = {
        version: 1,
        exportedAt: new Date().toISOString(),
        jobs,
        workday,
        homeAddress,
        homeCoords,

  const stopTimer = (jobId, { auto = false } = {}) => {
    const now = Date.now();
    const jobBefore = state.jobs.find((j) => j.id === jobId);
    setState((s) => {
      const job = s.jobs.find((j) => j.id === jobId);
      if (!job?.currentSessionStart) return s;
      const duration = Math.floor((now - job.currentSessionStart) / 1000);
      const session = {
        date: new Date().toLocaleDateString(),
        dayKey: getTodayKey(),
        duration,
        location: job.currentSessionLoc || null,
        pay: job.pay,
        employeeId: job.currentSessionEmployeeId || null,
        auto,
      };
      let next = {
        ...s,
        jobs: s.jobs.map((j) =>
          j.id === jobId
            ? {
                ...j,
                sessions: [...(j.sessions || []), session],
                weeklyMows: { ...(j.weeklyMows || {}), [getWeekKey()]: true },
                currentSessionStart: null, currentSessionLoc: null, currentSessionEmployeeId: null,
              }
            : j
        ),
      };
      reader.readAsText(file);
    };

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => setView("dashboard")}>← Back</button>
          <h1 style={styles.headerTitle}>Settings</h1>
          <div style={{ width: 40 }} />
        </div>
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Home Location</div>
          <label style={styles.label}>Home Address</label>
          <input style={styles.input} placeholder="123 Home St, Hanceville AL"
            value={homeAddress}
            onChange={e => setHomeAddress(e.target.value)} />
          <button style={{ ...styles.primaryBtn, marginBottom: 10 }} onClick={() => {
            localStorage.setItem(HOME_KEY, homeAddress);
            setGeoError("Address saved!");
          }}>Save Address</button>
          <button style={{ ...styles.checkBtn, background: "#e2e8f0", border: "1px solid #374151", width: "100%", marginBottom: 0 }}
            onClick={() => getLocation((c) => {
              setHomeCoords(c);
              localStorage.setItem(HOME_COORDS_KEY, JSON.stringify(c));
              setGeoError(`Home set to ${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`);
            })}>
            📍 Set Home to Current GPS Location
          </button>
          {homeCoords && <div style={{ color: "#64748b", fontSize: 11, marginTop: 6, textAlign: "center" }}>
            Home GPS: {homeCoords.lat.toFixed(4)}, {homeCoords.lng.toFixed(4)}
          </div>}
        </div>
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Data Backup</div>
          <p style={{ color: "#64748b", fontSize: 12, marginBottom: 12, lineHeight: 1.5 }}>
            Export your jobs and settings to a file, or restore from a previous backup.
          </p>
          <button style={{ ...styles.primaryBtn, marginBottom: 10 }} onClick={exportData}>
            ⬇ Export Backup
          </button>
          <input
            ref={importInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importData(file);
              e.target.value = "";
            }}
          />
          <button style={{ ...styles.checkBtn, background: "#e2e8f0", border: "1px solid #374151", width: "100%", marginBottom: 0 }}
            onClick={() => importInputRef.current?.click()}>
            ⬆ Restore from Backup
          </button>
        </div>
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Billing & Client Access</div>
          <button style={{ ...styles.primaryBtn, marginBottom: 8 }} onClick={() => setView("billing")}>
            💳 Manage Subscription
          </button>
          <button style={{ ...styles.primaryBtn, marginBottom: 0, background: "#f3e8ff", color: "#7e22ce" }} onClick={() => setView("clientPortal")}>
            👁️ Preview Client Portal
          </button>
        </div>
        <div style={styles.card}>
          <div style={styles.sectionTitle}>Legal</div>
          <div style={{ display: "flex", gap: 12, flexDirection: "column" }}>
            <a href="docs/privacy.html" target="_blank" rel="noopener noreferrer" 
              style={{ color: "#22c55e", textDecoration: "none", fontSize: 13, padding: "10px 0", borderBottom: "1px solid #e2e8f0", paddingBottom: 10 }}>
              📋 Privacy Policy
            </a>
            <a href="docs/terms.html" target="_blank" rel="noopener noreferrer"
              style={{ color: "#22c55e", textDecoration: "none", fontSize: 13, padding: "10px 0" }}>
              ⚖️ Terms of Service
            </a>
          </div>
        </div>
        {geoError && <div style={{ color: "#4ade80", fontSize: 12, margin: "0 16px", textAlign: "center" }}>{geoError}</div>}
      </div>
    );
  }

  // ── BILLING & SUBSCRIPTIONS ──
  if (view === "billing") {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => setView("settings")}>Back</button>
          <h1 style={styles.headerTitle}>Billing</h1>
          <div style={{ width: 40 }} />
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Current Plan</div>
          <div style={{ padding: "16px 0", textAlign: "center" }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#22c55e", marginBottom: 8, textTransform: "capitalize" }}>
              {subscription.plan || "Free"} Plan
            </div>
            <div style={{ color: "#64748b", marginBottom: 12 }}>
              Active since {subscription.startDate}
            </div>
            <div style={{ background: "#f1f5f9", borderRadius: 8, padding: 12, color: "#1e293b", fontSize: 13, marginBottom: 16 }}>
              Total spent: ${subscription.payments.reduce((s, p) => s + p.amount, 0).toFixed(2)}
            </div>
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Upgrade Plan</div>
          {["pro", "business", "enterprise"].map(plan => (
            <div key={plan} style={{ marginBottom: 12, padding: "12px", borderRadius: 8, border: "1px solid #e2e8f0", textAlign: "center" }}>
              <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: 4, textTransform: "capitalize" }}>{plan} - ${plan === "pro" ? "49" : plan === "business" ? "99" : "199"}/mo</div>
              <button style={{ ...styles.primaryBtn, padding: "8px 16px", fontSize: 12 }}
                onClick={() => upgradeSubscription(plan)} disabled={subscription.plan === plan}>
                {subscription.plan === plan ? "Current Plan" : "Upgrade"}
              </button>
            </div>
          ))}
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Payment History</div>
          {subscription.payments.length === 0 ? (
            <div style={styles.empty}>No payments yet</div>
          ) : (
            subscription.payments.map(p => (
              <div key={p.id} style={{ padding: "10px 0", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#1e293b", textTransform: "capitalize" }}>{p.plan}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{p.date}</div>
                </div>
                <div style={{ fontWeight: 700, color: "#22c55e" }}>${p.amount.toFixed(2)}</div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: "0 16px" }}>
          <button style={styles.primaryBtn} onClick={() => setView("settings")}>Back to Settings</button>
        </div>
      </div>
    );
  }

  // ── ADVANCED REPORTS ──
  if (view === "reports") {
    const totalRevenue = jobs.reduce((sum, j) => sum + (j.sessions || []).reduce((s, sess) => s + (sess.pay || 0), 0), 0);
    const jobsData = jobs.map(j => {
      const sessions = j.sessions || [];
      const revenue = sessions.reduce((s, sess) => s + (sess.pay || 0), 0);
      const hours = sessions.reduce((s, sess) => s + (sess.duration || 0), 0) / 3600;
      return { name: j.name, revenue, hours, profitability: revenue / (hours || 1) };
    }).sort((a, b) => b.revenue - a.revenue);

    const crewData = crew.map(c => ({ name: c.name, earnings: c.totalEarnings, hours: c.totalHours, jobs: c.jobsCompleted }));

    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => setView("dashboard")}>Back</button>
          <h1 style={styles.headerTitle}>Reports</h1>
          <div style={{ width: 40 }} />
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Export Data</div>
          <button style={{ ...styles.primaryBtn, background: "#10b981" }} onClick={exportToCSV}>
            Download CSV Report
          </button>
          <div style={{ fontSize: 12, color: "#64748b", marginTop: 8, textAlign: "center" }}>
            Includes all jobs, revenue, and crew data
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Top Performing Jobs</div>
          {jobsData.length === 0 ? (
            <div style={styles.empty}>No job data available</div>
          ) : (
            jobsData.slice(0, 5).map((job, idx) => (
              <div key={idx} style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontWeight: 600, color: "#1e293b" }}>{idx + 1}. {job.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{job.hours.toFixed(1)}h worked</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, color: "#22c55e" }}>${job.revenue.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: "#64748b" }}>${job.profitability.toFixed(0)}/h</div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Crew Performance</div>
          {crewData.length === 0 ? (
            <div style={styles.empty}>No crew members yet</div>
          ) : (
            crewData.map((member, idx) => (
              <div key={idx} style={{ padding: "12px 0", borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>{member.name}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, fontSize: 12 }}>
                  <div style={{ background: "#f1f5f9", padding: 8, borderRadius: 4, textAlign: "center" }}>
                    <div style={{ color: "#64748b" }}>Earnings</div>
                    <div style={{ fontWeight: 700, color: "#22c55e" }}>${member.earnings.toFixed(2)}</div>
                  </div>
                  <div style={{ background: "#f1f5f9", padding: 8, borderRadius: 4, textAlign: "center" }}>
                    <div style={{ color: "#64748b" }}>Hours</div>
                    <div style={{ fontWeight: 700 }}>{member.hours.toFixed(1)}</div>
                  </div>
                  <div style={{ background: "#f1f5f9", padding: 8, borderRadius: 4, textAlign: "center" }}>
                    <div style={{ color: "#64748b" }}>Jobs</div>
                    <div style={{ fontWeight: 700 }}>{member.jobs}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div style={{ padding: "0 16px" }}>
          <button style={styles.primaryBtn} onClick={() => setView("dashboard")}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  // ── CLIENT PORTAL ──
  if (view === "clientPortal") {
    const clientJobs = jobs.filter(j => j.clientName);
    return (
      <div style={styles.page}>
        <div style={{ ...styles.header, background: "#f1f5f9" }}>
          <div />
          <h1 style={styles.headerTitle}>Your Jobs</h1>
          <button style={styles.backBtn} onClick={() => setView("dashboard")}>Exit</button>
        </div>

        {clientJobs.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
            <div style={{ fontSize: 14 }}>No active jobs to display</div>
          </div>
        ) : (
          <div>
            {clientJobs.map(job => (
              <div key={job.id} style={styles.card}>
                <div style={{ fontWeight: 700, fontSize: 16, color: "#1e293b", marginBottom: 8 }}>{job.name}</div>
                <div style={{ color: "#64748b", fontSize: 13, marginBottom: 8 }}>{job.address}</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
                  <div style={{ background: "#f1f5f9", padding: 8, borderRadius: 6, textAlign: "center", fontSize: 12 }}>
                    <div style={{ color: "#64748b" }}>Sessions</div>
                    <div style={{ fontWeight: 700, color: "#22c55e" }}>{(job.sessions || []).length}</div>
                  </div>
                  <div style={{ background: "#f1f5f9", padding: 8, borderRadius: 6, textAlign: "center", fontSize: 12 }}>
                    <div style={{ color: "#64748b" }}>Total</div>
                    <div style={{ fontWeight: 700, color: "#22c55e" }}>${job.pay}</div>
                  </div>
                </div>
                {(job.photos || []).length > 0 && (
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>Gallery ({(job.photos || []).length})</div>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      {(job.photos || []).slice(0, 4).map((photo, idx) => (
                        <img key={idx} src={photo} alt="Work" style={{ width: "100%", height: 80, objectFit: "cover", borderRadius: 6 }} />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // ── CREW MANAGEMENT ──
  if (view === "crew") {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => setView("dashboard")}>Back</button>
          <h1 style={styles.headerTitle}>Manage Crew</h1>
          <div style={{ width: 40 }} />
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Add Crew Member</div>
          <label style={styles.label}>Name</label>
          <input style={styles.input} placeholder="e.g., John, Maria..." value={crewFormName}
            onChange={e => setCrewFormName(e.target.value)} />
          <label style={styles.label}>Role</label>
          <select style={styles.input} value={crewFormRole} onChange={e => setCrewFormRole(e.target.value)}>
            <option value="Worker">Worker</option>
            <option value="Supervisor">Supervisor</option>
            <option value="Manager">Manager</option>
          </select>
          <button style={{ ...styles.primaryBtn, opacity: crewFormName.trim() ? 1 : 0.5, cursor: crewFormName.trim() ? "pointer" : "not-allowed" }}
            onClick={addCrewMember}>
            Add Member
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Crew Members ({crew.length})</div>
          {crew.length === 0 ? (
            <div style={styles.empty}>No crew members yet. Add your first team member above.</div>
          ) : (
            <div>
              {crew.map(member => (
                <div key={member.id} style={{ padding: "14px 0", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 600, color: "#1e293b", marginBottom: 4 }}>{member.name}</div>
                    <div style={{ fontSize: 12, color: "#64748b", marginBottom: 2 }}>Role: {member.role}</div>
                    <div style={{ fontSize: 11, color: "#64748b" }}>Joined {member.addedDate}</div>
                    <div style={{ fontSize: 11, color: "#22c55e", marginTop: 4, fontWeight: 600 }}>
                      Earned: ${member.totalEarnings.toFixed(2)} | {member.totalHours.toFixed(1)}h | {member.jobsCompleted} jobs
                    </div>
                  </div>
                  <button style={{ ...styles.deleteBtn, margin: 0, padding: "6px 12px", fontSize: 12 }}
                    onClick={() => deleteCrewMember(member.id)}>
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ padding: "0 16px" }}>
          <button style={styles.primaryBtn} onClick={() => setView("dashboard")}>Back to Dashboard</button>
        </div>
      </div>
    );
  }

  // ── ADD / EDIT JOB FORM ──
  if (view === "add" || (view === "detail" && editingId)) {
    const isEdit = !!editingId;
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => {
            setView(isEdit ? "detail" : "dashboard");
            setEditingId(null);
            setForm({ name: "", address: "", pay: "", notes: "", lat: "", lng: "" });
          }}>← Back</button>
          <h1 style={styles.headerTitle}>{isEdit ? "Edit Job" : "Add New Job"}</h1>
        </div>
        <div style={styles.card}>
          <label style={styles.label}>Customer / Yard Name *</label>
          <input style={styles.input} placeholder="e.g. Smith Residence" value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <label style={styles.label}>Address (used for route map)</label>
          <input style={styles.input} placeholder="123 Main St, Hanceville AL" value={form.address}
            onChange={e => setForm(f => ({ ...f, address: e.target.value }))} />
          <label style={styles.label}>Pay Per Visit ($) *</label>
          <input style={styles.input} type="number" placeholder="45.00" value={form.pay}
            onChange={e => setForm(f => ({ ...f, pay: e.target.value }))} />
          <label style={styles.label}>Notes</label>
          <textarea style={{ ...styles.input, height: 70, resize: "vertical" }} placeholder="Gate code, dog, trimming..."
            value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
          <label style={styles.label}>Priority</label>
          <select style={styles.input} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
            <option value="low">🔵 Low</option>
            <option value="medium">🟡 Medium</option>
            <option value="high">🔴 High</option>
          </select>
          <label style={styles.label}>Client Name (optional)</label>
          <input style={styles.input} placeholder="e.g. John Smith" value={form.clientName}
            onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))} />
          <label style={styles.label}>Client Phone (optional)</label>
          <input style={styles.input} placeholder="(256) 555-0123" value={form.clientPhone}
            onChange={e => setForm(f => ({ ...f, clientPhone: e.target.value }))} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <div>
              <label style={styles.label}>Lat (optional)</label>
              <input style={styles.input} placeholder="34.063" value={form.lat}
                onChange={e => setForm(f => ({ ...f, lat: e.target.value }))} />
            </div>
            <div>
              <label style={styles.label}>Lng (optional)</label>
              <input style={styles.input} placeholder="-86.768" value={form.lng}
                onChange={e => setForm(f => ({ ...f, lng: e.target.value }))} />
            </div>
          </div>
          <button style={{ ...styles.checkBtn, background: "#e2e8f0", border: "1px solid #374151", width: "100%", marginBottom: 12 }}
            onClick={() => getLocation((c) => setForm(f => ({ ...f, lat: c.lat.toFixed(5), lng: c.lng.toFixed(5) })))}>
            📍 Use Current GPS for Coords
          </button>
          {geoError && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>{geoError}</div>}
          <button style={styles.primaryBtn} onClick={isEdit ? updateJob : addJob}>
            {isEdit ? "Save Changes" : "Add Job"}
          </button>
        </div>
      </div>
    );
  }

  // ── JOB DETAIL ──
  if (view === "detail" && job) {
    const totalSec = getTotalTime(job);
    const avgSec = getAvgTime(job);
    const rate = getHourlyRate(job);
    const mowed = isMowedThisWeek(job);
    const isRunning = activeTimer === job.id;
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => setView("dashboard")}>← Back</button>
          <h1 style={styles.headerTitle}>{job.name}</h1>
          <button style={styles.editBtn} onClick={() => {
            setEditingId(job.id);
            setForm({ name: job.name, address: job.address || "", pay: job.pay, notes: job.notes || "", lat: job.coords?.lat || "", lng: job.coords?.lng || "", priority: job.priority || "medium", clientName: job.clientName || "", clientPhone: job.clientPhone || "" });
          }}>Edit</button>
        </div>
        {job.address && <p style={styles.address}>📍 {job.address}</p>}

        <div style={styles.card}>
          <div style={styles.statRow}>
            <div style={styles.stat}>
              <div style={styles.statVal}>{formatMoney(job.pay)}</div>
              <div style={styles.statLbl}>Per Visit</div>
            </div>
            <div style={styles.stat}>
              <div style={{ ...styles.statVal, color: getRateColor(rate) }}>{rate > 0 ? `$${rate.toFixed(0)}/hr` : "—"}</div>
              <div style={styles.statLbl}>Avg Rate</div>
            </div>
            <div style={styles.stat}>
              <div style={styles.statVal}>{formatDuration(avgSec)}</div>
              <div style={styles.statLbl}>Avg Time</div>
            </div>
          </div>
          {rate > 0 && (
            <div style={{ marginTop: 12 }}>
              <div style={styles.rateBar}>
                <div style={{ ...styles.rateBarFill, width: `${Math.min(100, (rate / 80) * 100)}%`, background: getRateColor(rate) }} />
              </div>
              <div style={styles.rateHint}>
                {rate < 40 && "⚠️ Low rate — consider raising your price or working faster"}
                {rate >= 40 && rate < 60 && "🟡 Fair rate — room to improve"}
                {rate >= 60 && "✅ Good rate — you're pricing this well"}
              </div>
            </div>
          )}
        </div>

        <div style={styles.card}>
          <div style={styles.rowBetween}>
            <div>
              <div style={styles.label}>This Week</div>
              <div style={{ fontSize: 13, color: mowed ? "#4ade80" : "#f87171" }}>{mowed ? "✅ Mowed" : "❌ Not yet"}</div>
            </div>
            <button style={{ ...styles.checkBtn, background: mowed ? "#16a34a" : "#14532d", border: `1px solid ${mowed ? "#4ade80" : "#555"}` }}
              onClick={() => toggleMow(job.id)}>
              {mowed ? "Unmark" : "Mark Mowed"}
            </button>
          </div>
          <div style={{ marginTop: 16, borderTop: "1px solid #2a2a2a", paddingTop: 16 }}>
            {isRunning ? (
              <div style={{ textAlign: "center" }}>
                <div style={styles.timerDisplay}>{formatDuration(elapsed)}</div>
                {locStatus && <div style={styles.locText}>{locStatus}</div>}
                <button style={styles.stopBtn} onClick={() => stopTimer(job.id)}>⏹ Stop & Save</button>
              </div>
            ) : (
              <button style={styles.startBtn} disabled={!!activeTimer && activeTimer !== job.id}
                onClick={() => startTimer(job.id)}>
                {activeTimer && activeTimer !== job.id ? "Another job running..." : "▶ Start Timer"}
              </button>
            )}
          </div>
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Completion Evidence</div>
          <div style={{ marginBottom: 12 }}>
            <label style={styles.label}>Completion Notes</label>
            <textarea style={{ ...styles.input, height: 60, resize: "vertical" }} placeholder="Add notes about this job completion..."
              value={job.completionNotes || ""} onChange={e => {
                const updated = jobs.map(j => j.id === job.id ? { ...j, completionNotes: e.target.value } : j);
                saveJobs(updated);
              }} />
          </div>
          <label style={styles.label}>Photos (Base64 embedded)</label>
          {(job.photos || []).length > 0 && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              {(job.photos || []).map((photo, idx) => (
                <div key={idx} style={{ position: "relative", borderRadius: 8, overflow: "hidden", background: "#e2e8f0" }}>
                  <img src={photo} alt={`Photo ${idx + 1}`} style={{ width: "100%", height: 120, objectFit: "cover" }} />
                  <button style={{ position: "absolute", top: 4, right: 4, background: "#f87171", border: "none", borderRadius: 4, padding: "4px 8px", fontSize: 11, cursor: "pointer", fontWeight: 600 }}
                    onClick={() => {
                      const updated = jobs.map(j => j.id === job.id ? { ...j, photos: (j.photos || []).filter((_, i) => i !== idx) } : j);
                      saveJobs(updated);
                    }}>Remove</button>
                </div>
              ))}
            </div>
          )}
          <input type="file" accept="image/*" id="photoInput" style={{ display: "none" }} onChange={e => {
            if (e.target.files?.[0]) {
              const reader = new FileReader();
              reader.onload = (evt) => {
                const base64 = evt.target?.result;
                if (typeof base64 === "string") {
                  const updated = jobs.map(j => j.id === job.id ? { ...j, photos: [...(j.photos || []), base64] } : j);
                  saveJobs(updated);
                }
              };
              reader.readAsDataURL(e.target.files[0]);
              e.target.value = "";
            }
          }} />
          <button style={{ ...styles.checkBtn, width: "100%" }} onClick={() => document.getElementById("photoInput").click()}>
            📸 Add Photo
          </button>
        </div>

        <div style={styles.card}>
          <div style={styles.sectionTitle}>Visit History</div>
          {!(job.sessions || []).length && <div style={styles.empty}>No visits recorded yet</div>}
          {[...(job.sessions || [])].reverse().map((s, i) => (
            <div key={i} style={styles.sessionRow}>
              <div>
                <div style={{ color: "#e2e8f0", fontSize: 14 }}>{s.date}</div>
                {s.location && <div style={{ color: "#64748b", fontSize: 11 }}>📍 GPS logged</div>}
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ color: "#22c55e", fontWeight: 600 }}>{formatDuration(s.duration)}</div>
                <div style={{ color: "#94a3b8", fontSize: 12 }}>{formatMoney(s.pay)}</div>
              </div>
            </div>
          ))}
          {!!(job.sessions || []).length && (
            <div style={styles.totalRow}>
              <span>Total time</span>
              <span style={{ color: "#22c55e" }}>{formatDuration(totalSec)}</span>
            </div>
          )}
        </div>
      const empId = job.currentSessionEmployeeId || meId;
      const day = getWorkday(next, empId);
      if (day?.stops) {
        next = setWorkday(next, empId, {
          ...day,
          stops: day.stops.map((st) =>
            st.jobId === jobId && !st.departTime ? { ...st, departTime: now, duration } : st
          ),
        }, getTodayKey());
      }
      return next;
    });
    if (auto) {
      if (navigator.vibrate) navigator.vibrate([120, 60, 120]);
      showToast("Left the job site — timer stopped and visit saved automatically.");
    }
    if (jobBefore?.notifyOnComplete && jobBefore?.customerPhone && state.settings.notifyWebhookUrl) {
      const empId = jobBefore.currentSessionEmployeeId || meId;
      const crewName = state.employees.find((e) => e.id === empId)?.name || me?.name;
      sendCompletionWebhook(state.settings.notifyWebhookUrl, {
        to: jobBefore.customerPhone,
        message: buildCompletionMessage(state.settings.notifyMessageTemplate, {
          customer: jobBefore.customerName || null,
          job: jobBefore.name,
          crew: crewName,
        }),
        job: jobBefore.name,
        address: jobBefore.address || "",
        completedAt: now,
      });
    }
  };

  // ── GPS tracking ──
  const pendingDistance = useRef(0);
  const onDistance = useCallback((meters) => {
    pendingDistance.current += meters;
    if (pendingDistance.current < 25) return; // batch small increments
    const add = pendingDistance.current;
    pendingDistance.current = 0;
    setState((s) => {
      const day = getWorkday(s, meId);
      if (!day || day.end) return s;
      return setWorkday(s, meId, { ...day, distanceMeters: (day.distanceMeters || 0) + add });
    });
  }, [meId]);

  const onAutoStop = (job) => stopTimer(job.id, { auto: true });
  const onArrive = (job) => {
    if (navigator.vibrate) navigator.vibrate(80);
    startTimer(job.id);
    showToast(`Arrived at ${job.name} — timer started automatically.`);
  };

  const { lastFix, gpsError } = useGpsTracking({
    enabled: !!meId && (workdayRunning || !!activeJob),
    config: {
      activeJob,
      jobs: state.jobs,
      geofenceRadius: state.settings.geofenceRadius,
      autoStop: state.settings.autoStop,
      autoArriveDetect: state.settings.autoArriveDetect,
    },
    onDistance,
    onAutoStop,
    onArrive,
  });

  // ── Settings / crew ──
  const updateSettings = (patch) => setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  const addEmployee = (name, role) => {
    setState((s) => {
      const emp = makeEmployee(name, role, s.employees);
      return { ...s, employees: [...s.employees, emp], activeEmployeeId: s.activeEmployeeId || emp.id };
    });
  };

  const removeEmployee = (empId) => {
    setState((s) => ({
      ...s,
      employees: s.employees.filter((e) => e.id !== empId),
      activeEmployeeId: s.activeEmployeeId === empId ? (s.employees.find((e) => e.id !== empId)?.id ?? null) : s.activeEmployeeId,
    }));
  };

  const switchEmployee = (empId) => {
    setState((s) => ({ ...s, activeEmployeeId: empId }));
  };

  const restoreState = (next) => {
    setState(next);
    setSubview(null);
    setTab("today");
    showToast("Backup restored.");
  };

  // ── DASHBOARD ──
  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <div style={styles.brand}>{crewName || "Collins Lawncare"}</div>
          <div style={styles.subBrand}>Schedule & Pay Tracker</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.iconBtn} onClick={() => setView("settings")} title="Settings">⚙️</button>
          <button style={styles.iconBtn} onClick={() => setView("route")} title="Route Map">🗺</button>
          <button style={styles.addBtn} onClick={() => setView("add")}>+ Job</button>
        </div>
      </div>

      {/* ── WORKDAY CLOCK ── */}
      <div style={{ ...styles.card, marginTop: 12, background: workdayRunning ? "#dcfce7" : workdayDone ? "#fef3c7" : "#161b22", border: `1px solid ${workdayRunning ? "#16a34a" : workdayDone ? "#bfdbfe" : "#e2e8f0"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: workdayRunning || workdayDone ? 10 : 0 }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: workdayRunning ? "#4ade80" : workdayDone ? "#60a5fa" : "#94a3b8" }}>
              {workdayRunning ? "🟢 Workday Running" : workdayDone ? "🏁 Workday Complete" : "🏠 Start Your Day"}
            </div>
            {!workdayRunning && !workdayDone && (
              <div style={{ fontSize: 11, color: "#4b5563", marginTop: 2 }}>Tap to start clock when you leave home</div>
            )}
          </div>
          {!workdayRunning && !workdayDone && (
            <button style={{ ...styles.startBtn, width: "auto", padding: "10px 18px", fontSize: 13 }} onClick={startWorkday}>
              ▶ Leave Home
            </button>
          )}
          {workdayRunning && (
            <div style={{ display: "flex", gap: 8 }}>
              <button style={{ ...styles.stopBtn, padding: "8px 14px", fontSize: 13, flex: 1 }} onClick={endWorkday}>
                🏠 Home
              </button>
              <button style={{ ...styles.checkBtn, padding: "8px 14px", fontSize: 13, background: "#e0f2fe", color: "#0369a1" }} onClick={captureGPS}>
                📍 GPS
              </button>
            </div>
          )}
          {workdayDone && (
            <button style={{ ...styles.checkBtn, background: "#e2e8f0", border: "1px solid #374151", fontSize: 12 }} onClick={resetWorkday}>
              Reset
            </button>
          )}
        </div>
  // ── Crew invites ──
  // One-time merge of another crew member's jobs + roster onto this phone —
  // see store.js for why this stands in for real sync for now. Returns a
  // summary so the caller (Onboarding or Crew tab) can report what happened;
  // throws with a user-facing message on a bad/garbled code.
  const joinCrew = (code) => {
    const invite = decodeCrewInvite(code);
    const result = applyCrewInvite(state, invite);
    setState(result.state);
    return result;
  };

  // Treat a detail subview whose job no longer exists as closed.
  const detailJob = subview?.kind === "detail" ? state.jobs.find((j) => j.id === subview.jobId) : null;
  const effectiveSubview = subview?.kind === "detail" && !detailJob ? null : subview;

  // ── Render ──
  if (!state.employees.length || !me) {
    return <Onboarding employees={state.employees} onCreate={addEmployee} onPick={switchEmployee} onJoinCrew={joinCrew} />;
  }

  const openJob = (jobId) => setSubview({ kind: "detail", jobId });

  const shared = {
    state, me, myDay, workdayRunning, activeJob, lastFix, gpsError, todayKey, now,
    startWorkday, endWorkday, startTimer, stopTimer, toggleMow, openJob,
    onAddJob: () => setSubview({ kind: "form" }),
    onUpdateJob: updateJob,
    onAddProspect: addProspect,
    onUpdateProspect: updateProspect,
    onDeleteProspect: deleteProspect,
    onConvertProspect: convertProspect,
    onAddExpense: addExpense,
    onDeleteExpense: deleteExpense,
    showToast,
  };

  const renderScreen = () => {
    if (effectiveSubview?.kind === "form") {
      const subJobId = effectiveSubview.jobId;
      return (
        <JobForm
          job={state.jobs.find((j) => j.id === subJobId) || null}
          prefill={effectiveSubview.prefill || null}
          settings={state.settings}
          onSave={(data) => upsertJob(data, subJobId)}
          onBack={() => setSubview(subJobId ? { kind: "detail", jobId: subJobId } : null)}
        />
      );
    }
    if (effectiveSubview?.kind === "detail") {
      return (
        <JobDetail
          {...shared}
          job={detailJob}
          onEdit={() => setSubview({ kind: "form", jobId: detailJob.id })}
          onDelete={() => deleteJob(detailJob.id)}
          onBack={() => setSubview(null)}
        />
      );
    }
    if (tab === "jobs") return <JobsView {...shared} />;
    if (tab === "route") return <RouteView {...shared} />;
    if (tab === "crew") return <CrewView {...shared} onAddEmployee={addEmployee} onRemoveEmployee={removeEmployee} onSwitchEmployee={switchEmployee} onJoinCrew={joinCrew} getInviteCode={() => encodeCrewInvite(state)} />;
    if (tab === "settings") {
      return <SettingsView {...shared} onUpdateSettings={updateSettings} onRestore={restoreState} onSwitchEmployee={switchEmployee} />;
    }
    return <TodayView {...shared} onGoRoute={() => setTab("route")} />;
  };

  return (
    <div className="app">
      {toast && (
        <div style={{ position: "fixed", top: "calc(10px + env(safe-area-inset-top))", left: 16, right: 16, zIndex: 50, maxWidth: 528, margin: "0 auto" }}>
          <div className={`banner banner-${toast.tone}`} style={{ boxShadow: "var(--shadow-float)" }}>{toast.text}</div>
        </div>
      )}

      {/* Bottom nav hint */}
      <div style={{ display: "flex", justifyContent: "center", gap: 12, padding: "20px 12px 8px", borderTop: "1px solid #e2e8f0", marginTop: 16, flexWrap: "wrap" }}>
        <button style={styles.navBtn} onClick={() => setView("priority")}>📋 Priority</button>
        <button style={styles.navBtn} onClick={() => setView("crew")}>👥 Crew</button>
        <button style={styles.navBtn} onClick={() => setView("route")}>🗺 Route</button>
        <button style={styles.navBtn} onClick={() => setView("analytics")}>📊 Analytics</button>
        <button style={styles.navBtn} onClick={() => setView("invoice")}>🧾 Invoice</button>
        <button style={styles.navBtn} onClick={() => setView("settings")}>⚙️ Settings</button>
      </div>
    </div>
  );
}

const styles = {
  page: { background: "#f8fafb", minHeight: "100vh", color: "#1e293b", fontFamily: "'Inter', system-ui, sans-serif", paddingBottom: "max(40px, env(safe-area-inset-bottom))" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 16px 12px", borderBottom: "1px solid #e2e8f0", background: "#fff" },
  brand: { fontSize: 17, fontWeight: 700, color: "#22c55e", letterSpacing: "-0.3px" },
  subBrand: { fontSize: 10, color: "#64748b", marginTop: 1 },
  headerTitle: { fontSize: 16, fontWeight: 600, color: "#1e293b", margin: 0 },
  addBtn: { background: "#22c55e", color: "#fff", border: "none", borderRadius: 8, padding: "7px 12px", fontWeight: 700, fontSize: 12, cursor: "pointer" },
  iconBtn: { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 10px", fontSize: 15, cursor: "pointer", color: "#1e293b" },
  backBtn: { background: "none", border: "none", color: "#22c55e", fontSize: 14, cursor: "pointer", padding: 0 },
  editBtn: { background: "none", border: "1px solid #cbd5e1", color: "#64748b", borderRadius: 6, padding: "5px 10px", fontSize: 12, cursor: "pointer" },
  summaryRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, padding: "10px 16px" },
  summaryCard: { background: "#fff", borderRadius: 10, padding: "10px 6px", textAlign: "center", border: "1px solid #e2e8f0" },
  summaryVal: { fontSize: 17, fontWeight: 700, color: "#22c55e" },
  summaryLbl: { fontSize: 9, color: "#64748b", marginTop: 3, lineHeight: 1.3 },
  activeTimerBanner: { background: "#fef3c7", border: "1px solid #f59e0b", borderRadius: 8, margin: "0 16px 8px", padding: "10px 14px", color: "#92400e", fontSize: 13 },
  jobList: { padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 },
  jobCard: { background: "#fff", borderRadius: 10, padding: "13px 14px", display: "flex", justifyContent: "space-between", cursor: "pointer", border: "1px solid #e2e8f0", boxShadow: "0 1px 2px rgba(0,0,0,0.04)" },
  jobCardLeft: { flex: 1 },
  jobCardRight: { textAlign: "right", minWidth: 70 },
  jobName: { fontWeight: 600, fontSize: 15, color: "#1e293b", marginBottom: 2 },
  jobAddr: { fontSize: 11, color: "#64748b", marginBottom: 3 },
  jobMeta: { fontSize: 12, color: "#78909c" },
  jobPay: { fontWeight: 700, color: "#22c55e", fontSize: 15 },
  jobSessions: { fontSize: 11, color: "#64748b", marginTop: 3 },
  emptyState: { textAlign: "center", padding: "50px 20px", color: "#94a3b8" },
  card: { background: "#fff", borderRadius: 12, padding: 16, margin: "0 16px 10px", border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.06)" },
  label: { fontSize: 12, color: "#475569", marginBottom: 5, display: "block", fontWeight: 500 },
  input: { width: "100%", background: "#fff", border: "1px solid #cbd5e1", borderRadius: 8, color: "#1e293b", fontSize: 14, padding: "10px 12px", marginBottom: 12, boxSizing: "border-box", fontFamily: "inherit" },
  primaryBtn: { width: "100%", background: "#22c55e", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  address: { color: "#64748b", fontSize: 12, padding: "2px 16px 8px", margin: 0 },
  statRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 },
  stat: { textAlign: "center" },
  statVal: { fontSize: 19, fontWeight: 700, color: "#1e293b" },
  statLbl: { fontSize: 10, color: "#64748b", marginTop: 3 },
  rateBar: { height: 6, background: "#e2e8f0", borderRadius: 3, overflow: "hidden" },
  rateBarFill: { height: "100%", borderRadius: 3, transition: "width 0.5s" },
  rateHint: { fontSize: 12, color: "#64748b", marginTop: 6 },
  rowBetween: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  checkBtn: { borderRadius: 8, padding: "8px 14px", fontSize: 13, cursor: "pointer", color: "#fff", fontWeight: 600, background: "#22c55e", border: "none" },
  timerDisplay: { fontSize: 38, fontWeight: 700, color: "#22c55e", fontVariantNumeric: "tabular-nums", marginBottom: 6 },
  locText: { fontSize: 11, color: "#64748b", marginBottom: 12 },
  startBtn: { width: "100%", background: "#dcfce7", border: "1px solid #22c55e", color: "#16a34a", borderRadius: 10, padding: 13, fontWeight: 700, fontSize: 15, cursor: "pointer" },
  stopBtn: { background: "#fee2e2", border: "1px solid #ef4444", color: "#dc2626", borderRadius: 10, padding: "12px 28px", fontWeight: 700, fontSize: 15, cursor: "pointer" },
  sectionTitle: { fontWeight: 600, fontSize: 13, color: "#1e293b", marginBottom: 10, textTransform: "uppercase", letterSpacing: "0.05em" },
  empty: { color: "#94a3b8", fontSize: 13, textAlign: "center", padding: "12px 0" },
  sessionRow: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #e2e8f0" },
  totalRow: { display: "flex", justifyContent: "space-between", paddingTop: 10, color: "#64748b", fontSize: 13, fontWeight: 600 },
  deleteBtn: { display: "block", margin: "16px auto 0", background: "none", border: "1px solid #fca5a5", color: "#dc2626", borderRadius: 8, padding: "10px 24px", fontSize: 13, cursor: "pointer" },
  dayStat: { background: "#f1f5f9", borderRadius: 8, padding: "8px 4px", textAlign: "center", border: "1px solid #e2e8f0" },
  dayStatVal: { fontSize: 16, fontWeight: 700, color: "#1e293b" },
  dayStatLbl: { fontSize: 9, color: "#64748b", marginTop: 2 },
  routeStop: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #e2e8f0" },
  routeDot: { width: 10, height: 10, borderRadius: "50%", background: "#22c55e", flexShrink: 0 },
  routeJobRow: { display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: "1px solid #e2e8f0" },
  routeNumBadge: { width: 26, height: 26, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, background: "#22c55e" },
  mapsBtn: { display: "block", background: "#f0f9ff", border: "1px solid #bfdbfe", color: "#0369a1", borderRadius: 10, padding: "13px", fontWeight: 600, fontSize: 14, textAlign: "center", textDecoration: "none", marginBottom: 12 },
  navBtn: { background: "none", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", padding: "4px 8px" },
};
      {renderScreen()}
      {!effectiveSubview && (
        <nav className="tabbar">
          <div className="tabbar-inner">
            {TABS.map(({ id, label, Icon }) => (
              <button key={id} className={`tab${tab === id ? " active" : ""}`} onClick={() => { setTab(id); setSubview(null); }}>
                <Icon size={21} strokeWidth={tab === id ? 2.4 : 2} />
                {label}
              </button>
            ))}
          </div>
        </nav>
      )}
    </div>
  );
}
