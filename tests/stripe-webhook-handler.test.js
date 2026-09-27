import { Readable } from 'node:stream';
import Stripe from 'stripe';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import handler from '../api/stripe-webhook.js';

const SIGNING_SECRET = 'whsec_unit_test_secret';
const PAYLOAD = JSON.stringify({
  id: 'evt_signature_test',
  object: 'event',
  type: 'customer.created',
  created: 1_800_000_000,
  data: { object: { id: 'cus_1' } },
});

function responseRecorder() {
  return {
    statusCode: null,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

function request(signature) {
  const req = Readable.from([Buffer.from(PAYLOAD)]);
  req.method = 'POST';
  req.headers = { 'stripe-signature': signature };
  return req;
}

describe('Stripe webhook handler', () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = 'sk_test_not_a_real_key';
    process.env.STRIPE_WEBHOOK_SECRET = SIGNING_SECRET;
  });

  afterEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('accepts a signature generated over the exact raw request bytes', async () => {
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload: PAYLOAD,
      secret: SIGNING_SECRET,
    });
    const res = responseRecorder();

    await handler(request(signature), res);

    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({
      received: true,
      handled: false,
      duplicate: false,
    });
  });

  it('rejects a request with an invalid signature', async () => {
    const res = responseRecorder();

    await handler(request('t=1800000000,v1=invalid'), res);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({ error: 'Invalid signature' });
  });
});
