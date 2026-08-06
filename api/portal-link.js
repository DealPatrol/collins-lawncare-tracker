import { verifyFirebaseIdToken } from '../lib/firebase-admin.js';
import { loadJobForPortal } from '../lib/portal-data.js';
import { buildPortalUrl, signPortalToken } from '../lib/portal-token.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const auth = await verifyFirebaseIdToken(req.headers.authorization);
    if (!auth?.uid) {
      return res.status(401).json({ error: 'Sign in required' });
    }

    const { jobId, customerEmail } = req.body || {};
    if (!jobId) {
      return res.status(400).json({ error: 'jobId is required' });
    }

    const job = await loadJobForPortal(auth.uid, jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const token = signPortalToken({
      userId: auth.uid,
      jobId,
      customerEmail: customerEmail || null,
    });

    return res.status(200).json({
      ok: true,
      token,
      url: buildPortalUrl(req, token),
    });
  } catch (error) {
    console.error('[portal-link]', error.message);
    const status = error.message.includes('not configured') ? 503 : 500;
    return res.status(status).json({ error: error.message || 'Could not create portal link' });
  }
}
