import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerEmail, jobName, amount, address, portalLink } = req.body;

  // Validate input
  if (!customerEmail || !jobName || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const invoiceHTML = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #22c55e; text-align: center;">Collins Lawncare</h1>
        
        <div style="background: #f8fafb; padding: 24px; border-radius: 8px; margin: 20px 0;">
          <h2 style="margin-top: 0;">Invoice for ${jobName}</h2>
          
          <div style="background: #fff; padding: 16px; border-radius: 6px; margin: 16px 0;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
              <div>
                <div style="color: #64748b; font-size: 12px; font-weight: 600;">Job</div>
                <div style="color: #1e293b; font-size: 16px; font-weight: 700;">${jobName}</div>
              </div>
              <div>
                <div style="color: #64748b; font-size: 12px; font-weight: 600;">Location</div>
                <div style="color: #1e293b; font-size: 14px;">${address}</div>
              </div>
            </div>
            
            <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
              <div style="display: flex; justify-content: space-between; font-size: 24px;">
                <div style="font-weight: 600; color: #1e293b;">Amount Due:</div>
                <div style="color: #22c55e; font-weight: 700;">$${amount.toFixed(2)}</div>
              </div>
            </div>
          </div>
          
          <div style="text-align: center; margin: 24px 0;">
            ${portalLink
    ? `<a href="${portalLink}" style="background: #22c55e; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-block;">
              View Job & Pay Invoice
            </a>`
    : `<p style="color: #64748b; font-size: 14px;">Contact Collins Lawncare to view your invoice and pay online.</p>`}
          </div>
        </div>
        
        <div style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          <p>Questions? Reply to this email or contact Collins Lawncare.</p>
          <p>&copy; ${new Date().getFullYear()} Collins Lawncare. All rights reserved.</p>
        </div>
      </div>
    `;

    const msg = {
      to: customerEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@collinslawncare.com',
      subject: `Invoice for ${jobName} - Collins Lawncare`,
      html: invoiceHTML,
      trackingSettings: {
        clickTracking: { enabled: true },
        openTracking: { enabled: true },
      },
    };

    const result = await sgMail.send(msg);
    
    console.log('[v0] Invoice email sent:', result[0].statusCode);
    res.status(200).json({
      success: true,
      messageId: result[0].headers['x-message-id'],
    });
  } catch (error) {
    console.error('[v0] SendGrid error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
