import crypto from 'crypto';

const ALG = 'sha256';
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CLOCK_SKEW_MS = 5 * 60 * 1000;
const MIN_SECRET_BYTES = 32;
const MAX_TOKEN_LENGTH = 4096;

function getSecret() {
  const secret = process.env.PORTAL_TOKEN_SECRET;
  if (!secret) throw new Error('PORTAL_TOKEN_SECRET is not configured');
  if (Buffer.byteLength(secret, 'utf8') < MIN_SECRET_BYTES) {
    throw new Error(`PORTAL_TOKEN_SECRET must be at least ${MIN_SECRET_BYTES} bytes`);
  }
  return secret;
}

export function signPortalToken({ userId, jobId, customerEmail }) {
  if (!userId || !jobId) throw new Error('userId and jobId are required');
  const issuedAt = Date.now();
  const payload = {
    version: 1,
    userId,
    jobId,
    customerEmail: customerEmail || null,
    iat: issuedAt,
    exp: issuedAt + TTL_MS,
  };
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac(ALG, getSecret()).update(body).digest('base64url');
  return `${body}.${sig}`;
}

export function verifyPortalToken(token) {
  try {
    if (typeof token !== 'string' || !token || token.length > MAX_TOKEN_LENGTH) return null;
    const secret = getSecret();

    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [body, sig] = parts;
    if (!body || !sig) return null;

    const actualSignature = Buffer.from(sig, 'base64url');
    const expectedSignature = crypto.createHmac(ALG, secret).update(body).digest();
    if (
      actualSignature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(actualSignature, expectedSignature)
    ) {
      return null;
    }

    const data = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    const now = Date.now();
    if (
      data.version !== 1 ||
      typeof data.userId !== 'string' ||
      typeof data.jobId !== 'string' ||
      !data.userId ||
      !data.jobId ||
      !Number.isSafeInteger(data.iat) ||
      !Number.isSafeInteger(data.exp) ||
      data.iat > now + MAX_CLOCK_SKEW_MS ||
      data.exp <= now ||
      data.exp - data.iat !== TTL_MS
    ) {
      return null;
    }
    if (data.customerEmail !== null && typeof data.customerEmail !== 'string') return null;
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
