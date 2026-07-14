import { useMemo, useState } from "react";
import {
  formatDuration, formatMoney, getAvgTime, getHourlyRate, isMowedThisWeek, rateColorClass,
} from "../utils.js";
import { IconLeaf, IconPlus, IconPin, IconCheck, IconClock } from "../icons.jsx";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "pending", label: "To Do" },
  { id: "done", label: "Done" },
];

export default function JobsView({ state, activeJob, openJob, onAddJob }) {
  const { jobs } = state;
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      if (filter === "pending" && isMowedThisWeek(j)) return false;
      if (filter === "done" && !isMowedThisWeek(j)) return false;
      if (q && !`${j.name} ${j.address || ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [jobs, query, filter]);

  const doneCount = jobs.filter(isMowedThisWeek).length;

  return (
    <>
      <div className="header">
        <h1 className="header-title">Jobs</h1>
        <button className="btn btn-primary btn-sm" onClick={onAddJob}><IconPlus size={15} />New Job</button>
      </div>

      <div className="screen">
        {jobs.length > 3 && (
          <input className="input" placeholder="Search yards or addresses…" value={query} onChange={(e) => setQuery(e.target.value)} style={{ marginBottom: 10 }} />
        )}

        {jobs.length > 0 && (
          <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className={`badge ${filter === f.id ? "badge-green" : "badge-dim"}`}
                style={{ border: "none", cursor: "pointer", padding: "7px 14px", fontSize: 12.5 }}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                {f.id === "pending" && ` (${jobs.length - doneCount})`}
                {f.id === "done" && ` (${doneCount})`}
              </button>
            ))}
          </div>
        )}

        {jobs.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon"><IconLeaf size={44} /></div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>No yards yet</div>
            <div style={{ fontSize: 13.5, marginBottom: 16 }}>Add every yard you service — name, pay, and a GPS pin.</div>
            <button className="btn btn-primary" onClick={onAddJob}>Add First Job</button>
          </div>
        )}

        {filtered.map((j) => {
          const mowed = isMowedThisWeek(j);
          const rate = getHourlyRate(j);
          const running = activeJob?.id === j.id;
          return (
            <div key={j.id} className={`job-card ${running ? "running" : mowed ? "done" : "pending"}`} onClick={() => openJob(j.id)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="job-name">{j.name}</div>
                {j.address && <div className="job-addr">{j.address}</div>}
                <div className="job-meta">
                  {running ? (
                    <span className="badge badge-green" style={{ padding: "2px 8px" }}>
                      <span className="dot dot-pulse" style={{ background: "var(--green)" }} />Running
                    </span>
                  ) : (
                    <span className={mowed ? "text-good" : "text-faint"} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      {mowed ? <IconCheck size={13} /> : <IconClock size={13} />}
                      {mowed ? "Done this week" : "To do"}
                    </span>
                  )}
                  {getAvgTime(j) > 0 && <span className="text-faint">~{formatDuration(getAvgTime(j))}</span>}
                  {j.coords && <span className="text-faint" style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><IconPin size={12} />pinned</span>}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 16 }}>{formatMoney(j.pay)}</div>
                {rate > 0 && <div className={rateColorClass(rate)} style={{ fontSize: 12.5, fontWeight: 700 }}>${rate.toFixed(0)}/hr</div>}
                <div className="text-faint" style={{ fontSize: 11, marginTop: 2 }}>{(j.sessions || []).length} visits</div>
              </div>
            </div>
          );
        })}

        {jobs.length > 0 && filtered.length === 0 && (
          <div className="empty-state" style={{ padding: "28px 20px" }}>No jobs match.</div>
        )}
      </div>
    </>
  );
}
