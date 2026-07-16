// ── Date helpers ──────────────────────────────────────────────

export function getWeekKey(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d.toISOString().split("T")[0];
}

export function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function lastNDayKeys(n) {
  const keys = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    keys.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`);
  }
  return keys;
}

// ── Formatters ────────────────────────────────────────────────

export function formatDuration(seconds) {
  if (!seconds || seconds < 0) return "0m";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatClock(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

export function formatTime(ts) {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

export function formatMoney(val) {
  const n = parseFloat(val || 0);
  return `$${n.toFixed(n % 1 === 0 ? 0 : 2)}`;
}

export function formatMiles(meters) {
  const mi = (meters || 0) / 1609.344;
  if (mi >= 100) return `${mi.toFixed(0)} mi`;
  if (mi >= 10) return `${mi.toFixed(1)} mi`;
  return `${mi.toFixed(2)} mi`;
}

export function formatDayLabel(dayKey) {
  const [y, m, d] = dayKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
}

// ── Geo math ──────────────────────────────────────────────────

const EARTH_RADIUS_M = 6371000;

export function haversineMeters(a, b) {
  if (!a || !b) return 0;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
}

// ── Route optimization ────────────────────────────────────────
// Nearest-neighbor construction followed by 2-opt improvement.
// Returns the input jobs reordered for the shortest round trip from `origin`.

export function optimizeRoute(origin, jobs) {
  const routable = jobs.filter((j) => j.coords);
  if (routable.length < 2 || !origin) return routable;

  const points = routable.map((j) => j.coords);
  const n = points.length;

  const remaining = new Set(points.map((_, i) => i));
  const order = [];
  let current = origin;
  while (remaining.size) {
    let best = -1;
    let bestDist = Infinity;
    for (const i of remaining) {
      const d = haversineMeters(current, points[i]);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    order.push(best);
    remaining.delete(best);
    current = points[best];
  }

  const legDist = (i, k) => {
    const from = i < 0 ? origin : points[order[i]];
    const to = k >= n ? origin : points[order[k]];
    return haversineMeters(from, to);
  };

  let improved = true;
  let guard = 0;
  while (improved && guard++ < 50) {
    improved = false;
    for (let i = 0; i < n - 1; i++) {
      for (let k = i + 1; k < n; k++) {
        const before = legDist(i - 1, i) + legDist(k, k + 1);
        const after =
          haversineMeters(i - 1 < 0 ? origin : points[order[i - 1]], points[order[k]]) +
          haversineMeters(points[order[i]], k + 1 >= n ? origin : points[order[k + 1]]);
        if (after < before - 1) {
          order.splice(i, k - i + 1, ...order.slice(i, k + 1).reverse());
          improved = true;
        }
      }
    }
  }

  return order.map((i) => routable[i]);
}

// Straight-line distance scaled by a road-winding factor, at an average
// rural driving speed — good enough for stop-by-stop ETAs without an API.
const ROAD_FACTOR = 1.3;
const AVG_SPEED_MPS = 13.4; // ≈30 mph

export function estimateDriveSeconds(from, to) {
  if (!from || !to) return 0;
  return Math.round((haversineMeters(from, to) * ROAD_FACTOR) / AVG_SPEED_MPS);
}

export function estimateDriveMeters(from, to) {
  if (!from || !to) return 0;
  return Math.round(haversineMeters(from, to) * ROAD_FACTOR);
}

// ── Job stats ─────────────────────────────────────────────────

export function getTotalTime(job) {
  return (job.sessions || []).reduce((a, s) => a + s.duration, 0);
}

export function getAvgTime(job) {
  const sessions = job.sessions || [];
  if (!sessions.length) return 0;
  return Math.floor(sessions.reduce((a, s) => a + s.duration, 0) / sessions.length);
}

export function getHourlyRate(job) {
  const avgSec = getAvgTime(job);
  if (!avgSec) return 0;
  return job.pay / (avgSec / 3600);
}

export function isMowedThisWeek(job) {
  return !!job.weeklyMows?.[getWeekKey()];
}

export function rateColorClass(rate) {
  if (rate >= 60) return "text-good";
  if (rate >= 40) return "text-warn";
  return "text-bad";
}

// ── Growth zones ──────────────────────────────────────────────
// Cluster pinned jobs into geographic "zones" (single-linkage: any two jobs
// within CLUSTER_RADIUS_M of each other share a zone), then score each zone's
// real earning rate with drive time included. Thin zones — a long drive for
// one or two yards — surface as the places to add work or raise prices.

export const ZONE_TARGET_RATE = 55; // $/hr goal once drive time is counted
export const CLUSTER_RADIUS_M = 2000; // ~1.2 mi — same-neighborhood scale
const DEFAULT_WORK_SEC = 45 * 60; // planning estimate for yards with no history
const PER_YARD_HOP_SEC = 3 * 60; // intra-zone drive added per extra yard

// Weekly revenue normalizes per-visit and monthly-contract jobs so zones
// with mixed billing compare fairly. Per-visit jobs assume the weekly mow
// cadence the checklist is built around.
export function weeklyRevenue(job) {
  if (job.billing === "monthly" && job.monthlyRate > 0) return (job.monthlyRate * 12) / 52;
  return job.pay || 0;
}

export function monthlyRevenue(job) {
  return (weeklyRevenue(job) * 52) / 12;
}

export function centroidOf(coordsList) {
  if (!coordsList.length) return null;
  return {
    lat: coordsList.reduce((a, c) => a + c.lat, 0) / coordsList.length,
    lng: coordsList.reduce((a, c) => a + c.lng, 0) / coordsList.length,
  };
}

export function clusterJobs(jobs, radiusM = CLUSTER_RADIUS_M) {
  const pinned = jobs.filter((j) => j.coords);
  const parent = pinned.map((_, i) => i);
  const find = (i) => (parent[i] === i ? i : (parent[i] = find(parent[i])));
  for (let i = 0; i < pinned.length; i++) {
    for (let k = i + 1; k < pinned.length; k++) {
      if (haversineMeters(pinned[i].coords, pinned[k].coords) <= radiusM) {
        parent[find(i)] = find(k);
      }
    }
  }
  const groups = new Map();
  pinned.forEach((job, i) => {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root).push(job);
  });
  return [...groups.values()];
}

export function zoneEconomics(zoneJobs, origin) {
  const centroid = centroidOf(zoneJobs.map((j) => j.coords));
  const weekly = zoneJobs.reduce((a, j) => a + weeklyRevenue(j), 0);
  const workSec = zoneJobs.reduce((a, j) => a + (getAvgTime(j) || DEFAULT_WORK_SEC), 0);

  // Round trip from home plus short hops between yards inside the zone.
  const tripSec = origin ? 2 * estimateDriveSeconds(origin, centroid) : 0;
  const hopSec = Math.max(0, zoneJobs.length - 1) * PER_YARD_HOP_SEC;
  const driveSec = tripSec + hopSec;

  const totalSec = workSec + driveSec;
  const rate = totalSec > 0 ? weekly / (totalSec / 3600) : 0;

  // Model an added yard as an average yard for this zone, so the pitch
  // ("one more yard here → $X/hr") reflects local prices and lawn sizes.
  const avgYardWeekly = weekly / zoneJobs.length;
  const avgYardWorkSec = workSec / zoneJobs.length;
  const rateWithMore = (n) =>
    (weekly + avgYardWeekly * n) / ((totalSec + (avgYardWorkSec + PER_YARD_HOP_SEC) * n) / 3600);

  let yardsToTarget = 0;
  if (rate < ZONE_TARGET_RATE) {
    for (let n = 1; n <= 8; n++) {
      if (rateWithMore(n) >= ZONE_TARGET_RATE) { yardsToTarget = n; break; }
      if (n === 8) yardsToTarget = 9; // "9+" — drive is too long to fix with density
    }
  }

  const anchor = zoneJobs.reduce((a, j) => (monthlyRevenue(j) > monthlyRevenue(a) ? j : a), zoneJobs[0]);
  return {
    jobs: zoneJobs,
    anchor,
    centroid,
    weekly,
    monthly: (weekly * 52) / 12,
    workSec,
    driveSec,
    tripSec,
    rate,
    rateWithOneMore: rateWithMore(1),
    yardsToTarget,
  };
}

// Jobs whose isolation makes them a drag on the whole route: the round-trip
// detour to reach them (from the nearest other yard or home) pushes their
// true rate under target.
export function routeDrags(jobs, origin) {
  const pinned = jobs.filter((j) => j.coords);
  return pinned
    .map((job) => {
      const anchors = pinned.filter((o) => o.id !== job.id).map((o) => o.coords);
      if (origin) anchors.push(origin);
      if (!anchors.length) return null;
      const detourSec = 2 * Math.min(...anchors.map((c) => estimateDriveSeconds(job.coords, c)));
      const workSec = getAvgTime(job) || DEFAULT_WORK_SEC;
      const trueRate = weeklyRevenue(job) / ((workSec + detourSec) / 3600);
      return { job, detourSec, trueRate };
    })
    .filter((d) => d && d.detourSec >= 12 * 60 && d.trueRate < ZONE_TARGET_RATE)
    .sort((a, b) => a.trueRate - b.trueRate);
}
