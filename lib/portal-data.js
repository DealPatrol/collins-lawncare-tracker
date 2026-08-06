import { getAdminDb } from './firebase-admin.js';

function lastSession(job) {
  const sessions = job.sessions || [];
  if (!sessions.length) return null;
  return sessions[sessions.length - 1];
}

function deriveStatus(job) {
  if (job.currentSessionStart) return 'in-progress';
  const last = lastSession(job);
  if (last) return 'completed';
  return 'scheduled';
}

function sessionTimestamp(job, session) {
  if (job.currentSessionStart && session === lastSession(job)) {
    return new Date(job.currentSessionStart).toISOString();
  }
  if (session?.dayKey) return `${session.dayKey}T12:00:00.000Z`;
  return null;
}

/** Public-safe job fields for the customer portal. */
export function sanitizeJobForPortal(job) {
  const last = lastSession(job);
  const payments = (job.payments || []).map((p, i) => ({
    id: p.id || `payment-${i}`,
    amount: Number(p.amount) || 0,
    date: p.date || p.paidAt || new Date().toISOString(),
    status: p.status || 'succeeded',
  }));

  const startTime = job.currentSessionStart
    ? new Date(job.currentSessionStart).toISOString()
    : (last ? sessionTimestamp(job, last) : null);

  return {
    id: job.id,
    name: job.name,
    address: job.address || '',
    status: deriveStatus(job),
    pay: Number(job.pay) || 0,
    billing: job.billing || 'visit',
    monthlyRate: job.monthlyRate ?? null,
    photos: job.photos || [],
    notes: job.notes || '',
    startTime,
    endTime: last && !job.currentSessionStart ? startTime : null,
    payments,
  };
}

export async function loadJobForPortal(userId, jobId) {
  const snap = await getAdminDb().doc(`users/${userId}/data/app`).get();
  if (!snap.exists) return null;

  const data = snap.data();
  const job = (data.jobs || []).find((j) => j.id === jobId);
  if (!job) return null;

  return sanitizeJobForPortal(job);
}
