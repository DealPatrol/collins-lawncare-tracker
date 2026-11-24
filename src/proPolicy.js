// Pure TurfRoute Pro rules (no Capacitor imports) so they are unit-testable.
import { BRAND } from "./brand.js";

export const PRO_PRODUCT_IDS = Object.freeze([BRAND.pro.products.monthly, BRAND.pro.products.yearly]);

/**
 * Pro is only ever enforced inside the native iOS app (App Store Guideline
 * 3.1.1 — digital features sold in-app must use In-App Purchase). The web app
 * is never gated and never shows a paywall.
 */
export function isProGatingActive({ nativeIos, enabled = BRAND.pro.iosGatingEnabled } = {}) {
  return Boolean(nativeIos && enabled);
}

/** True if any active StoreKit entitlement is a TurfRoute Pro product. */
export function hasProEntitlement(productIds = []) {
  return productIds.some((id) => PRO_PRODUCT_IDS.includes(id));
}

/** Can this device add another crew profile? */
export function canAddCrewProfile({ crewCount, isPro, gatingActive, freeLimit = BRAND.pro.freeCrewProfiles }) {
  if (!gatingActive || isPro) return true;
  return crewCount < freeLimit;
}

/** Can this device generate/share a crew invite code? (Joining is always free.) */
export function canShareCrewInvite({ isPro, gatingActive }) {
  return !gatingActive || isPro;
}

/** Order + label products for the paywall, with fallback prices. */
export function describePlans(products = []) {
  const byId = Object.fromEntries(products.map((p) => [p.id, p]));
  return [
    { plan: "yearly", id: BRAND.pro.products.yearly, period: "year", label: "Yearly" },
    { plan: "monthly", id: BRAND.pro.products.monthly, period: "month", label: "Monthly" },
  ].map((p) => ({
    ...p,
    available: Boolean(byId[p.id]),
    displayPrice: byId[p.id]?.displayPrice || BRAND.pro.fallbackPrices[p.plan],
    displayName: byId[p.id]?.displayName || `${BRAND.pro.name} ${p.label}`,
  }));
}
