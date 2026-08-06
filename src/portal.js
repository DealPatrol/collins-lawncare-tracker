// Client portal helpers — tokens are signed server-side (see api/portal-link.js).

import { apiUrl } from './lib/api.js';

export { formatJobForPortal } from './portal-format.js';

/** Request a signed portal link (requires signed-in crew member). */
export async function createPortalLink({ jobId, customerEmail, idToken }) {
  const response = await fetch(apiUrl('/api/portal-link'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify({ jobId, customerEmail: customerEmail || null }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Could not create portal link');
  }
  return data;
}

/** Load job details for a customer portal token. */
export async function fetchPortalJob(token) {
  const response = await fetch(apiUrl(`/api/portal-job?token=${encodeURIComponent(token)}`));
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || 'Could not load job');
  }
  return data.job;
}

export function getPortalURL(baseURL, token) {
  return `${baseURL}/portal?token=${encodeURIComponent(token)}`;
}

export function generateInvoiceLink(baseURL, token) {
  return `${baseURL}/portal?token=${encodeURIComponent(token)}`;
}
