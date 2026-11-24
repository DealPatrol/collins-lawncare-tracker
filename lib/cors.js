// CORS for the bundled native app. The iOS build is served from
// capacitor://localhost, so its fetches to the production /api routes are
// cross-origin. Only the Capacitor origins (plus any extra origins listed in
// CORS_ALLOWED_ORIGINS, comma-separated) are allowed; the web app itself is
// same-origin and unaffected.
const NATIVE_ORIGINS = ['capacitor://localhost', 'ionic://localhost', 'https://localhost', 'http://localhost'];

export function allowedOrigins(env = process.env) {
  const extra = (env.CORS_ALLOWED_ORIGINS || '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  return new Set([...NATIVE_ORIGINS, ...extra]);
}

/**
 * Apply CORS headers. Returns true when the request was a preflight that has
 * been fully answered (the handler should return immediately).
 */
export function applyCors(req, res, { methods = 'GET, POST, OPTIONS', env = process.env } = {}) {
  const origin = req.headers?.origin;
  if (origin && allowedOrigins(env).has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', methods);
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Max-Age', '600');
  }
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  return false;
}
