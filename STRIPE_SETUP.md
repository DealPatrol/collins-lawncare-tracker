# Stripe Payment Integration Setup

## Quick Start

This app integrates Stripe for processing customer payments on invoices. Follow these steps to get payments working.

## Step 1: Create Stripe Account

1. Go to https://dashboard.stripe.com/register
2. Sign up with your business email
3. Verify your email and complete business info
4. Get your API keys from: https://dashboard.stripe.com/apikeys

## Step 2: Get Your API Keys

In your Stripe Dashboard:
- Go to **Developers** → **API Keys**
- Copy **Publishable key** (starts with `pk_`)
- Copy **Secret key** (starts with `sk_`)

## Step 3: Configure Environment Variables

Create or edit `.env.local` in your project root:

```
VITE_STRIPE_PUBLIC_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

**Important:** Never commit `.env.local` to GitHub. It contains secrets.

## Step 4: Set Up Webhooks (For Production)

Once deployed to production:

1. Go to **Developers** → **Webhooks**
2. Click **Add endpoint**
3. Enter your webhook URL: `https://yourapp.vercel.app/api/stripe-webhook`
4. Select events: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
5. Copy the webhook signing secret to your `.env.local` as `STRIPE_WEBHOOK_SECRET`

## How It Works

### Customer Payment Flow

1. Customer views invoice in app
2. Clicks "Pay with Stripe"
3. Enters card details
4. Payment processed securely
5. Invoice marked as paid
6. Confirmation email sent to customer

### Backend Processing

- **create-payment-intent.js** - Creates a payment intent with Stripe
- **stripe-webhook.js** - Receives payment confirmations and updates job status

## Testing Payments

Use Stripe test card numbers:

- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- Any future expiration date (e.g., 12/25)
- Any CVC (e.g., 123)

## Deploying to Production

1. Update `.env` in your Vercel project with **production** Stripe keys
2. Set webhook secret in Vercel environment
3. Test a payment on your live app
4. Monitor Stripe Dashboard for transactions

## Troubleshooting

**"Stripe public key not configured"**
- Add `VITE_STRIPE_PUBLIC_KEY` to `.env.local`

**Payment fails silently**
- Check browser console for errors
- Verify Stripe keys are correct
- Check Stripe Dashboard for failed payment intents

**Webhook not receiving events**
- Verify webhook URL is publicly accessible
- Check webhook signing secret is correct
- Monitor webhook attempts in Stripe Dashboard

## Support

For Stripe issues, visit https://stripe.com/docs
