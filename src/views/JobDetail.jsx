import { useState } from "react";
import { useAuth } from "../useAuth.js";
import { getFirebaseAuth } from "../firebase.js";
import { createPortalLink } from "../portal.js";
import {
  formatClock, formatDuration, formatMoney, getAvgTime, getHourlyRate,
  getTotalTime, isMowedThisWeek, priorityMeta, rateColorClass,
} from "../utils.js";
import {
  IconChevronLeft, IconEdit, IconPin, IconPlay, IconStop, IconTarget,
  IconTrash, IconCheck, IconAlert, IconExternal,
} from "../icons.jsx";

export default function JobDetail({
  state, me, job, activeJob, now, startTimer, stopTimer, toggleMow,
  onEdit, onDelete, onBack, showToast,
}) {
  const { settings } = state;
  const { user, firebaseEnabled } = useAuth();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [portalBusy, setPortalBusy] = useState(false);

  const rate = getHourlyRate(job);
  const avgSec = getAvgTime(job);
  const mowed = isMowedThisWeek(job);
  const isRunning = activeJob?.id === job.id;
  const otherRunning = activeJob && activeJob.id !== job.id;
  const elapsed = isRunning && now ? Math.max(0, Math.floor((now - job.currentSessionStart) / 1000)) : 0;
  const radius = job.radius || settings.geofenceRadius;

  const empName = (id) => state.employees.find((e) => e.id === id)?.name;

  const mapsUrl = job.address || job.coords
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(job.address || `${job.coords.lat},${job.coords.lng}`)}`
    : null;

  const sharePortalLink = async () => {
    if (!firebaseEnabled || !user) {
      showToast?.("Sign in to share a customer portal link.", "amber");
      return;
    }
    setPortalBusy(true);
    try {
      const idToken = await getFirebaseAuth().currentUser.getIdToken();
      const { url } = await createPortalLink({
        jobId: job.id,
        customerEmail: job.customerEmail || null,
        idToken,
      });
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        showToast?.("Portal link copied to clipboard.");
      } else {
        showToast?.("Portal link created — copy from the browser address bar after opening.");
        window.prompt("Customer portal link:", url);
      }
    } catch (err) {
      showToast?.(err?.message || "Could not create portal link.", "red");
    } finally {
      setPortalBusy(false);
    }
  };

  return (
    <>
      <div className="header">
        <button className="link-btn" onClick={onBack}><IconChevronLeft size={18} />Back</button>
        <h1 className="header-title" style={{ maxWidth: "55%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{job.name}</h1>
        <button className="icon-btn" onClick={onEdit} title="Edit job"><IconEdit size={17} /></button>
      </div>

      <div className="screen">
        {job.priority && job.priority !== "normal" && (
          <div className="row-between" style={{ margin: "0 2px 10px" }}>
            <span className={`badge ${priorityMeta(job.priority).cls}`}>{priorityMeta(job.priority).label}</span>
          </div>
        )}
        {(job.address || mapsUrl) && (
          <div className="row-between" style={{ margin: "0 2px 12px" }}>
            <span className="text-dim" style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 5 }}>
              <IconPin size={14} />{job.address || "GPS pin only"}
            </span>
            {mapsUrl && (
              <a className="link-btn" style={{ fontSize: 13 }} href={mapsUrl} target="_blank" rel="noreferrer">
                Navigate<IconExternal size={13} />
              </a>
            )}
          </div>
        )}

        {/* Stats */}
        <div className="card">
          <div className="stat-grid">
            <div className="stat-tile stat-tile-flat">
              <div className="stat-value">{formatMoney(job.pay)}</div>
              <div className="stat-label">PER VISIT</div>
            </div>
            <div className="stat-tile stat-tile-flat">
              <div className={`stat-value ${rate > 0 ? rateColorClass(rate) : ""}`}>{rate > 0 ? `$${rate.toFixed(0)}` : "—"}</div>
              <div className="stat-label">$ / HOUR</div>
            </div>
            <div className="stat-tile stat-tile-flat">
              <div className="stat-value">{avgSec ? formatDuration(avgSec) : "—"}</div>
              <div className="stat-label">AVG TIME</div>
            </div>
          </div>
          {rate > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: `${Math.min(100, (rate / 80) * 100)}%`, background: rate >= 60 ? "var(--green)" : rate >= 40 ? "var(--amber)" : "var(--red)" }} />
              </div>
              <div className="text-dim" style={{ fontSize: 12.5, marginTop: 7 }}>
                {rate < 40 && "Below target — consider raising the price or tightening the workflow."}
                {rate >= 40 && rate < 60 && "Fair rate — a little room to improve."}
                {rate >= 60 && "Strong rate — this yard is priced well."}
              </div>
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="card" style={isRunning ? { borderColor: "var(--green-border)" } : undefined}>
          {isRunning ? (
            <div className="timer-hero">
              <div className="timer-clock">{formatClock(elapsed)}</div>
              <div className="timer-sub">Tracking as <strong>{empName(job.currentSessionEmployeeId) || me.name}</strong></div>
              {settings.autoStop && job.coords && (
                <div className="geofence-note"><IconTarget size={14} />Auto-stops when you leave the {radius} m zone</div>
              )}
              <button className="btn btn-danger btn-block btn-lg" style={{ marginTop: 14 }} onClick={() => stopTimer(job.id)}>
                <IconStop size={16} />Stop & Save Now
              </button>
            </div>
          ) : (
            <>
              <button className="btn btn-primary btn-block btn-lg" disabled={otherRunning} onClick={() => startTimer(job.id)}>
                <IconPlay size={16} />
                {otherRunning ? `Timer running on ${activeJob.name}` : "Start Timer"}
              </button>
              {settings.autoStop && !job.coords && (
                <div className="geofence-note" style={{ marginTop: 10 }}>
                  <IconAlert size={13} />No GPS pin — edit the job to enable auto-stop
                </div>
              )}
            </>
          )}
          <div className="divider" />
          <div className="row-between">
            <span style={{ fontSize: 14, fontWeight: 600 }} className={mowed ? "text-good" : "text-dim"}>
              {mowed ? "✓ Mowed this week" : "Not mowed this week"}
            </span>
            <button className={`btn btn-sm ${mowed ? "btn-ghost" : "btn-blue"}`} onClick={() => toggleMow(job.id)}>
              {mowed ? "Unmark" : <><IconCheck size={14} />Mark Mowed</>}
            </button>
          </div>
        </div>

        {firebaseEnabled && user && (
          <div className="card">
            <div className="section-title">Customer Portal</div>
            <p className="text-dim" style={{ fontSize: 12.5, marginBottom: 12, lineHeight: 1.5 }}>
              Share a secure link so the customer can view job details and pay their invoice.
            </p>
            <button className="btn btn-ghost btn-block" disabled={portalBusy} onClick={sharePortalLink}>
              {portalBusy ? "Creating link…" : "Copy Portal Link"}
            </button>
          </div>
        )}

        {job.notes && (
          <div className="card card-tight">
            <div className="section-title">Notes</div>
            <p style={{ fontSize: 14, lineHeight: 1.55, whiteSpace: "pre-wrap" }}>{job.notes}</p>
          </div>
        )}

        {/* History */}
        <div className="card">
          <div className="section-title">Visit History</div>
          {!(job.sessions || []).length && <div className="empty-state" style={{ padding: "16px 0" }}>No visits recorded yet.</div>}
          {[...(job.sessions || [])].reverse().slice(0, 30).map((s, i) => (
            <div key={i} className="list-row">
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{s.date}</div>
                <div className="text-faint" style={{ fontSize: 11.5, display: "flex", gap: 8, marginTop: 2 }}>
                  {empName(s.employeeId) && <span>{empName(s.employeeId)}</span>}
                  {s.auto && <span className="badge badge-blue" style={{ padding: "1px 7px", fontSize: 10 }}>auto-stopped</span>}
                  {s.location && !s.auto && <span>GPS logged</span>}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div className="text-good" style={{ fontWeight: 700, fontSize: 14 }}>{formatDuration(s.duration)}</div>
                <div className="text-faint" style={{ fontSize: 12 }}>{formatMoney(s.pay)}</div>
              </div>
            </div>
          ))}
          {!!(job.sessions || []).length && (
            <div className="row-between" style={{ paddingTop: 12 }}>
              <span className="text-dim" style={{ fontSize: 13, fontWeight: 700 }}>Lifetime</span>
              <span style={{ fontSize: 13, fontWeight: 700 }}>
                {formatDuration(getTotalTime(job))} · <span className="text-good">{formatMoney((job.sessions || []).reduce((a, s) => a + (s.pay || 0), 0))}</span>
              </span>
            </div>
          )}
        </div>

        {confirmDelete ? (
          <div className="banner banner-red" style={{ justifyContent: "space-between" }}>
            <span>Delete <strong>{job.name}</strong> and its history?</span>
            <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button className="btn btn-danger btn-sm" onClick={onDelete}>Delete</button>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>Keep</button>
            </span>
          </div>
        ) : (
          <button className="btn btn-ghost btn-block" style={{ color: "var(--red)" }} onClick={() => setConfirmDelete(true)}>
            <IconTrash size={15} />Remove Job
          </button>
        )}
        <div style={{ height: 16 }} />
      </div>
    </>
  );
}
