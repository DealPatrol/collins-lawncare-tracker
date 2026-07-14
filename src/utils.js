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
