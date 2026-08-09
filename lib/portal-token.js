import crypto from 'crypto';

const ALG = 'sha256';
const TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getSecret() {
  const secret = process.env.PORTAL_TOKEN_SECRET;
  if (!secret) throw new Error('PORTAL_TOKEN_SECRET is not configured');
  return secret;
}

export function signPortalToken({ userId, jobId, customerEmail }) {
  const payload = {
    userId,
    jobId,
    customerEmail: customerEmail || null,
    exp: Date.now() + TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac(ALG, getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyPortalToken(token) {
  try {
    const secret = process.env.PORTAL_TOKEN_SECRET;
    if (!secret || !token) return null;

    const [body, sig] = token.split('.');
    if (!body || !sig) return null;

    const expected = crypto.createHmac(ALG, secret).update(body).digest('base64url');
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expected);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }

    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    if (!data.userId || !data.jobId || !data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}

export function getPortalBaseUrl(req) {
  const configured = process.env.APP_URL || process.env.VERCEL_URL;
  if (configured) {
    const url = configured.startsWith('http') ? configured : `https://${configured}`;
    return url.replace(/\/$/, '');
  }
  const host = req?.headers?.['x-forwarded-host'] || req?.headers?.host;
  const proto = req?.headers?.['x-forwarded-proto'] || 'https';
  if (host) return `${proto}://${host}`;
  return '';
}

export function buildPortalUrl(req, token) {
  const base = getPortalBaseUrl(req);
  return `${base}/portal?token=${encodeURIComponent(token)}`;
}
