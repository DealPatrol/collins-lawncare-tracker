import { getAdminDb } from './firebase-admin.js';

const EVENT_COLLECTION = 'stripeWebhookEvents';
const MAX_FAILURES_PER_JOB = 20;

function eventTime(event) {
  return new Date(event.created * 1000).toISOString();
}

function metadataFor(object) {
  return object?.metadata || {};
}

function paymentIntentId(charge) {
  return typeof charge.payment_intent === 'string'
    ? charge.payment_intent
    : charge.payment_intent?.id;
}

export function applyPaymentSucceeded(job, paymentIntent, event) {
  const amount = (paymentIntent.amount_received || paymentIntent.amount || 0) / 100;
  const payments = [...(job.payments || [])];
  const index = payments.findIndex((payment) => payment.id === paymentIntent.id);
  const existing = index >= 0 ? payments[index] : {};
  const payment = {
    ...existing,
    id: paymentIntent.id,
    amount,
    date: existing.date || eventTime(event),
    status: 'succeeded',
    stripeEventId: event.id,
  };

  if (index >= 0) payments[index] = payment;
  else payments.push(payment);

  return {
    ...job,
    payments,
    paymentStatus: 'paid',
    lastPayment: payment.date,
  };
}

export function applyPaymentFailed(job, paymentIntent, event) {
  const failures = [...(job.paymentFailures || [])];
  if (!failures.some((failure) => failure.stripeEventId === event.id)) {
    failures.push({
      id: paymentIntent.id,
      stripeEventId: event.id,
      date: eventTime(event),
      code: paymentIntent.last_payment_error?.code || null,
      message: paymentIntent.last_payment_error?.message || 'Payment failed',
    });
  }

  return {
    ...job,
    paymentStatus: 'failed',
    paymentFailures: failures.slice(-MAX_FAILURES_PER_JOB),
    lastPaymentFailure: eventTime(event),
  };
}

export function applyChargeRefunded(job, charge, event) {
  const intentId = paymentIntentId(charge);
  const payments = [...(job.payments || [])];
  const index = payments.findIndex((payment) => payment.id === intentId);
  if (index < 0) {
    throw new Error(`Payment ${intentId || 'unknown'} was not found on the job`);
  }

  const refundedAmount = (charge.amount_refunded || 0) / 100;
  const originalAmount = payments[index].amount || (charge.amount || 0) / 100;
  const fullyRefunded = charge.refunded || refundedAmount >= originalAmount;
  payments[index] = {
    ...payments[index],
    refundedAmount,
    refundedAt: eventTime(event),
    refundChargeId: charge.id,
    status: fullyRefunded ? 'refunded' : 'partially_refunded',
  };

  return {
    ...job,
    payments,
    paymentStatus: fullyRefunded ? 'refunded' : 'partially_refunded',
    lastRefund: eventTime(event),
  };
}

async function resolveEventTarget(stripe, event) {
  const object = event.data.object;
  let metadata = metadataFor(object);

  if (event.type === 'charge.refunded' && (!metadata.userId || !metadata.jobId)) {
    const intentId = paymentIntentId(object);
    if (!intentId) throw new Error('Refund does not reference a PaymentIntent');
    const intent = await stripe.paymentIntents.retrieve(intentId);
    metadata = metadataFor(intent);
  }

  if (!metadata.userId || !metadata.jobId) {
    throw new Error('Stripe event is missing userId or jobId metadata');
  }

  return { userId: metadata.userId, jobId: metadata.jobId };
}

function updateJobForEvent(job, event) {
  switch (event.type) {
    case 'payment_intent.succeeded':
      return applyPaymentSucceeded(job, event.data.object, event);
    case 'payment_intent.payment_failed':
      return applyPaymentFailed(job, event.data.object, event);
    case 'charge.refunded':
      return applyChargeRefunded(job, event.data.object, event);
    default:
      return job;
  }
}

export async function processStripeEvent(stripe, event) {
  const db = getAdminDb();
  const eventRef = db.collection(EVENT_COLLECTION).doc(event.id);

  if (![
    'payment_intent.succeeded',
    'payment_intent.payment_failed',
    'charge.refunded',
  ].includes(event.type)) {
    return { handled: false, duplicate: false };
  }

  try {
    const { userId, jobId } = await resolveEventTarget(stripe, event);
    const appRef = db.doc(`users/${userId}/data/app`);

    return await db.runTransaction(async (transaction) => {
      const priorEvent = await transaction.get(eventRef);
      if (priorEvent.exists && priorEvent.data()?.status === 'processed') {
        return { handled: true, duplicate: true };
      }

      const appSnapshot = await transaction.get(appRef);
      if (!appSnapshot.exists) throw new Error(`User data not found for ${userId}`);

      const appData = appSnapshot.data();
      const jobs = [...(appData.jobs || [])];
      const jobIndex = jobs.findIndex((job) => job.id === jobId);
      if (jobIndex < 0) throw new Error(`Job ${jobId} not found for ${userId}`);

      jobs[jobIndex] = updateJobForEvent(jobs[jobIndex], event);
      transaction.update(appRef, { jobs });
      transaction.set(eventRef, {
        type: event.type,
        status: 'processed',
        userId,
        jobId,
        processedAt: new Date().toISOString(),
      });

      return { handled: true, duplicate: false };
    });
  } catch (error) {
    await eventRef.set({
      type: event.type,
      status: 'failed',
      error: error.message,
      failedAt: new Date().toISOString(),
    }, { merge: true });
    throw error;
  }
}
