import { useState } from "react";
import {
  estimateDriveMeters, estimateDriveSeconds, formatDuration, formatMiles,
  formatMoney, formatTime, getAvgTime, isMowedThisWeek, optimizeRoute,
} from "../utils.js";
import { IconHome, IconMap, IconExternal, IconPin, IconAlert, IconRoute } from "../icons.jsx";
import GrowthView from "./GrowthView.jsx";

const DEFAULT_CENTER = { lat: 34.0632, lng: -86.7686 };
const DEFAULT_JOB_SEC = 45 * 60; // planning estimate for yards with no history

export default function RouteView(props) {
  const { state, lastFix, openJob, now } = props;
  const { jobs, settings } = state;
  const [mode, setMode] = useState("plan");
  const origin = settings.homeCoords || lastFix || null;

  const pending = jobs.filter((j) => !isMowedThisWeek(j));
  const routable = pending.filter((j) => j.coords);
  const unroutable = pending.filter((j) => !j.coords);

  // Optimized plan with per-leg drive estimates and a rolling ETA.
  // (React Compiler memoizes this; the job counts are small anyway.)
  const ordered = optimizeRoute(origin || routable[0]?.coords, routable);
  const planStops = [];
  let cursor = origin || ordered[0]?.coords;
  let clock = now;
  let totalDriveM = 0;
  for (const job of ordered) {
    const driveSec = estimateDriveSeconds(cursor, job.coords);
    const driveM = estimateDriveMeters(cursor, job.coords);
    totalDriveM += driveM;
    clock += driveSec * 1000;
    const workSec = getAvgTime(job) || DEFAULT_JOB_SEC;
    planStops.push({ job, driveSec, driveM, eta: clock, workSec });
    clock += workSec * 1000;
    cursor = job.coords;
  }
  const homeSec = origin && cursor ? estimateDriveSeconds(cursor, origin) : 0;
  const homeM = origin && cursor ? estimateDriveMeters(cursor, origin) : 0;
  totalDriveM += homeM;
  const plan = { stops: planStops, homeSec, homeM, doneBy: clock + homeSec * 1000, totalDriveM };

  const totalPay = pending.reduce((a, j) => a + j.pay, 0);
  const totalWorkSec = plan.stops.reduce((a, s) => a + s.workSec, 0);

  const routeLocs = plan.stops.map(({ job }) => job.address || `${job.coords.lat},${job.coords.lng}`);
  let mapsUrl = null;
  if (routeLocs.length) {
    const home = settings.homeAddress || (settings.homeCoords ? `${settings.homeCoords.lat},${settings.homeCoords.lng}` : null);
    const originStr = home || routeLocs[0];
    const destStr = home || routeLocs[routeLocs.length - 1];
    const waypoints = routeLocs.map(encodeURIComponent).join("|");
    mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(originStr)}&destination=${encodeURIComponent(destStr)}&waypoints=${waypoints}&travelmode=driving`;
  }

  // OSM embed bounding box over all pins.
  const pts = [];
  if (settings.homeCoords) pts.push(settings.homeCoords);
  jobs.forEach((j) => j.coords && pts.push(j.coords));
  if (!pts.length) pts.push(DEFAULT_CENTER);
  const lats = pts.map((p) => p.lat);
  const lngs = pts.map((p) => p.lng);
  const pad = 0.02;
  const bbox = {
    str: `${Math.min(...lngs) - pad}%2C${Math.min(...lats) - pad}%2C${Math.max(...lngs) + pad}%2C${Math.max(...lats) + pad}`,
    center: { lat: lats.reduce((a, b) => a + b, 0) / lats.length, lng: lngs.reduce((a, b) => a + b, 0) / lngs.length },
    count: pts.length,
  };

  return (
    <>
      <div className="header">
        <h1 className="header-title">{mode === "plan" ? "Route Planner" : "Growth Zones"}</h1>
        {mode === "plan" && mapsUrl && (
          <a className="btn btn-blue btn-sm" href={mapsUrl} target="_blank" rel="noreferrer">
            <IconExternal size={14} />Google Maps
          </a>
        )}
      </div>

      <div className="screen">
        <div className="seg-control">
          <button className={`seg-option${mode === "plan" ? " active" : ""}`} onClick={() => setMode("plan")}>Today&apos;s Plan</button>
          <button className={`seg-option${mode === "growth" ? " active" : ""}`} onClick={() => setMode("growth")}>Growth Zones</button>
        </div>

        {mode === "growth" && <GrowthView {...props} />}

        {mode === "plan" && pending.length > 0 && (
          <div className="stat-grid" style={{ marginBottom: 12 }}>
            <div className="stat-tile">
              <div className="stat-value">{pending.length}</div>
              <div className="stat-label">STOPS LEFT</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value text-blue">{formatMiles(plan.totalDriveM)}</div>
              <div className="stat-label">EST. DRIVING</div>
            </div>
            <div className="stat-tile">
              <div className="stat-value text-good">{formatMoney(totalPay)}</div>
              <div className="stat-label">ON THE TABLE</div>
            </div>
          </div>
        )}

        {mode === "plan" && plan.stops.length > 0 && (
          <div className="card">
            <div className="row-between" style={{ marginBottom: 4 }}>
              <div className="section-title" style={{ margin: 0 }}><IconRoute size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Optimized Order</div>
              <span className="text-faint" style={{ fontSize: 12 }}>
                ~{formatDuration(totalWorkSec)} of work · done ≈ {formatTime(plan.doneBy)}
              </span>
            </div>
            <div className="route-line">
              {origin && (
                <div className="route-stop home">
                  <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                    <IconHome size={15} />{settings.homeAddress || "Start (home)"}
                  </div>
                  <div className="text-faint" style={{ fontSize: 12 }}>Leaving now · {formatTime(now)}</div>
                </div>
              )}
              {plan.stops.map(({ job, driveSec, driveM, eta, workSec }, i) => (
                <div key={job.id} className="route-stop" onClick={() => openJob(job.id)} style={{ cursor: "pointer" }}>
                  {driveSec > 0 && (
                    <div className="leg-note">↓ {formatMiles(driveM)} · ~{formatDuration(driveSec)} drive</div>
                  )}
                  <div className="row-between">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{i + 1}. {job.name}</div>
                      <div className="text-faint" style={{ fontSize: 12 }}>
                        ETA {formatTime(eta)} · ~{formatDuration(workSec)} on site
                      </div>
                    </div>
                    <span className="text-good" style={{ fontWeight: 700, fontSize: 14 }}>{formatMoney(job.pay)}</span>
                  </div>
                </div>
              ))}
              {origin && plan.homeSec > 0 && (
                <div className="route-stop home">
                  <div className="leg-note">↓ {formatMiles(plan.homeM)} · ~{formatDuration(plan.homeSec)} drive</div>
                  <div style={{ fontWeight: 700, fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
                    <IconHome size={15} />Back home ≈ {formatTime(plan.doneBy)}
                  </div>
                </div>
              )}
            </div>
            <p className="text-faint" style={{ fontSize: 11.5, marginTop: 10, lineHeight: 1.5 }}>
              Drive times are straight-line estimates — open in Google Maps for turn-by-turn with live traffic.
            </p>
          </div>
        )}

        {mode === "plan" && unroutable.length > 0 && (
          <div className="card card-tight">
            <div className="section-title"><IconAlert size={13} style={{ verticalAlign: -2, marginRight: 5 }} />Needs a GPS pin</div>
            {unroutable.map((j) => (
              <div key={j.id} className="list-row" onClick={() => openJob(j.id)} style={{ cursor: "pointer" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{j.name}</div>
                  <div className="text-faint" style={{ fontSize: 12 }}>{j.address || "No address either — open to add one"}</div>
                </div>
                <span className="text-good" style={{ fontWeight: 700, fontSize: 13 }}>{formatMoney(j.pay)}</span>
              </div>
            ))}
          </div>
        )}

        {mode === "plan" && pending.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon"><IconMap size={44} /></div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>
              {jobs.length ? "Everything's mowed this week 🎉" : "No jobs to route yet"}
            </div>
            <div style={{ fontSize: 13.5 }}>
              {jobs.length ? "The planner fills back up when a new week starts." : "Add jobs with addresses or GPS pins to plan your day."}
            </div>
          </div>
        )}

        {/* Map preview */}
        <div className="card" style={{ padding: 10 }}>
          <div className="map-frame">
            <iframe
              title="Route Map"
              width="100%"
              height="260"
              style={{ border: "none", display: "block" }}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox.str}&layer=mapnik&marker=${bbox.center.lat}%2C${bbox.center.lng}`}
            />
          </div>
          <div className="text-faint" style={{ fontSize: 11.5, textAlign: "center", marginTop: 8 }}>
            <IconPin size={11} style={{ verticalAlign: -1 }} /> {bbox.count} saved location{bbox.count === 1 ? "" : "s"} in view
          </div>
        </div>
      </div>
    </>
  );
}
