import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerEmail, jobName, amount, paymentId, date } = req.body;

  if (!customerEmail || !jobName || !amount) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #22c55e; text-align: center;">Payment Received</h1>
        
        <div style="background: #f1f5f9; padding: 24px; border-radius: 8px; margin: 20px 0; text-align: center;">
          <div style="font-size: 48px; color: #22c55e; font-weight: 700; margin-bottom: 12px;">✓</div>
          <div style="font-size: 18px; color: #1e293b; font-weight: 600; margin-bottom: 8px;">Your payment has been processed</div>
          <div style="color: #64748b; font-size: 14px;">Thank you for your prompt payment</div>
        </div>
        
        <div style="background: #fff; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0; margin: 16px 0;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;">
            <div>
              <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Job</div>
              <div style="color: #1e293b; font-size: 14px; font-weight: 600;">${jobName}</div>
            </div>
            <div>
              <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Payment Date</div>
              <div style="color: #1e293b; font-size: 14px; font-weight: 600;">${date}</div>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 16px;">
            <div style="display: flex; justify-content: space-between; font-size: 16px; font-weight: 700;">
              <div>Amount Paid:</div>
              <div style="color: #22c55e;">$${amount.toFixed(2)}</div>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #64748b; margin-top: 8px;">
              <div>Transaction ID:</div>
              <div>${paymentId}</div>
            </div>
          </div>
        </div>
        
        <div style="background: #dcfce7; padding: 12px; border-radius: 6px; text-align: center; color: #16a34a; font-size: 13px; margin: 16px 0; font-weight: 600;">
          Invoice marked as paid
        </div>
        
        <div style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 16px;">
          <p>For your records, please keep this email with your documentation.</p>
          <p>&copy; ${new Date().getFullYear()} Collins Lawncare. All rights reserved.</p>
        </div>
      </div>
    `;

    const msg = {
      to: customerEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@collinslawncare.com',
      subject: `Payment Confirmation - ${jobName}`,
      html,
      trackingSettings: {
        openTracking: { enabled: true },
      },
    };

    const result = await sgMail.send(msg);
    
    console.log('[v0] Payment confirmation sent:', result[0].statusCode);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[v0] SendGrid error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
