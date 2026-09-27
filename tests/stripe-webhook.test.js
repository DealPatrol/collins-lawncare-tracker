import { describe, expect, it } from 'vitest';
import {
  applyChargeRefunded,
  applyPaymentFailed,
  applyPaymentSucceeded,
} from '../lib/stripe-webhook.js';

const event = (id, type, object) => ({
  id,
  type,
  created: 1_800_000_000,
  data: { object },
});

describe('Stripe webhook job updates', () => {
  it('records a successful payment once', () => {
    const stripeEvent = event('evt_paid', 'payment_intent.succeeded', {
      id: 'pi_1',
      amount_received: 12500,
    });
    const once = applyPaymentSucceeded({ id: 'job-1' }, stripeEvent.data.object, stripeEvent);
    const twice = applyPaymentSucceeded(once, stripeEvent.data.object, stripeEvent);

    expect(twice.paymentStatus).toBe('paid');
    expect(twice.payments).toHaveLength(1);
    expect(twice.payments[0]).toMatchObject({
      id: 'pi_1',
      amount: 125,
      status: 'succeeded',
    });
  });

  it('records distinct payment failures and deduplicates an event', () => {
    const stripeEvent = event('evt_failed', 'payment_intent.payment_failed', {
      id: 'pi_1',
      last_payment_error: { code: 'card_declined', message: 'Card declined' },
    });
    const once = applyPaymentFailed({ id: 'job-1' }, stripeEvent.data.object, stripeEvent);
    const twice = applyPaymentFailed(once, stripeEvent.data.object, stripeEvent);

    expect(twice.paymentStatus).toBe('failed');
    expect(twice.paymentFailures).toEqual([
      expect.objectContaining({
        stripeEventId: 'evt_failed',
        code: 'card_declined',
      }),
    ]);
  });

  it('updates the existing payment for partial and full refunds', () => {
    const job = {
      id: 'job-1',
      payments: [{ id: 'pi_1', amount: 125, status: 'succeeded' }],
    };
    const partialEvent = event('evt_partial', 'charge.refunded', {
      id: 'ch_1',
      payment_intent: 'pi_1',
      amount: 12500,
      amount_refunded: 2500,
      refunded: false,
    });
    const partial = applyChargeRefunded(job, partialEvent.data.object, partialEvent);
    const fullEvent = event('evt_full', 'charge.refunded', {
      ...partialEvent.data.object,
      amount_refunded: 12500,
      refunded: true,
    });
    const full = applyChargeRefunded(partial, fullEvent.data.object, fullEvent);

    expect(partial.paymentStatus).toBe('partially_refunded');
    expect(partial.payments[0].refundedAmount).toBe(25);
    expect(full.paymentStatus).toBe('refunded');
    expect(full.payments[0]).toMatchObject({
      refundedAmount: 125,
      status: 'refunded',
    });
  });
});
