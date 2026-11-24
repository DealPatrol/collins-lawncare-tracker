import { describe, expect, it } from 'vitest';
import { applyCors } from '../lib/cors.js';

function mockRes() {
  const res = { headers: {}, statusCode: null, ended: false };
  res.setHeader = (k, v) => { res.headers[k] = v; };
  res.status = (code) => { res.statusCode = code; return res; };
  res.end = () => { res.ended = true; return res; };
  return res;
}

describe('applyCors', () => {
  it('allows the Capacitor iOS origin and answers preflight', () => {
    const res = mockRes();
    const done = applyCors({ method: 'OPTIONS', headers: { origin: 'capacitor://localhost' } }, res, { env: {} });
    expect(done).toBe(true);
    expect(res.statusCode).toBe(204);
    expect(res.headers['Access-Control-Allow-Origin']).toBe('capacitor://localhost');
    expect(res.headers['Access-Control-Allow-Headers']).toContain('Authorization');
  });

  it('does not add CORS headers for unknown origins and lets POST continue', () => {
    const res = mockRes();
    const done = applyCors({ method: 'POST', headers: { origin: 'https://evil.example' } }, res, { env: {} });
    expect(done).toBe(false);
    expect(res.headers['Access-Control-Allow-Origin']).toBeUndefined();
  });

  it('supports extra origins from CORS_ALLOWED_ORIGINS', () => {
    const res = mockRes();
    applyCors({ method: 'POST', headers: { origin: 'https://staging.example' } }, res, { env: { CORS_ALLOWED_ORIGINS: 'https://staging.example' } });
    expect(res.headers['Access-Control-Allow-Origin']).toBe('https://staging.example');
  });
});
