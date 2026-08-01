// Daily forecast from Open-Meteo (free, no API key). Lawncare lives and
// dies by rain, so the dashboard shows today's window at a glance.

const CACHE_KEY = "collins_weather_cache";
const CACHE_TTL_MS = 30 * 60 * 1000;

const WEATHER_LABELS = [
  [0, "Clear", "☀️"],
  [1, "Mostly clear", "🌤"],
  [2, "Partly cloudy", "⛅"],
  [3, "Overcast", "☁️"],
  [45, "Fog", "🌫"],
  [48, "Fog", "🌫"],
  [51, "Drizzle", "🌦"],
  [53, "Drizzle", "🌦"],
  [55, "Drizzle", "🌧"],
  [61, "Light rain", "🌦"],
  [63, "Rain", "🌧"],
  [65, "Heavy rain", "🌧"],
  [80, "Showers", "🌦"],
  [81, "Showers", "🌧"],
  [82, "Heavy showers", "⛈"],
  [95, "Thunderstorm", "⛈"],
  [96, "Thunderstorm", "⛈"],
  [99, "Thunderstorm", "⛈"],
];

function describeCode(code) {
  let match = ["Weather", "🌡"];
  for (const [c, label, icon] of WEATHER_LABELS) {
    if (code >= c) match = [label, icon];
  }
  return match;
}

export async function fetchWeather(coords) {
  if (!coords) return null;

  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY) || "null");
    if (cached && Date.now() - cached.at < CACHE_TTL_MS &&
        Math.abs(cached.lat - coords.lat) < 0.05 && Math.abs(cached.lng - coords.lng) < 0.05) {
      return cached.data;
    }
  } catch { /* stale cache is fine to ignore */ }

  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lng}` +
    `&current=temperature_2m,weather_code,wind_speed_10m` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
    `&hourly=precipitation_probability&forecast_days=2&timezone=auto` +
    `&temperature_unit=fahrenheit&wind_speed_unit=mph`;

  const res = await fetch(url);
  if (!res.ok) throw new Error("Weather unavailable");
  const raw = await res.json();

  const [label, icon] = describeCode(raw.current?.weather_code ?? 0);

  // Find the first hour today with >=50% rain chance so crews can plan around it.
  let rainAtHour = null;
  const hours = raw.hourly?.time || [];
  const probs = raw.hourly?.precipitation_probability || [];
  const now = new Date();
  for (let i = 0; i < hours.length; i++) {
    const t = new Date(hours[i]);
    if (t < now || t.getDate() !== now.getDate()) continue;
    if ((probs[i] ?? 0) >= 50) {
      rainAtHour = t.toLocaleTimeString([], { hour: "numeric" });
      break;
    }
  }

  const data = {
    temp: Math.round(raw.current?.temperature_2m ?? 0),
    wind: Math.round(raw.current?.wind_speed_10m ?? 0),
    label,
    icon,
    high: Math.round(raw.daily?.temperature_2m_max?.[0] ?? 0),
    low: Math.round(raw.daily?.temperature_2m_min?.[0] ?? 0),
    rainChance: raw.daily?.precipitation_probability_max?.[0] ?? 0,
    rainTomorrow: raw.daily?.precipitation_probability_max?.[1] ?? 0,
    rainAtHour,
  };

  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), lat: coords.lat, lng: coords.lng, data }));
  } catch { /* cache write is best-effort */ }

  return data;
}
