import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND } from '../src/brand.js';
import { buildLetterMessage, buildSmsMessage } from '../src/prospecting.js';
import { buildUpsellLetter, buildUpsellSms } from '../src/seasonal.js';
import { buildCompletionMessage } from '../src/notify.js';
import { DEFAULT_SETTINGS } from '../src/store.js';
import { businessName } from '../lib/business.js';

const root = join(import.meta.dirname, '..');

function walk(dir) {
  return readdirSync(dir).flatMap((name) => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? walk(p) : [p];
  });
}

describe('brand', () => {
  it('is TurfRoute with the App Store identifiers', () => {
    expect(BRAND.name).toBe('TurfRoute');
    expect(BRAND.bundleId).toBe('com.colecollins.turfroute');
    expect(BRAND.urlScheme).toBe('turfroute');
    expect(BRAND.subtitle.length).toBeLessThanOrEqual(30);
  });

  it('has no hard-coded "Collins Lawn…" strings in user-facing source', () => {
    const files = [...walk(join(root, 'src')), ...walk(join(root, 'api')), join(root, 'index.html')]
      .filter((f) => /\.(jsx?|html|css)$/.test(f));
    const offenders = files.filter((f) => /Collins Lawn/i.test(readFileSync(f, 'utf8')));
    expect(offenders).toEqual([]);
  });

  it('writes customer messages with the business name from Settings', () => {
    const ctx = { owner: 'Pat', address: '1 Main St', yardCount: 3, senderName: 'Alex Rivera', bizPhone: '', bizName: 'Green Acres', bizCity: 'Cullman, AL' };
    expect(buildSmsMessage(ctx)).toContain('with Green Acres.');
    expect(buildLetterMessage(ctx)).toMatch(/Alex Rivera\nGreen Acres · Cullman, AL$/);
    const campaign = { pitch: 'aeration' };
    expect(buildUpsellSms(campaign, { senderName: 'Alex', bizName: 'Green Acres' })).toContain('with Green Acres here');
    expect(buildUpsellLetter(campaign, { senderName: 'Alex', bizName: 'Green Acres' })).toMatch(/Alex\nGreen Acres$/);
  });

  it('falls back to a generic label when no business name is set', () => {
    const ctx = { yardCount: 1, senderName: 'Sam' };
    expect(buildSmsMessage(ctx)).toContain(`with ${BRAND.defaultBusinessLabel}.`);
    expect(buildLetterMessage(ctx)).toMatch(/Sam$/);
  });

  it('fills {business} in the job-done template', () => {
    expect(buildCompletionMessage(DEFAULT_SETTINGS.notifyMessageTemplate, { customer: 'Pat', crew: 'Sam', job: 'Oak St', business: 'Green Acres' }))
      .toBe('Hey Pat, Sam from Green Acres just finished up at Oak St. Thanks for choosing us!');
  });

  it('uses BUSINESS_NAME for server emails, defaulting to the brand', () => {
    expect(businessName({ BUSINESS_NAME: 'Collins Lawncare' })).toBe('Collins Lawncare');
    expect(businessName({})).toBe('TurfRoute');
  });
});
