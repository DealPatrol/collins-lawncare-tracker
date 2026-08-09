// Email service for sending invoices and notifications via SendGrid

import { apiUrl } from './lib/api.js';
import { createPortalLink } from './portal.js';

async function resolvePortalLink({ jobId, customerEmail, idToken }) {
  if (!idToken) return null;
  try {
    const { url } = await createPortalLink({ jobId, customerEmail, idToken });
    return url;
  } catch (error) {
    console.warn('[email] Could not create portal link:', error.message);
    return null;
  }
}

export const sendInvoiceEmail = async (jobId, customerEmail, jobDetails, { idToken } = {}) => {
  try {
    const portalLink = await resolvePortalLink({ jobId, customerEmail, idToken });

    const response = await fetch(apiUrl('/api/send-invoice'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        customerEmail,
        jobName: jobDetails.name,
        amount: jobDetails.pay,
        address: jobDetails.address,
        portalLink,
      }),
    });

    if (!response.ok) throw new Error('Failed to send invoice');

    const result = await response.json();
    console.log('[email] Invoice sent successfully:', result);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[email] Error sending invoice:', error);
    return { success: false, error: error.message };
  }
};

export const sendPaymentConfirmation = async (customerEmail, jobDetails, paymentId, amount) => {
  try {
    const response = await fetch(apiUrl('/api/send-payment-confirmation'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail,
        jobName: jobDetails.name,
        amount,
        paymentId,
        date: new Date().toLocaleDateString(),
      }),
    });

    if (!response.ok) throw new Error('Failed to send confirmation');

    const result = await response.json();
    console.log('[email] Payment confirmation sent:', result);
    return { success: true };
  } catch (error) {
    console.error('[email] Error sending payment confirmation:', error);
    return { success: false, error: error.message };
  }
};

export const sendCompletionNotification = async (customerEmail, jobDetails, { idToken } = {}) => {
  try {
    const portalLink = await resolvePortalLink({
      jobId: jobDetails.id,
      customerEmail,
      idToken,
    });

    const response = await fetch(apiUrl('/api/send-completion'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail,
        jobName: jobDetails.name,
        address: jobDetails.address,
        date: new Date().toLocaleDateString(),
        portalLink,
      }),
    });

    if (!response.ok) throw new Error('Failed to send notification');

    console.log('[email] Completion notification sent');
    return { success: true };
  } catch (error) {
    console.error('[email] Error sending completion notification:', error);
    return { success: false, error: error.message };
  }
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
