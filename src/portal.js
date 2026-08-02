// Client Portal - Token-based access to job information
// Allows customers to view their job details, photos, and invoices without logging in

export const generatePortalToken = (jobId, customerId) => {
  // Simple token: base64 encoded job+customer id with timestamp
  // In production, use a proper token service (Firebase custom tokens, JWT, etc.)
  const data = {
    jobId,
    customerId,
    issuedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  };
  
  try {
    return btoa(JSON.stringify(data));
  } catch (error) {
    console.error('[v0] Error generating portal token:', error);
    return null;
  }
};

export const verifyPortalToken = (token) => {
  try {
    const data = JSON.parse(atob(token));
    const expiryDate = new Date(data.expiresAt);
    
    if (expiryDate < new Date()) {
      console.warn('[v0] Portal token expired');
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('[v0] Error verifying portal token:', error);
    return null;
  }
};

export const getPortalURL = (baseURL, token) => {
  return `${baseURL}/portal?token=${encodeURIComponent(token)}`;
};

// Format job data for portal display (sanitized for public view)
export const formatJobForPortal = (job) => {
  return {
    id: job.id,
    name: job.name,
    address: job.address,
    status: job.status || 'in-progress',
    startTime: job.startTime,
    endTime: job.endTime,
    pay: job.pay,
    billing: job.billing,
    monthlyRate: job.monthlyRate,
    photos: job.photos || [],
    notes: job.notes,
    completedAt: job.endTime,
    payments: (job.payments || []).map(p => ({
      id: p.id,
      amount: p.amount,
      date: p.date,
      status: p.status,
    })),
  };
};

// Generate shareable invoice link for portal
export const generateInvoiceLink = (baseURL, token) => {
  return `${baseURL}/portal/invoice?token=${encodeURIComponent(token)}`;
};
