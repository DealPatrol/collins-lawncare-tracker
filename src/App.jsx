import { useCallback, useEffect, useRef, useState } from "react";
import { loadState, saveState, getWorkday, setWorkday, pruneWorkdays, makeEmployee, makeProspect } from "./store.js";
import { getTodayKey, getWeekKey } from "./utils.js";
import { getCurrentCoords } from "./location.js";
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
  const [arriveSuggestion, setArriveSuggestion] = useState(null); // job
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
    setArriveSuggestion(null);
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

  const deleteJob = (jobId) => {
    setState((s) => ({ ...s, jobs: s.jobs.filter((j) => j.id !== jobId) }));
    setSubview(null);
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
    setArriveSuggestion(null);
  };

  const stopTimer = useCallback((jobId, { auto = false } = {}) => {
    const now = Date.now();
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
  }, [meId, showToast]);

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

  const onAutoStop = useCallback((job) => stopTimer(job.id, { auto: true }), [stopTimer]);
  const onArrive = useCallback((job) => {
    if (navigator.vibrate) navigator.vibrate(80);
    setArriveSuggestion(job);
  }, []);

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
    setArriveSuggestion(null);
  };

  const restoreState = (next) => {
    setState(next);
    setSubview(null);
    setTab("today");
    showToast("Backup restored.");
  };

  // Treat a detail subview whose job no longer exists as closed.
  const detailJob = subview?.kind === "detail" ? state.jobs.find((j) => j.id === subview.jobId) : null;
  const effectiveSubview = subview?.kind === "detail" && !detailJob ? null : subview;

  // ── Render ──
  if (!state.employees.length || !me) {
    return <Onboarding employees={state.employees} onCreate={addEmployee} onPick={switchEmployee} />;
  }

  const openJob = (jobId) => setSubview({ kind: "detail", jobId });

  const shared = {
    state, me, myDay, workdayRunning, activeJob, lastFix, gpsError, todayKey, now,
    startWorkday, endWorkday, startTimer, stopTimer, toggleMow, openJob,
    onAddJob: () => setSubview({ kind: "form" }),
    onAddProspect: addProspect,
    onUpdateProspect: updateProspect,
    onDeleteProspect: deleteProspect,
    onConvertProspect: convertProspect,
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
    if (tab === "crew") return <CrewView {...shared} onAddEmployee={addEmployee} onRemoveEmployee={removeEmployee} onSwitchEmployee={switchEmployee} />;
    if (tab === "settings") {
      return <SettingsView {...shared} onUpdateSettings={updateSettings} onRestore={restoreState} onSwitchEmployee={switchEmployee} />;
    }
    return <TodayView {...shared} arriveSuggestion={arriveSuggestion} onDismissArrive={() => setArriveSuggestion(null)} onGoRoute={() => setTab("route")} />;
  };

  return (
    <div className="app">
      {toast && (
        <div style={{ position: "fixed", top: "calc(10px + env(safe-area-inset-top))", left: 16, right: 16, zIndex: 50, maxWidth: 528, margin: "0 auto" }}>
          <div className={`banner banner-${toast.tone}`} style={{ boxShadow: "var(--shadow-float)" }}>{toast.text}</div>
        </div>
      )}
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
