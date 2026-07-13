import { useEffect, useMemo, useState } from "react";
import {
  formatClock, formatDuration, formatMiles, formatMoney, formatTime,
  isMowedThisWeek, lastNDayKeys, haversineMeters, getAvgTime,
} from "../utils.js";
import { fetchWeather } from "../weather.js";
import {
  IconLeaf, IconPlay, IconStop, IconTruck, IconPin, IconTarget, IconZap,
  IconChevronRight, IconRoute, IconAlert,
} from "../icons.jsx";

export default function TodayView({
  state, me, myDay, workdayRunning, activeJob, lastFix, gpsError, now,
  startWorkday, endWorkday, startTimer, stopTimer, openJob,
  arriveSuggestion, onDismissArrive, onGoRoute, onAddJob,
}) {
  const { jobs, settings } = state;
  const [weather, setWeather] = useState(null);

  useEffect(() => {
    if (!settings.weather) return;
    const coords = settings.homeCoords || lastFix || jobs.find((j) => j.coords)?.coords;
    if (!coords) return;
    fetchWeather(coords).then(setWeather).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.weather, settings.homeCoords]);

  const dayElapsed = myDay?.start && now ? Math.max(0, Math.floor(((myDay.end ?? now) - myDay.start) / 1000)) : 0;
  const jobElapsed = activeJob?.currentSessionStart && now ? Math.max(0, Math.floor((now - activeJob.currentSessionStart) / 1000)) : 0;
  const workdayDone = !!(myDay?.start && myDay?.end);

  const myStops = myDay?.stops || [];
  const todayPay = myStops.reduce((a, st) => {
    const job = jobs.find((j) => j.id === st.jobId);
    return st.departTime && job ? a + job.pay : a;
  }, 0);

  const pending = jobs.filter((j) => !isMowedThisWeek(j));
  const doneCount = jobs.length - pending.length;

  // Nearest pending job from the last GPS fix (or home) — "what's next" hint.
  const nextUp = useMemo(() => {
    const origin = lastFix || settings.homeCoords;
    const candidates = pending.filter((j) => j.coords && j.id !== activeJob?.id);
    if (!origin || !candidates.length) return pending.find((j) => j.id !== activeJob?.id) || null;
    return [...candidates].sort((a, b) => haversineMeters(origin, a.coords) - haversineMeters(origin, b.coords))[0];
  }, [lastFix, settings.homeCoords, pending, activeJob]);

  // 7-day earnings sparkline from saved sessions.
  const week = useMemo(() => {
    const keys = lastNDayKeys(7);
    const byDay = Object.fromEntries(keys.map((k) => [k, 0]));
    jobs.forEach((j) => (j.sessions || []).forEach((s) => {
      if (s.dayKey && s.dayKey in byDay) byDay[s.dayKey] += s.pay || 0;
    }));
    const values = keys.map((k) => byDay[k]);
    return { keys, values, max: Math.max(...values, 1), total: values.reduce((a, b) => a + b, 0) };
  }, [jobs]);

  const weekRevenue = jobs.reduce((a, j) => (isMowedThisWeek(j) ? a + j.pay : a), 0);

  return (
    <>
      <div className="header">
        <div className="brand-row">
          <div className="brand-mark"><IconLeaf size={20} /></div>
          <div>
            <div className="brand-name">Collins Lawncare</div>
            <div className="brand-sub">{new Date().toLocaleDateString([], { weekday: "long", month: "long", day: "numeric" })}</div>
          </div>
        </div>
        <div className="crew-avatar" style={{ background: me.color, width: 36, height: 36, fontSize: 14 }} title={me.name}>
          {me.name[0]?.toUpperCase()}
        </div>
      </div>

      <div className="screen">
        {gpsError && (workdayRunning || activeJob) && (
          <div className="banner banner-amber"><IconAlert size={16} />{gpsError} — auto-stop and mileage paused.</div>
        )}

        {arriveSuggestion && !activeJob && (
          <div className="banner banner-blue" style={{ justifyContent: "space-between" }}>
            <span><IconPin size={15} style={{ verticalAlign: -2, marginRight: 6 }} />Arrived at <strong>{arriveSuggestion.name}</strong>?</span>
            <span style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button className="btn btn-primary btn-sm" onClick={() => startTimer(arriveSuggestion.id)}>Start</button>
              <button className="btn btn-ghost btn-sm" onClick={onDismissArrive}>Dismiss</button>
            </span>
          </div>
        )}

        {/* Weather */}
        {weather && settings.weather && (
          <div className="card card-tight">
            <div className="weather-strip">
              <span style={{ fontSize: 30 }}>{weather.icon}</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{weather.label} · H {weather.high}° L {weather.low}°</div>
                <div className="text-dim" style={{ fontSize: 12, marginTop: 2 }}>
                  {weather.rainChance >= 40
                    ? `Rain ${weather.rainChance}%${weather.rainAtHour ? ` around ${weather.rainAtHour}` : " today"} — plan around it`
                    : `Rain ${weather.rainChance}% · Wind ${weather.wind} mph — good mowing day`}
                </div>
              </div>
              <div className="weather-temp">{weather.temp}°</div>
            </div>
          </div>
        )}

        {/* Workday card */}
        <div className="card" style={workdayRunning ? { borderColor: "var(--green-border)" } : undefined}>
          <div className="row-between" style={{ marginBottom: myDay?.start ? 14 : 0 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, display: "flex", alignItems: "center", gap: 8 }}>
                {workdayRunning && <span className="dot dot-pulse" style={{ background: "var(--green)" }} />}
                {workdayRunning ? "Workday Running" : workdayDone ? "Workday Complete" : "Ready to Roll?"}
              </div>
              {!myDay?.start && <div className="text-faint" style={{ fontSize: 12, marginTop: 3 }}>Clock in when you leave the shop — GPS handles the rest</div>}
              {myDay?.start && (
                <div className="text-faint" style={{ fontSize: 12, marginTop: 3 }}>
                  Out {formatTime(myDay.start)}{myDay.end ? ` — In ${formatTime(myDay.end)}` : ""}
                </div>
              )}
            </div>
            {!myDay?.start && (
              <button className="btn btn-primary" onClick={startWorkday}><IconTruck size={17} />Clock In</button>
            )}
            {workdayRunning && (
              <button className="btn btn-danger btn-sm" onClick={endWorkday}>End Day</button>
            )}
          </div>

          {myDay?.start && (
            <div className="stat-grid">
              <div className="stat-tile stat-tile-flat">
                <div className="stat-value text-good">{formatClock(dayElapsed)}</div>
                <div className="stat-label">TIME OUT</div>
              </div>
              <div className="stat-tile stat-tile-flat">
                <div className="stat-value">{myStops.filter((s) => s.departTime).length}</div>
                <div className="stat-label">YARDS DONE</div>
              </div>
              <div className="stat-tile stat-tile-flat">
                <div className="stat-value text-blue">{formatMiles(myDay.distanceMeters)}</div>
                <div className="stat-label">DISTANCE</div>
              </div>
            </div>
          )}

          {myDay?.start && (
            <div className="row-between" style={{ marginTop: 12 }}>
              <span className="text-dim" style={{ fontSize: 13 }}>Earned today</span>
              <span className="text-good" style={{ fontWeight: 800, fontSize: 16 }}>{formatMoney(todayPay)}</span>
            </div>
          )}
        </div>

        {/* Active job timer */}
        {activeJob && (
          <div className="card" style={{ borderColor: "var(--green-border)" }}>
            <div className="row-between" style={{ marginBottom: 6 }}>
              <span className="badge badge-green"><span className="dot dot-pulse" style={{ background: "var(--green)" }} />ON THE JOB</span>
              <button className="link-btn" onClick={() => openJob(activeJob.id)}>Details<IconChevronRight size={15} /></button>
            </div>
            <div className="timer-hero">
              <div className="timer-clock">{formatClock(jobElapsed)}</div>
              <div className="timer-sub"><strong>{activeJob.name}</strong> · {formatMoney(activeJob.pay)} per visit</div>
              {settings.autoStop && activeJob.coords && (
                <div className="geofence-note">
                  <IconTarget size={14} />
                  Auto-stops when you leave the site ({activeJob.radius || settings.geofenceRadius} m zone)
                </div>
              )}
              {settings.autoStop && !activeJob.coords && (
                <div className="geofence-note"><IconAlert size={13} />No GPS pin on this job — add one to enable auto-stop</div>
              )}
              <button className="btn btn-danger btn-block btn-lg" style={{ marginTop: 14 }} onClick={() => stopTimer(activeJob.id)}>
                <IconStop size={16} />Stop & Save Now
              </button>
            </div>
          </div>
        )}

        {/* Next up */}
        {!activeJob && workdayRunning && nextUp && (
          <div className="card card-tight">
            <div className="row-between">
              <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                <div className="brand-mark" style={{ background: "var(--surface-2)", color: "var(--green)", boxShadow: "none" }}><IconZap size={18} /></div>
                <div style={{ minWidth: 0 }}>
                  <div className="text-faint" style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em" }}>NEXT UP</div>
                  <div style={{ fontWeight: 700, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{nextUp.name}</div>
                  <div className="text-faint" style={{ fontSize: 12 }}>
                    {lastFix && nextUp.coords ? `${formatMiles(haversineMeters(lastFix, nextUp.coords))} away · ` : ""}
                    {getAvgTime(nextUp) ? `~${formatDuration(getAvgTime(nextUp))} · ` : ""}{formatMoney(nextUp.pay)}
                  </div>
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => startTimer(nextUp.id)}><IconPlay size={14} />Start</button>
            </div>
          </div>
        )}

        {/* Week progress */}
        <div className="card">
          <div className="row-between" style={{ marginBottom: 10 }}>
            <div className="section-title" style={{ margin: 0 }}>This Week</div>
            <span className="badge badge-green">{formatMoney(weekRevenue)}</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: jobs.length ? `${(doneCount / jobs.length) * 100}%` : 0 }} />
          </div>
          <div className="row-between" style={{ marginTop: 8 }}>
            <span className="text-dim" style={{ fontSize: 12.5 }}>{doneCount} of {jobs.length} yards mowed</span>
            <button className="link-btn" style={{ fontSize: 13 }} onClick={onGoRoute}><IconRoute size={14} />Plan my route</button>
          </div>
        </div>

        {/* 7-day earnings */}
        <div className="card">
          <div className="row-between" style={{ marginBottom: 12 }}>
            <div className="section-title" style={{ margin: 0 }}>Last 7 Days</div>
            <span style={{ fontWeight: 800, fontSize: 15 }} className="text-good">{formatMoney(week.total)}</span>
          </div>
          <div className="spark-bars">
            {week.values.map((v, i) => (
              <div
                key={week.keys[i]}
                className={`spark-bar${i === 6 ? " today" : ""}`}
                style={{ height: `${Math.max(7, (v / week.max) * 100)}%`, opacity: v ? 1 : 0.25 }}
                title={`${week.keys[i]}: ${formatMoney(v)}`}
              />
            ))}
          </div>
          <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
            {week.keys.map((k) => {
              const [y, m, d] = k.split("-").map(Number);
              return (
                <div key={k} className="text-faint" style={{ flex: 1, textAlign: "center", fontSize: 9.5, fontWeight: 600 }}>
                  {new Date(y, m - 1, d).toLocaleDateString([], { weekday: "narrow" })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Today's stops */}
        {myStops.length > 0 && (
          <div className="card">
            <div className="section-title">Today&apos;s Stops</div>
            <div className="route-line">
              {myStops.map((st, i) => (
                <div key={i} className={`route-stop${st.departTime ? " done" : ""}`}>
                  <div className="row-between">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{st.jobName}</div>
                      <div className="text-faint" style={{ fontSize: 12 }}>
                        {formatTime(st.arrivalTime)}{st.departTime ? ` – ${formatTime(st.departTime)}` : " · in progress"}
                      </div>
                    </div>
                    <span className={st.departTime ? "text-good" : "text-warn"} style={{ fontWeight: 700, fontSize: 13 }}>
                      {st.duration ? formatDuration(st.duration) : "…"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {jobs.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon"><IconLeaf size={44} /></div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>No yards yet</div>
            <div style={{ fontSize: 13.5, marginBottom: 16 }}>Add your first job to start tracking time and pay.</div>
            <button className="btn btn-primary" onClick={onAddJob}>Add First Job</button>
          </div>
        )}

        {/* Pin count nudge */}
        {jobs.length > 0 && jobs.some((j) => !j.coords) && settings.autoStop && (
          <p className="text-faint" style={{ fontSize: 12, textAlign: "center", padding: "0 12px 8px", lineHeight: 1.5 }}>
            {jobs.filter((j) => !j.coords).length} job(s) have no GPS pin yet — open a job and tap
            &ldquo;Pin Current Location&rdquo; while you&apos;re there to unlock auto-stop and arrival detection.
          </p>
        )}
      </div>
    </>
  );
}
