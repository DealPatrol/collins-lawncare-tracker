// Email service for sending invoices and notifications via SendGrid

export const sendInvoiceEmail = async (jobId, customerEmail, jobDetails) => {
  try {
    const response = await fetch('/api/send-invoice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jobId,
        customerEmail,
        jobName: jobDetails.name,
        amount: jobDetails.pay,
        address: jobDetails.address,
        portalLink: `${window.location.origin}/portal?token=${generatePortalToken(jobId, customerEmail)}`,
      }),
    });

    if (!response.ok) throw new Error('Failed to send invoice');
    
    const result = await response.json();
    console.log('[v0] Invoice sent successfully:', result);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('[v0] Error sending invoice:', error);
    return { success: false, error: error.message };
  }
};

export const sendPaymentConfirmation = async (customerEmail, jobDetails, paymentId, amount) => {
  try {
    const response = await fetch('/api/send-payment-confirmation', {
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
    console.log('[v0] Payment confirmation sent:', result);
    return { success: true };
  } catch (error) {
    console.error('[v0] Error sending payment confirmation:', error);
    return { success: false, error: error.message };
  }
};

export const sendCompletionNotification = async (customerEmail, jobDetails) => {
  try {
    const response = await fetch('/api/send-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerEmail,
        jobName: jobDetails.name,
        address: jobDetails.address,
        date: new Date().toLocaleDateString(),
        portalLink: `${window.location.origin}/portal?token=${generatePortalToken(jobDetails.id, customerEmail)}`,
      }),
    });

    if (!response.ok) throw new Error('Failed to send notification');
    
    console.log('[v0] Completion notification sent');
    return { success: true };
  } catch (error) {
    console.error('[v0] Error sending completion notification:', error);
    return { success: false, error: error.message };
  }
};

// Simple token generator for emails (in production, use proper JWT)
const generatePortalToken = (jobId, customerId) => {
  const data = {
    jobId,
    customerId,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
  };
  
  try {
    return btoa(JSON.stringify(data));
  } catch (error) {
    console.error('[v0] Error generating email token:', error);
    return null;
  }
};

// Format currency for email
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};
