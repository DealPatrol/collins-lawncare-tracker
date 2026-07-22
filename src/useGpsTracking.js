import { useEffect, useRef, useState } from "react";
import { watchCoords } from "./location.js";
import { haversineMeters, isMowedThisWeek } from "./utils.js";

const MAX_FIX_ACCURACY_M = 50; // ignore fixes worse than this for distance
const MAX_SEGMENT_M = 1000; // discard GPS teleports
const EXIT_FIX_COUNT = 3; // consecutive out-of-fence fixes to auto-stop
const EXIT_MIN_MS = 20000; // and at least this long outside
const ENTER_FIX_COUNT = 2; // consecutive in-fence fixes to auto-start
const ENTER_MIN_MS = 8000; // and at least this long inside — filters a single stray fix without stalling a real arrival
const ARRIVE_COOLDOWN_MS = 10 * 60 * 1000; // don't re-fire on the same job right after it's stopped

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

  const trackRef = useRef({ prevFix: null, exitCount: 0, exitSince: null, enterCandidate: null, arrived: {} });

  useEffect(() => {
    if (!enabled) return;

    let stopped = false;
    let stopWatch = null;
    const track = trackRef.current;
    track.prevFix = null;
    track.exitCount = 0;
    track.exitSince = null;
    track.enterCandidate = null;

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
      // Mirrors the exit hysteresis above: require a couple of consecutive
      // in-fence fixes over a short window before auto-starting the timer,
      // so a single noisy fix (or driving past on the street) can't trigger it.
      if (cfg?.autoArriveDetect && !activeJob && Array.isArray(cfg?.jobs)) {
        const now = Date.now();
        const nearby = cfg.jobs.find((job) => {
          if (!job.coords || isMowedThisWeek(job)) return false;
          const radius = job.radius || cfg.geofenceRadius || 150;
          return haversineMeters(job.coords, fix) <= radius;
        });

        if (nearby) {
          const last = track.arrived[nearby.id] || 0;
          if (now - last <= ARRIVE_COOLDOWN_MS) {
            track.enterCandidate = null;
          } else if (track.enterCandidate?.jobId === nearby.id) {
            track.enterCandidate.count += 1;
          } else {
            track.enterCandidate = { jobId: nearby.id, count: 1, since: fix.timestamp || now };
          }

          const cand = track.enterCandidate;
          if (cand?.jobId === nearby.id) {
            const insideMs = (fix.timestamp || now) - cand.since;
            if (cand.count >= ENTER_FIX_COUNT && insideMs >= ENTER_MIN_MS) {
              track.enterCandidate = null;
              track.arrived[nearby.id] = now;
              emitArrive?.(nearby, fix);
            }
          }
        } else {
          track.enterCandidate = null;
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
