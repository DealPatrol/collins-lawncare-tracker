/** API base URL — empty string means same origin (Vite dev proxy / Vercel unified deploy). */
export function getApiBase() {
  const base = import.meta.env.VITE_API_BASE_URL || '';
  return base.replace(/\/$/, '');
}

export function apiUrl(path) {
  return `${getApiBase()}${path}`;
}
