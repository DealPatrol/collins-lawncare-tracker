import { useMemo, useState } from "react";
import { todaysCrewDays } from "../store.js";
import {
  formatDuration, formatMiles, formatMoney, formatTime, getWeekKey, lastNDayKeys,
} from "../utils.js";
import { IconUsers, IconTrophy, IconPlus, IconTrash, IconCheck, IconCopy, IconExternal, IconSend } from "../icons.jsx";

function InviteCrew({ getInviteCode, onJoinCrew, showToast }) {
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);

  const copyInvite = async () => {
    const code = getInviteCode();
    try {
      await navigator.clipboard.writeText(code);
      showToast("Invite code copied — text or AirDrop it to your crew.");
    } catch {
      showToast("Could not copy on this device.", "amber");
    }
  };

  const shareInvite = async () => {
    const code = getInviteCode();
    try {
      await navigator.share({ text: code, title: "Collins Lawncare crew invite" });
    } catch { /* user cancelled the share sheet */ }
  };

  const join = () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const { addedJobs, addedEmployees } = onJoinCrew(joinCode);
      if (!addedJobs && !addedEmployees) {
        showToast("Nothing new in that code — you already have all of it.", "amber");
      } else {
        showToast(
          `Added ${addedJobs} job${addedJobs === 1 ? "" : "s"} and ${addedEmployees} crew member${addedEmployees === 1 ? "" : "s"}.`
        );
      }
      setJoinCode("");
    } catch (e) {
      showToast(e.message || "Invalid invite code.", "red");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="card">
      <div className="section-title"><IconSend size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Invite Crew</div>
      <p className="text-dim" style={{ fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>
        Share your job list so a new crew member&apos;s phone starts with the same yards — no retyping addresses.
        Each phone still tracks its own time separately after that.
      </p>
      <div className="stat-grid-2" style={{ marginBottom: 14 }}>
        <button className="btn btn-primary" onClick={copyInvite}><IconCopy size={15} />Copy Invite Code</button>
        {typeof navigator.share === "function" && (
          <button className="btn btn-ghost" onClick={shareInvite}><IconExternal size={15} />Share</button>
        )}
      </div>
      <div className="divider" />
      <label className="field-label">Have a code from your crew?</label>
      <textarea
        className="input" rows={3} placeholder="Paste the invite code here"
        value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
        style={{ resize: "vertical", fontSize: 12.5 }}
      />
      <button className="btn btn-ghost btn-block" disabled={!joinCode.trim() || joining} onClick={join}>
        Join Crew
      </button>
    </div>
  );
}

function collectStats(state, dayKeys) {
  const stats = {};
  const ensure = (id) => {
    if (!stats[id]) stats[id] = { distance: 0, jobsDone: 0, pay: 0, workSec: 0, outSec: 0 };
    return stats[id];
  };

  dayKeys.forEach((dayKey) => {
    const crew = state.workdays?.[dayKey] || {};
    Object.entries(crew).forEach(([empId, day]) => {
      const s = ensure(empId);
      s.distance += day.distanceMeters || 0;
      if (day.start) s.outSec += Math.floor(((day.end ?? Date.now()) - day.start) / 1000);
    });
  });

  state.jobs.forEach((job) => {
    (job.sessions || []).forEach((sess) => {
      if (!sess.employeeId || !dayKeys.includes(sess.dayKey)) return;
      const s = ensure(sess.employeeId);
      s.jobsDone += 1;
      s.pay += sess.pay || 0;
      s.workSec += sess.duration || 0;
    });
  });

  return stats;
}

export default function CrewView({ state, me, onAddEmployee, onRemoveEmployee, onSwitchEmployee, onJoinCrew, getInviteCode, showToast }) {
  const [range, setRange] = useState("today"); // today | week
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("crew");
  const [confirmRemove, setConfirmRemove] = useState(null);

  const dayKeys = useMemo(() => {
    if (range === "today") return lastNDayKeys(1);
    const weekStart = getWeekKey();
    return lastNDayKeys(7).filter((k) => k >= weekStart);
  }, [range]);

  const stats = useMemo(() => collectStats(state, dayKeys), [state, dayKeys]);

  const ranked = useMemo(() => {
    return [...state.employees]
      .map((e) => ({ ...e, ...(stats[e.id] || { distance: 0, jobsDone: 0, pay: 0, workSec: 0, outSec: 0 }) }))
      .sort((a, b) => b.distance - a.distance || b.jobsDone - a.jobsDone);
  }, [state.employees, stats]);

  const crewToday = todaysCrewDays(state);
  const anyDistance = ranked.some((e) => e.distance > 0);

  const add = () => {
    if (!newName.trim()) return;
    onAddEmployee(newName, newRole);
    setNewName("");
    showToast(`${newName.trim()} added to the crew.`);
  };

  return (
    <>
      <div className="header">
        <h1 className="header-title">Crew</h1>
        <span className="badge badge-dim"><IconUsers size={13} />{state.employees.length}</span>
      </div>

      <div className="screen">
        {/* Distance leaderboard */}
        <div className="card">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div className="section-title" style={{ margin: 0 }}>
              <IconTrophy size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Distance Leaderboard
            </div>
          </div>
          <div className="seg-control">
            <button className={`seg-option${range === "today" ? " active" : ""}`} onClick={() => setRange("today")}>Today</button>
            <button className={`seg-option${range === "week" ? " active" : ""}`} onClick={() => setRange("week")}>This Week</button>
          </div>
          {ranked.map((e, i) => (
            <div key={e.id} className="list-row">
              <div className={`rank-badge${i < 3 && e.distance > 0 ? ` rank-${i + 1}` : ""}`}>{i + 1}</div>
              <div className="crew-avatar" style={{ background: e.color, width: 34, height: 34, fontSize: 14 }}>{e.name[0]?.toUpperCase()}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>
                  {e.name}{e.id === me.id && <span className="text-faint" style={{ fontWeight: 500 }}> (you)</span>}
                </div>
                <div className="text-faint" style={{ fontSize: 12 }}>
                  {e.jobsDone} yard{e.jobsDone === 1 ? "" : "s"} · {formatDuration(e.workSec)} on the mower · {formatMoney(e.pay)}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="text-blue" style={{ fontWeight: 800, fontSize: 15 }}>{formatMiles(e.distance)}</div>
                <div className="text-faint" style={{ fontSize: 10.5 }}>covered</div>
              </div>
            </div>
          ))}
          {!anyDistance && (
            <p className="text-faint" style={{ fontSize: 12, marginTop: 8, lineHeight: 1.5 }}>
              Miles rack up automatically while a workday is clocked in on each member&apos;s phone. Leaderboard data is per-device — see Invite Crew below to get everyone on the same job list.
            </p>
          )}
        </div>

        <InviteCrew getInviteCode={getInviteCode} onJoinCrew={onJoinCrew} showToast={showToast} />

        {/* Live crew status (today) */}
        <div className="card">
          <div className="section-title">Today&apos;s Activity</div>
          {state.employees.filter((e) => crewToday[e.id]).length === 0 && (
            <div className="empty-state" style={{ padding: "14px 0" }}>Nobody has clocked in on this device today.</div>
          )}
          {state.employees.map((e) => {
            const day = crewToday[e.id];
            if (!day) return null;
            const running = day.start && !day.end;
            const stops = (day.stops || []).filter((s) => s.departTime);
            return (
              <div key={e.id} className="list-row">
                <div className="crew-avatar" style={{ background: e.color, width: 34, height: 34, fontSize: 14 }}>{e.name[0]?.toUpperCase()}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 700, fontSize: 14.5, display: "flex", alignItems: "center", gap: 7 }}>
                    {e.name}
                    {running
                      ? <span className="badge badge-green" style={{ padding: "2px 8px", fontSize: 10.5 }}><span className="dot dot-pulse" style={{ background: "var(--green)" }} />Out now</span>
                      : <span className="badge badge-dim" style={{ padding: "2px 8px", fontSize: 10.5 }}>Done {formatTime(day.end)}</span>}
                  </div>
                  <div className="text-faint" style={{ fontSize: 12, marginTop: 2 }}>
                    Out {formatTime(day.start)} · {stops.length} stop{stops.length === 1 ? "" : "s"} · {formatMiles(day.distanceMeters)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Manage crew */}
        <div className="card">
          <div className="section-title">Manage Crew</div>
          {state.employees.map((e) => (
            <div key={e.id} className="list-row">
              <div className="crew-avatar" style={{ background: e.color, width: 34, height: 34, fontSize: 14 }}>{e.name[0]?.toUpperCase()}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14.5 }}>{e.name}</div>
                <div className="text-faint" style={{ fontSize: 12 }}>{e.role === "manager" ? "Crew Manager" : "Crew Member"}</div>
              </div>
              {e.id !== me.id && (
                <button className="btn btn-ghost btn-sm" onClick={() => onSwitchEmployee(e.id)}>Use</button>
              )}
              {e.id === me.id ? (
                <span className="badge badge-green"><IconCheck size={12} />Active</span>
              ) : confirmRemove === e.id ? (
                <button className="btn btn-danger btn-sm" onClick={() => { onRemoveEmployee(e.id); setConfirmRemove(null); }}>Sure?</button>
              ) : (
                <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => setConfirmRemove(e.id)} title="Remove">
                  <IconTrash size={15} />
                </button>
              )}
            </div>
          ))}
          <div className="divider" />
          <label className="field-label">Add crew member</label>
          <input className="input" placeholder="Name" value={newName} onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} />
          <div className="seg-control">
            <button className={`seg-option${newRole === "crew" ? " active" : ""}`} onClick={() => setNewRole("crew")}>Crew Member</button>
            <button className={`seg-option${newRole === "manager" ? " active" : ""}`} onClick={() => setNewRole("manager")}>Crew Manager</button>
          </div>
          <button className="btn btn-primary btn-block" disabled={!newName.trim()} onClick={add}>
            <IconPlus size={15} />Add to Crew
          </button>
        </div>
      </div>
    </>
  );
}
