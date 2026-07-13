import { useEffect, useRef, useState } from "react";
import { watchCoords } from "./location.js";
import { haversineMeters, isMowedThisWeek } from "./utils.js";

const MAX_FIX_ACCURACY_M = 50; // ignore fixes worse than this for distance
const MAX_SEGMENT_M = 1000; // discard GPS teleports
const EXIT_FIX_COUNT = 3; // consecutive out-of-fence fixes to auto-stop
const EXIT_MIN_MS = 20000; // and at least this long outside
const ARRIVE_SUGGEST_COOLDOWN_MS = 10 * 60 * 1000;

// Runs a continuous GPS watch while the workday is active and drives three
// behaviors: odometer-style distance accumulation, geofence auto-stop for
// the running job, and arrival suggestions for pending jobs.
export function useGpsTracking({ enabled, config, onDistance, onAutoStop, onArrive }) {
  const [lastFix, setLastFix] = useState(null);
  const [gpsError, setGpsError] = useState("");

  // Latest config/callbacks without resubscribing the watcher.
  const ctx = useRef({});
  useEffect(() => {
    ctx.current = { config, onDistance, onAutoStop, onArrive };
  });

  const trackRef = useRef({ prevFix: null, exitCount: 0, exitSince: null, suggested: {} });

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let stopWatch = null;
    const track = trackRef.current;
    track.prevFix = null;
    track.exitCount = 0;
    track.exitSince = null;

    const handleFix = (fix) => {
      if (stopped) return;
      setLastFix(fix);
      setGpsError("");
      const { config: cfg, onDistance: emitDistance, onAutoStop: emitAutoStop, onArrive: emitArrive } = ctx.current;

      // ── Distance odometer ──
      if (fix.accuracy == null || fix.accuracy <= MAX_FIX_ACCURACY_M) {
        const prev = track.prevFix;
        if (prev) {
          const d = haversineMeters(prev, fix);
          const noiseFloor = Math.max(10, (fix.accuracy || 0) * 0.75);
          if (d > noiseFloor && d < MAX_SEGMENT_M) {
            emitDistance?.(d);
            track.prevFix = fix;
          } else if (d >= MAX_SEGMENT_M) {
            track.prevFix = fix; // resync after a jump without counting it
          }
        } else {
          track.prevFix = fix;
        }
      }

      // ── Geofence auto-stop for the active job ──
      const activeJob = cfg?.activeJob;
      if (cfg?.autoStop && activeJob?.coords) {
        const radius = (activeJob.radius || cfg.geofenceRadius || 150) + Math.min(fix.accuracy || 0, 50);
        const dist = haversineMeters(activeJob.coords, fix);
        if (dist > radius) {
          track.exitCount += 1;
          if (!track.exitSince) track.exitSince = fix.timestamp || Date.now();
          const outsideMs = (fix.timestamp || Date.now()) - track.exitSince;
          if (track.exitCount >= EXIT_FIX_COUNT && outsideMs >= EXIT_MIN_MS) {
            track.exitCount = 0;
            track.exitSince = null;
            emitAutoStop?.(activeJob, fix);
          }
        } else {
          track.exitCount = 0;
          track.exitSince = null;
        }
      } else {
        track.exitCount = 0;
        track.exitSince = null;
      }

      // ── Arrival detection for pending jobs ──
      if (cfg?.autoArriveDetect && !activeJob && Array.isArray(cfg?.jobs)) {
        const now = Date.now();
        for (const job of cfg.jobs) {
          if (!job.coords || isMowedThisWeek(job)) continue;
          const radius = job.radius || cfg.geofenceRadius || 150;
          if (haversineMeters(job.coords, fix) <= radius) {
            const last = track.suggested[job.id] || 0;
            if (now - last > ARRIVE_SUGGEST_COOLDOWN_MS) {
              track.suggested[job.id] = now;
              emitArrive?.(job, fix);
            }
            break;
          }
        }
      }
    };

    watchCoords(handleFix, (err) => {
      if (!stopped) setGpsError(err?.message || "GPS unavailable");
    })
      .then((stop) => {
        if (stopped) stop();
        else stopWatch = stop;
      })
      .catch((err) => {
        if (!stopped) setGpsError(err?.message || "GPS unavailable");
      });

    return () => {
      stopped = true;
      if (stopWatch) stopWatch();
      setLastFix(null);
    };
  }, [enabled]);

  return { lastFix, gpsError };
}
