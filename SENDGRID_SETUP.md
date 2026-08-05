# SendGrid Email Integration Setup

## Overview

Your app can automatically send invoices and job completion notifications to customers via email. This guide shows how to set up SendGrid (free tier available).

## Step 1: Create SendGrid Account

1. Go to https://sendgrid.com
2. Click **Sign Up**
3. Fill in your business info
4. Verify your email
5. Log in to your dashboard

## Step 2: Get Your API Key

1. Go to **Settings** → **API Keys**
2. Click **Create API Key**
3. Name it: `collins-lawncare`
4. Select **Full Access** or configure specific permissions
5. Copy the API key (starts with `SG.`)

## Step 3: Verify Your Sender Email

1. Go to **Settings** → **Sender Authentication**
2. Click **Create New Sender**
3. Enter your business email (or one you control)
4. Click the verification link in the email
5. Note the sender email address

## Step 4: Configure Environment Variables

Add to your `.env.local`:

```
SENDGRID_API_KEY=SG_your_api_key_here
SENDGRID_FROM_EMAIL=noreply@collinslawncare.com
```

Replace:
- `SG_your_api_key_here` with your actual API key
- `noreply@collinslawncare.com` with your verified sender email

## Step 5: Deploy to Vercel

If deploying to Vercel:

1. Go to your Vercel project settings
2. Add environment variables:
   - `SENDGRID_API_KEY`
   - `SENDGRID_FROM_EMAIL`
3. Redeploy

## How to Use

### Send Invoice Email

```javascript
import { sendInvoiceEmail } from './src/email.js';

await sendInvoiceEmail('job-123', 'customer@example.com', {
  name: 'Lawn Maintenance',
  pay: 150,
  address: '123 Main St',
});
```

### Send Payment Confirmation

```javascript
import { sendPaymentConfirmation } from './src/email.js';

await sendPaymentConfirmation('customer@example.com', {
  name: 'Lawn Maintenance',
}, 'payment-id-123', 150);
```

### Send Job Completion Notification

```javascript
import { sendCompletionNotification } from './src/email.js';

await sendCompletionNotification('customer@example.com', {
  name: 'Lawn Maintenance',
  address: '123 Main St',
});
```

## Email Templates

Your app includes three professional email templates:

1. **Invoice Email** - Details about the job and a link to pay online
2. **Payment Confirmation** - Receipt for payment
3. **Job Completion** - Notifies customer with before/after gallery access

All templates are branded with your company colors (green #22c55e).

## Testing Emails

### Development (Local)

Use SendGrid's sandbox mode (doesn't send real emails):

1. Create a test API key with limited permissions
2. Or use a throwaway email service like Mailtrap
3. Check console logs for email sending attempts

### Production

1. Send a test email to your own address
2. Check spam folder (whitelist your domain if needed)
3. Monitor SendGrid Dashboard for delivery status

## Troubleshooting

**"API key not found"**
- Check `.env.local` has `SENDGRID_API_KEY`
- Make sure key starts with `SG.`
- Restart dev server after adding env vars

**"Email not received"**
- Check SendGrid Dashboard → **Activity** for delivery status
- Verify sender email is authenticated
- Check recipient spam folder
- Verify email address is spelled correctly

**"Authentication Error"**
- Confirm API key is valid (not expired or revoked)
- Check API key has correct permissions
- Generate a new key if unsure

## Upgrading from Free Tier

SendGrid free tier includes:
- 100 emails/day
- Basic analytics
- Email templates

This is usually sufficient for a small lawn care business. To upgrade:

1. Go to **Billing** → **Choose Plan**
2. Select paid tier (starts at $19.95/month)
3. Unlock unlimited emails and advanced features

## Bounce & Complaint Handling

SendGrid tracks bounces and complaints. Set up webhooks to handle:

1. Go to **Settings** → **Mail Send** → **Event Webhook**
2. Add webhook URL: `https://yourapp.vercel.app/api/email-webhook`
3. Select events: `bounce`, `complained`
4. Automatically suppress bad emails

## Support

- SendGrid Docs: https://docs.sendgrid.com
- Status Page: https://status.sendgrid.com
- Contact: https://support.sendgrid.com
