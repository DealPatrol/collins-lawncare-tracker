import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signPortalToken, verifyPortalToken } from '../lib/portal-token.js';

const SECRET = 'a-secure-test-secret-that-is-at-least-32-bytes';

describe('portal tokens', () => {
  beforeEach(() => {
    process.env.PORTAL_TOKEN_SECRET = SECRET;
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-27T00:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    delete process.env.PORTAL_TOKEN_SECRET;
  });

  it('accepts an untampered token with expected claims', () => {
    const token = signPortalToken({
      userId: 'user-1',
      jobId: 'job-1',
      customerEmail: 'customer@example.com',
    });

    expect(verifyPortalToken(token)).toMatchObject({
      version: 1,
      userId: 'user-1',
      jobId: 'job-1',
      customerEmail: 'customer@example.com',
    });
  });

  it('rejects payload and signature tampering', () => {
    const token = signPortalToken({ userId: 'user-1', jobId: 'job-1' });
    const [body, signature] = token.split('.');
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
    payload.jobId = 'job-2';
    const tamperedBody = Buffer.from(JSON.stringify(payload)).toString('base64url');

    expect(verifyPortalToken(`${tamperedBody}.${signature}`)).toBeNull();
    expect(verifyPortalToken(`${body}.${signature.slice(0, -1)}x`)).toBeNull();
    expect(verifyPortalToken(`${token}.extra`)).toBeNull();
  });

  it('expires exactly seven days after issuance', () => {
    const token = signPortalToken({ userId: 'user-1', jobId: 'job-1' });
    vi.advanceTimersByTime(7 * 24 * 60 * 60 * 1000);

    expect(verifyPortalToken(token)).toBeNull();
  });

  it('refuses to sign or verify with a weak secret', () => {
    process.env.PORTAL_TOKEN_SECRET = 'too-short';

    expect(() => signPortalToken({ userId: 'user-1', jobId: 'job-1' }))
      .toThrow(/at least 32 bytes/);
    expect(verifyPortalToken('body.signature')).toBeNull();
  });
});
