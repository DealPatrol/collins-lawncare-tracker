import { BRAND } from "./brand.js";

// Tabs a turfroute:// link may open. Anything else is ignored, so a crafted
// link can never trigger an action (start timers, delete data, etc.).
export const DEEP_LINK_TABS = ["today", "jobs", "route", "crew", "settings"];

/**
 * turfroute://route, turfroute://tab/crew, turfroute:///settings → { tab }.
 * Returns null for other schemes or unknown targets.
 */
export function parseDeepLink(rawUrl, scheme = BRAND.urlScheme) {
  if (typeof rawUrl !== "string") return null;
  const prefix = `${scheme}:`;
  if (!rawUrl.toLowerCase().startsWith(prefix)) return null;
  const rest = rawUrl.slice(prefix.length).replace(/^\/+/, "").split(/[?#]/)[0];
  const parts = rest.split("/").filter(Boolean).map((p) => p.toLowerCase());
  const target = parts[0] === "tab" ? parts[1] : parts[0];
  if (!target) return { tab: "today" };
  if (target === "pro") return { tab: "settings", pro: true };
  return DEEP_LINK_TABS.includes(target) ? { tab: target } : null;
}
