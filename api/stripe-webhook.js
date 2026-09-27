import Stripe from 'stripe';
import { processStripeEvent } from '../lib/stripe-webhook.js';

export const config = {
  api: {
    bodyParser: false,
  },
};

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === 'string') return Buffer.from(req.body);

  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY || !process.env.STRIPE_WEBHOOK_SECRET) {
    return res.status(503).json({ error: 'Stripe webhook is not configured' });
  }

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const sig = req.headers['stripe-signature'];
  if (!sig) {
    return res.status(400).json({ error: 'Missing Stripe signature' });
  }

  try {
    const rawBody = await readRawBody(req);
    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const result = await processStripeEvent(stripe, event);
    return res.status(200).json({ received: true, ...result });
  } catch (error) {
    const signatureError = error.type === 'StripeSignatureVerificationError';
    console.error(
      signatureError ? '[stripe-webhook] Invalid signature' : '[stripe-webhook] Processing failed',
      error.message
    );
    return res.status(signatureError ? 400 : 500).json({
      error: signatureError ? 'Invalid signature' : 'Webhook processing failed',
    });
  }
}
