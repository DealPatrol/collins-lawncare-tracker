import { describe, expect, it } from 'vitest';
import { BRAND } from '../src/brand.js';
import {
  canAddCrewProfile, canShareCrewInvite, describePlans, hasProEntitlement, isProGatingActive, PRO_PRODUCT_IDS,
} from '../src/proPolicy.js';

describe('TurfRoute Pro policy', () => {
  it('never gates the web app', () => {
    expect(isProGatingActive({ nativeIos: false, enabled: true })).toBe(false);
    expect(canAddCrewProfile({ crewCount: 10, isPro: false, gatingActive: false })).toBe(true);
    expect(canShareCrewInvite({ isPro: false, gatingActive: false })).toBe(true);
  });

  it('gates extra crew profiles and invites on native iOS without Pro', () => {
    const gatingActive = isProGatingActive({ nativeIos: true, enabled: true });
    expect(gatingActive).toBe(true);
    expect(canAddCrewProfile({ crewCount: 0, isPro: false, gatingActive })).toBe(true); // first profile is free
    expect(canAddCrewProfile({ crewCount: BRAND.pro.freeCrewProfiles, isPro: false, gatingActive })).toBe(false);
    expect(canShareCrewInvite({ isPro: false, gatingActive })).toBe(false);
  });

  it('unlocks everything with an active Pro entitlement', () => {
    expect(hasProEntitlement(['com.other.app.thing'])).toBe(false);
    expect(hasProEntitlement([BRAND.pro.products.yearly])).toBe(true);
    expect(canAddCrewProfile({ crewCount: 25, isPro: true, gatingActive: true })).toBe(true);
    expect(canShareCrewInvite({ isPro: true, gatingActive: true })).toBe(true);
  });

  it('uses the required App Store product IDs', () => {
    expect(PRO_PRODUCT_IDS).toEqual(['com.colecollins.turfroute.pro.monthly', 'com.colecollins.turfroute.pro.yearly']);
  });

  it('prefers StoreKit localized prices and falls back otherwise', () => {
    const plans = describePlans([{ id: BRAND.pro.products.monthly, displayPrice: '€10,99', displayName: 'Pro Monthly' }]);
    expect(plans.map((p) => p.plan)).toEqual(['yearly', 'monthly']);
    expect(plans.find((p) => p.plan === 'monthly')).toMatchObject({ displayPrice: '€10,99', available: true });
    expect(plans.find((p) => p.plan === 'yearly')).toMatchObject({ displayPrice: BRAND.pro.fallbackPrices.yearly, available: false });
  });
});
