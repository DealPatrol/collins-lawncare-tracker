import { loadJobForPortal } from '../lib/portal-data.js';
import { verifyPortalToken } from '../lib/portal-token.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token = req.query?.token;
  if (!token) {
    return res.status(400).json({ error: 'token query parameter is required' });
  }

  try {
    const claims = verifyPortalToken(token);
    if (!claims) {
      return res.status(401).json({ error: 'Invalid or expired portal link' });
    }

    const job = await loadJobForPortal(claims.userId, claims.jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    return res.status(200).json({ ok: true, job });
  } catch (error) {
    console.error('[portal-job]', error.message);
    const status = error.message.includes('not configured') ? 503 : 500;
    return res.status(status).json({ error: error.message || 'Could not load job' });
  }
}
