import crypto from 'crypto';
import Stripe from 'stripe';
import { verifyFirebaseIdToken } from '../lib/firebase-admin.js';
import { loadJobForPortal } from '../lib/portal-data.js';
import { verifyPortalToken } from '../lib/portal-token.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: 'Stripe is not configured' });
  }

  try {
    const { jobId: requestedJobId, portalToken } = req.body || {};
    const portalClaims = verifyPortalToken(portalToken);
    const auth = portalClaims
      ? null
      : await verifyFirebaseIdToken(req.headers.authorization);
    const userId = portalClaims?.userId || auth?.uid;
    const jobId = portalClaims?.jobId || requestedJobId;

    if (!userId || !jobId) {
      return res.status(401).json({ error: 'A valid portal link or sign-in is required' });
    }
    if (portalClaims && requestedJobId && requestedJobId !== portalClaims.jobId) {
      return res.status(403).json({ error: 'Portal link does not match this job' });
    }

    const job = await loadJobForPortal(userId, jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    const hasSettledPayment = (job.payments || []).some((payment) =>
      ['completed', 'succeeded', 'partially_refunded'].includes(payment.status)
    );
    if (hasSettledPayment) {
      return res.status(409).json({ error: 'This invoice is already paid' });
    }

    const amount = Math.round(Number(job.pay) * 100);
    if (!Number.isSafeInteger(amount) || amount < 50) {
      return res.status(400).json({ error: 'Job does not have a valid invoice amount' });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const invoiceRevision = JSON.stringify({
      userId,
      jobId,
      amount,
      payments: (job.payments || []).map((payment) => ({
        id: payment.id,
        status: payment.status,
        refundedAmount: payment.refundedAmount || 0,
      })),
    });
    const idempotencyKey = `invoice_${crypto
      .createHash('sha256')
      .update(invoiceRevision)
      .digest('hex')}`;
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      metadata: {
        jobId,
        userId,
      },
    }, { idempotencyKey });

    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    });
  } catch (error) {
    console.error('[create-payment-intent]', error.message);
    return res.status(500).json({ error: 'Could not create payment' });
  }
}
