import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { customerEmail, jobName, address, date, portalLink } = req.body;

  if (!customerEmail || !jobName) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const html = `
      <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 32px 20px; border-radius: 8px 8px 0 0; color: white; text-align: center;">
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Service Complete!</h1>
          <p style="margin: 8px 0 0 0; font-size: 16px; opacity: 0.9;">Your ${jobName} has been finished</p>
        </div>
        
        <div style="background: #f8fafb; padding: 24px; border-radius: 0 0 8px 8px;">
          <div style="background: #fff; padding: 20px; border-radius: 6px; border: 1px solid #e2e8f0; margin-bottom: 16px;">
            <div style="border-bottom: 1px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px;">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
                <div>
                  <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Service</div>
                  <div style="color: #1e293b; font-size: 14px; font-weight: 600;">${jobName}</div>
                </div>
                <div>
                  <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Completion Date</div>
                  <div style="color: #1e293b; font-size: 14px; font-weight: 600;">${date}</div>
                </div>
              </div>
              
              <div style="margin-top: 12px;">
                <div style="color: #64748b; font-size: 12px; font-weight: 600; margin-bottom: 4px;">Location</div>
                <div style="color: #1e293b; font-size: 14px;">${address}</div>
              </div>
            </div>
            
            <div style="color: #64748b; font-size: 13px; line-height: 1.6;">
              <p>Your service has been completed to our high standards. You can now:</p>
              <ul style="margin: 12px 0;">
                <li>View photos of the completed work</li>
                <li>Download your invoice</li>
                <li>Submit payment online</li>
              </ul>
            </div>
          </div>
          
          <div style="text-align: center; margin: 24px 0;">
            <a href="${portalLink}" style="background: #22c55e; color: white; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: 700; display: inline-block; font-size: 16px;">
              View Your Job & Invoice
            </a>
          </div>
          
          <div style="background: #f0f9ff; border-left: 4px solid #0369a1; padding: 12px 16px; border-radius: 4px; margin: 16px 0;">
            <div style="color: #0369a1; font-size: 12px; font-weight: 600;">Note:</div>
            <div style="color: #0c4a6e; font-size: 13px; margin-top: 4px;">
              If you prefer not to pay online, please contact us within 5 days of invoice receipt.
            </div>
          </div>
        </div>
        
        <div style="color: #64748b; font-size: 12px; text-align: center; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
          <p>Thank you for choosing Collins Lawncare!</p>
          <p>&copy; ${new Date().getFullYear()} Collins Lawncare. All rights reserved.</p>
        </div>
      </div>
    `;

    const msg = {
      to: customerEmail,
      from: process.env.SENDGRID_FROM_EMAIL || 'noreply@collinslawncare.com',
      subject: `Service Complete - ${jobName}`,
      html,
      trackingSettings: {
        clickTracking: { enabled: true },
        openTracking: { enabled: true },
      },
    };

    const result = await sgMail.send(msg);
    
    console.log('[v0] Job completion email sent:', result[0].statusCode);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('[v0] SendGrid error:', error.message);
    res.status(500).json({ error: error.message });
  }
}
